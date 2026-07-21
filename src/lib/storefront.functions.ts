import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

// ---------- Public: shipping zones ----------
export interface ShippingZone {
  id: string
  code: string
  name_ar: string
  name_en: string | null
  regions: string[]
  fee: number
  currency: string
  estimated_days: string | null
  sort_order: number
}

export const listShippingZones = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ShippingZone[]> => {
    const { getPublicSupabase } = await import('./supabase-public.server')
    const supabase = getPublicSupabase()
    const { data, error } = await supabase
      .from('shipping_zones')
      .select('id, code, name_ar, name_en, regions, fee, currency, estimated_days, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (error) {
      console.error('[listShippingZones]', error)
      return []
    }
    return (data ?? []) as unknown as ShippingZone[]
  },
)

// ---------- Public: payment methods ----------
export interface PaymentMethod {
  id: string
  code: string
  name_ar: string
  name_en: string | null
  description_ar: string | null
  instructions_ar: string | null
  requires_receipt: boolean
  sort_order: number
}

export const listPaymentMethods = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PaymentMethod[]> => {
    const { getPublicSupabase } = await import('./supabase-public.server')
    const supabase = getPublicSupabase()
    const { data, error } = await supabase
      .from('payment_methods')
      .select('id, code, name_ar, name_en, description_ar, instructions_ar, requires_receipt, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (error) {
      console.error('[listPaymentMethods]', error)
      return []
    }
    return (data ?? []) as unknown as PaymentMethod[]
  },
)

// ---------- Public: signed product image URLs ----------
// Uses the admin client server-side only to generate signed URLs for approved
// media on a public product. No privileged data is returned.
export const listProductImageUrls = createServerFn({ method: 'GET' })
  .inputValidator((raw: unknown) =>
    z.object({ productId: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }): Promise<{ url: string; alt: string | null; kind: string }[]> => {
    const { getPublicSupabase } = await import('./supabase-public.server')
    const supabase = getPublicSupabase()
    // Confirm product is publicly listed.
    const { data: p } = await supabase
      .from('catalog_products')
      .select('id')
      .eq('id', data.productId)
      .eq('is_public', true)
      .eq('status', 'approved')
      .maybeSingle()
    if (!p) return []

    const { data: media } = await supabase
      .from('catalog_product_media')
      .select('storage_bucket, storage_path, kind, alt_text, sort_order, status')
      .eq('product_id', data.productId)
      .eq('status', 'approved')
      .order('sort_order', { ascending: true })

    const rows = (media ?? []) as Array<{
      storage_bucket: string
      storage_path: string
      kind: string
      alt_text: string | null
    }>
    if (rows.length === 0) return []

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const out: { url: string; alt: string | null; kind: string }[] = []
    for (const m of rows) {
      const bucket = m.storage_bucket || 'product-images'
      const { data: signed } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(m.storage_path, 60 * 60 * 24) // 24h
      if (signed?.signedUrl) {
        out.push({ url: signed.signedUrl, alt: m.alt_text, kind: m.kind })
      }
    }
    return out
  })

// ---------- Authenticated: place order ----------
const placeOrderInput = z.object({
  shippingZoneId: z.string().uuid(),
  paymentMethodCode: z.string().min(2).max(40),
  customerName: z.string().min(2).max(120),
  phone: z.string().min(6).max(30),
  address: z.string().min(4).max(500),
  notes: z.string().max(1000).optional().nullable(),
})

export interface PlacedOrder {
  id: string
  total: number
  requires_receipt: boolean
  payment_method_code: string
}

function generateOrderId(): string {
  const d = new Date()
  const yyyymmdd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `ORD-${yyyymmdd}-${rand}`
}

