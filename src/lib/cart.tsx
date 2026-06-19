import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getProductById, type Product } from "./products";
import { generateOrderId, persistAndCommit, type PendingOrder } from "./orders-pending";


type CartItem = { id: number; qty: number };
type StoredOrder = {
  id: string;
  createdAt: number;
  status: "pending" | "confirmed" | "shipped" | "delivered";
  items: { id: number; qty: number; name: string; price: number }[];
  total: number;
  customer: { name: string; phone: string; address: string; notes?: string };
};

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  add: (id: number, qty?: number) => void;
  remove: (id: number) => void;
  setQty: (id: number, qty: number) => void;
  clear: () => void;
  detailed: { product: Product; qty: number }[];
  orders: StoredOrder[];
  placeOrder: (customer: StoredOrder["customer"], opts?: { discountCode?: string | null; discountAmount?: number }) => Promise<StoredOrder>;
  findOrder: (id: string) => StoredOrder | undefined;
};

const Ctx = createContext<CartCtx | null>(null);
const CART_KEY = "almusalli_cart_v1";
const ORDERS_KEY = "almusalli_orders_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<StoredOrder[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const c = localStorage.getItem(CART_KEY);
      if (c) setItems(JSON.parse(c));
      const o = localStorage.getItem(ORDERS_KEY);
      if (o) setOrders(JSON.parse(o));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }, [orders]);

  const add = useCallback((id: number, qty = 1) => {
    setItems((prev) => {
      const ex = prev.find((i) => i.id === id);
      if (ex) return prev.map((i) => (i.id === id ? { ...i, qty: i.qty + qty } : i));
      return [...prev, { id, qty }];
    });
  }, []);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const setQty = useCallback((id: number, qty: number) => {
    if (qty <= 0) return remove(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  }, [remove]);

  const clear = useCallback(() => setItems([]), []);

  const detailed = useMemo(
    () =>
      items
        .map((i) => {
          const p = getProductById(i.id);
          return p ? { product: p, qty: i.qty } : null;
        })
        .filter((x): x is { product: Product; qty: number } => x !== null),
    [items],
  );

  const total = useMemo(() => detailed.reduce((s, x) => s + x.product.price * x.qty, 0), [detailed]);
  const count = useMemo(() => items.reduce((s, x) => s + x.qty, 0), [items]);

  const placeOrder = useCallback<CartCtx["placeOrder"]>(
    async (customer, opts) => {
      const id = generateOrderId();
      const orderItems = detailed.map((d) => ({ id: d.product.id, qty: d.qty, name: d.product.name, price: d.product.price }));
      const discountAmount = Math.max(0, Number(opts?.discountAmount) || 0);
      const optimisticTotal = Math.max(0, total - discountAmount);
      const order: StoredOrder = {
        id,
        createdAt: Date.now(),
        status: "pending",
        items: orderItems,
        total: optimisticTotal,
        customer,
      };

      const pending: PendingOrder = {
        id, customer, items: orderItems, total: optimisticTotal,
        discountCode: opts?.discountCode ?? null,
        createdAt: order.createdAt, attempts: 0, stage: "queued",
      };
      await persistAndCommit(pending);

      setOrders((prev) => [order, ...prev]);
      setItems([]);
      return order;
    },
    [detailed, total],
  );



  const findOrder = useCallback((id: string) => orders.find((o) => o.id.toLowerCase() === id.toLowerCase()), [orders]);

  const value: CartCtx = { items, count, total, add, remove, setQty, clear, detailed, orders, placeOrder, findOrder };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}

export type { StoredOrder };