export const placeOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => placeOrderInput.parse(raw))
  .handler(async ({ data, context }): Promise<PlacedOrder> => {
    const { supabase, userId } = context

    // Load cart with prices.
    const { data: cart, error: cartErr } = await supabase
      .from('cart_items')
      .select(
        'id, product_id, quantity, product:catalog_products(id, name_ar, brand, strength, sbdma_official_price, requires_prescription, status, is_public)',
      )
    if (cartErr) throw new Error(cartErr.message)
    const rows = (cart ?? []) as Array<{
      id: string
      product_id: string
      quantity: number
      product: {
        id: string
        name_ar: string
        brand: string | null
        strength: string | null
        sbdma_official_price: number | null
        requires_prescription: boolean
        status: string
        is_public: boolean
      } | null
    }>
    if (rows.length === 0) throw new Error('السلة فارغة')

    // Safety: block prescription items or unavailable products from checkout.
    const blocked = rows.find(
      (r) =>
        !r.product ||
        r.product.requires_prescription ||
        !r.product.is_public ||
        r.product.status !== 'approved',
    )
    if (blocked) {
      throw new Error(
        `لا يمكن إتمام الطلب لوجود منتج غير متاح: ${blocked.product?.name_ar ?? '—'}`,
      )
    }

    // Load shipping + payment method.
    const [{ data: zone }, { data: method }] = await Promise.all([
      supabase
        .from('shipping_zones')
        .select('id, fee, currency, name_ar, is_active')
        .eq('id', data.shippingZoneId)
        .maybeSingle(),
      supabase
        .from('payment_methods')
        .select('code, requires_receipt, is_active, name_ar')
        .eq('code', data.paymentMethodCode)
        .maybeSingle(),
    ])
    if (!zone || !(zone as { is_active: boolean }).is_active) {
      throw new Error('منطقة الشحن غير متاحة')
    }
    if (!method || !(method as { is_active: boolean }).is_active) {
      throw new Error('طريقة الدفع غير متاحة')
    }

    const itemsSnapshot = rows.map((r) => {
      const unit = Number(r.product?.sbdma_official_price ?? 0)
      return {
        product_id: r.product_id,
        name_ar: r.product?.name_ar ?? '—',
        brand: r.product?.brand ?? null,
        strength: r.product?.strength ?? null,
        quantity: r.quantity,
        unit_price: unit,
        line_total: Math.round(unit * r.quantity * 100) / 100,
      }
    })
    const subtotal = itemsSnapshot.reduce((s, i) => s + i.line_total, 0)
    const shippingFee = Number((zone as { fee: number }).fee) || 0
    const total = Math.round((subtotal + shippingFee) * 100) / 100
    const orderId = generateOrderId()
    const zoneName = (zone as { name_ar: string }).name_ar

    const { error: insErr } = await supabase.from('orders').insert({
      id: orderId,
      user_id: userId,
      customer_name: data.customerName,
      phone: data.phone,
      address: `${zoneName} — ${data.address}`,
      notes: data.notes ?? null,
      items: itemsSnapshot,
      subtotal,
      shipping_fee: shippingFee,
      total,
      status: 'pending',
      shipping_zone_id: data.shippingZoneId,
      payment_method_code: data.paymentMethodCode,
      payment_status:
        (method as { requires_receipt: boolean }).requires_receipt ? 'awaiting_receipt' : 'pending',
    })
    if (insErr) throw new Error(insErr.message)

    // Clear cart.
    await supabase.from('cart_items').delete().eq('user_id', userId)

    // Best-effort history entry.
    await supabase.from('order_status_history').insert({
      order_id: orderId,
      status: 'pending',
      changed_by: userId,
      note: 'تم إنشاء الطلب',
    })

    return {
      id: orderId,
      total,
      requires_receipt: (method as { requires_receipt: boolean }).requires_receipt,
      payment_method_code: data.paymentMethodCode,
    }
  })

// ---------- Authenticated: my orders ----------
export interface MyOrderRow {
  id: string
  status: string
  payment_status: string
  total: number
  subtotal: number | null
  shipping_fee: number | null
  payment_method_code: string | null
  payment_receipt_path: string | null
  customer_name: string | null
  phone: string | null
  address: string | null
  notes: string | null
  items: Array<{
    product_id: string
    name_ar: string
    brand: string | null
    strength: string | null
    quantity: number
    unit_price: number
    line_total: number
  }>
  created_at: string
  updated_at: string | null
}

export const listMyOrders = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyOrderRow[]> => {
    const { data, error } = await context.supabase
      .from('orders')
      .select(
        'id, status, payment_status, total, subtotal, shipping_fee, payment_method_code, payment_receipt_path, customer_name, phone, address, notes, items, created_at, updated_at',
      )
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw new Error(error.message)
    return (data ?? []) as unknown as MyOrderRow[]
  })

export const getMyOrder = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().min(4) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from('orders')
      .select(
        'id, status, payment_status, total, subtotal, shipping_fee, payment_method_code, payment_receipt_path, customer_name, phone, address, notes, items, created_at, updated_at, user_id',
      )
      .eq('id', data.id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!order || (order as { user_id: string }).user_id !== context.userId) {
      return null
    }
    const { data: history } = await context.supabase
      .from('order_status_history')
      .select('id, status, note, changed_at')
      .eq('order_id', data.id)
      .order('changed_at', { ascending: true })
    return { order: order as unknown as MyOrderRow, history: history ?? [] }
  })

// ---------- Authenticated: attach payment receipt path ----------
export const setOrderReceipt = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ orderId: z.string().min(4), receiptPath: z.string().min(4) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    // RLS on `orders` scopes update to staff, so verify ownership then use admin only for the write.
    const { data: order } = await context.supabase
      .from('orders')
      .select('id, user_id')
      .eq('id', data.orderId)
      .maybeSingle()
    if (!order || (order as { user_id: string }).user_id !== context.userId) {
      throw new Error('لا يمكن تعديل هذا الطلب')
    }
    // Receipt path must live inside the user's folder.
    if (!data.receiptPath.startsWith(`${context.userId}/`)) {
      throw new Error('مسار الإيصال غير صالح')
    }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ payment_receipt_path: data.receiptPath, payment_status: 'submitted' })
      .eq('id', data.orderId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })
