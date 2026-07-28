// Complete, robust, fully functional mock client for Supabase to support
// local-only interactive prototyping of the entire MUSLLY AI OS ecosystem.
import type { Database } from './types'

// Simple mock JWT signing helper (decodable as regular claims on the other side)
function signMockJwt(user: any) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    claims: {
      sub: user.id,
      role: user.role,
      email: user.email,
    }
  }))
  return `${header}.${payload}.signature`
}

// In-memory global database store containing tables & seed data.
const _store: Record<string, any[]> = {
  profiles: [
    {
      id: 'admin-id-1111-2222',
      email: 'admin@mussly.ai',
      name: 'مدير النظام',
      name_ar: 'مدير النظام',
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  branches: [
    {
      id: 'b1111111-1111-1111-1111-111111111111',
      name: 'Main Branch',
      name_ar: 'الفرع الرئيسي',
      governorate: 'عدن',
      city: 'خور مكسر',
      address: 'شارع المعلا، مقابل مستشفى الجمهورية',
      phone: '+967-777-000-000',
      is_main: true,
      created_at: new Date().toISOString()
    }
  ],
  products: [
    {
      id: 'p1111111-1111-1111-1111-111111111111',
      name: 'Panadol Extra',
      name_ar: 'بانادول إكسترا',
      description: 'مسكن للألم وخافض للحرارة',
      category: 'مسكنات',
      price: 1500.00,
      cost: 900.00,
      stock: 500,
      min_stock: 50,
      barcode: '622300000001',
      manufacturer: 'GSK',
      country: 'UK',
      active_ingredient: 'Paracetamol + Caffeine',
      dosage: '500mg + 65mg',
      prescription_required: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'p2222222-2222-2222-2222-222222222222',
      name: 'Amoxicillin 500mg',
      name_ar: 'أموكسيسيلين 500 مجم',
      description: 'مضاد حيوي واسع الطيف',
      category: 'مضادات حيوية',
      price: 2500.00,
      cost: 1500.00,
      stock: 200,
      min_stock: 30,
      barcode: '622300000002',
      manufacturer: 'Sandoz',
      country: 'Austria',
      active_ingredient: 'Amoxicillin',
      dosage: '500mg',
      prescription_required: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'p3333333-3333-3333-3333-333333333333',
      name: 'Omeprazole 20mg',
      name_ar: 'أوميبرازول 20 مجم',
      description: 'مثبط لمضخة البروتون',
      category: 'مضادات حموضة',
      price: 1800.00,
      cost: 1100.00,
      stock: 350,
      min_stock: 40,
      barcode: '622300000003',
      manufacturer: 'AstraZeneca',
      country: 'Sweden',
      active_ingredient: 'Omeprazole',
      dosage: '20mg',
      prescription_required: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  doctors: [
    {
      id: 'd1111111-1111-1111-1111-111111111111',
      name: 'Dr. Ahmed Al-Masry',
      name_ar: 'د. أحمد المصري',
      specialty: 'باطنية',
      license_number: 'YEM-DR-001',
      email: 'ahmed@doctor.ye',
      phone: '+967-777-111-111',
      bio: 'أخصائي أمراض باطنية بخبرة 15 سنة',
      is_verified: true,
      rating: 4.8,
      created_at: new Date().toISOString()
    }
  ],
  hospitals: [
    {
      id: 'h1111111-1111-1111-1111-111111111111',
      name: 'Al-Jumhuriya Hospital',
      name_ar: 'مستشفى الجمهورية',
      type: 'public',
      address: 'خور مكسر، عدن',
      phone: '+967-777-444-444',
      beds: 200,
      icu_beds: 20,
      operating_rooms: 8,
      emergency: true,
      ambulance_count: 5,
      is_active: true,
      created_at: new Date().toISOString()
    }
  ],
  orders: [],
  prescriptions: [],
  inventory: [],
  warehouses: [],
  deliveries: [],
  suppliers: [],
  financial_transactions: [],
  campaigns: [],
  ai_memory: [],
  ai_events: [],
  notifications: [],
  knowledge_nodes: [],
  knowledge_relationships: [],
  medical_records: [],
  appointments: []
}

// Current logged in user (in-memory persistent state)
let _currentUser: any = null

class MockQueryBuilder {
  private _table: string
  private _filters: Array<(item: any) => boolean> = []
  private _orderCol: string | null = null
  private _orderDesc: boolean = false
  private _limitVal: number | null = null
  private _single: boolean = false
  private _maybeSingle: boolean = false

  constructor(table: string) {
    this._table = table
  }

  select(columns = '*') {
    return this
  }

  eq(col: string, val: any) {
    this._filters.push((item) => {
      // Normalizing nested objects if accessed as strings
      if (col.includes('->>')) {
        return true // permissive mock filter for complex json lookups
      }
      return item[col] === val
    })
    return this
  }

  neq(col: string, val: any) {
    this._filters.push((item) => item[col] !== val)
    return this
  }

  gt(col: string, val: any) {
    this._filters.push((item) => item[col] > val)
    return this
  }

  lt(col: string, val: any) {
    this._filters.push((item) => item[col] < val)
    return this
  }

  gte(col: string, val: any) {
    this._filters.push((item) => item[col] >= val)
    return this
  }

  lte(col: string, val: any) {
    this._filters.push((item) => item[col] <= val)
    return this
  }

  like(col: string, pattern: string) {
    const reg = new RegExp(pattern.replace(/%/g, '.*'), 'i')
    this._filters.push((item) => reg.test(item[col] || ''))
    return this
  }

  ilike(col: string, pattern: string) {
    return this.like(col, pattern)
  }

  in(col: string, vals: any[]) {
    this._filters.push((item) => vals.includes(item[col]))
    return this
  }

  order(col: string, { ascending = true } = {}) {
    this._orderCol = col
    this._orderDesc = !ascending
    return this
  }

  limit(val: number) {
    this._limitVal = val
    return this
  }

  single() {
    this._single = true
    return this as any
  }

  maybeSingle() {
    this._maybeSingle = true
    return this as any
  }

  private _getRows() {
    let rows = _store[this._table] || []
    for (const f of this._filters) {
      rows = rows.filter(f)
    }
    if (this._orderCol) {
      const col = this._orderCol
      const desc = this._orderDesc
      rows = [...rows].sort((a, b) => {
        if (a[col] < b[col]) return desc ? 1 : -1
        if (a[col] > b[col]) return desc ? -1 : 1
        return 0
      })
    }
    if (this._limitVal !== null) {
      rows = rows.slice(0, this._limitVal)
    }
    return rows
  }

  // Promise resolution matching PostgREST response format
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
    const rows = this._getRows()
    let data: any = rows
    if (this._single) {
      data = rows[0] || null
    } else if (this._maybeSingle) {
      data = rows[0] || null
    }

    const res = { data, error: null, count: rows.length }
    return Promise.resolve(res).then(onfulfilled, onrejected)
  }

  async insert(rowOrRows: any) {
    const tableRows = _store[this._table] || []
    const toInsert = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows]
    const created: any[] = []
    for (const r of toInsert) {
      const newRow = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...r
      }
      tableRows.push(newRow)
      created.push(newRow)
    }
    _store[this._table] = tableRows
    return { data: Array.isArray(rowOrRows) ? created : created[0], error: null }
  }

  async update(patch: any) {
    const rows = this._getRows()
    for (const r of rows) {
      Object.assign(r, patch, { updated_at: new Date().toISOString() })
    }
    return { data: rows, error: null }
  }

  async delete() {
    const rows = this._getRows()
    const tableRows = _store[this._table] || []
    _store[this._table] = tableRows.filter((r) => !rows.includes(r))
    return { data: rows, error: null }
  }
}

export function createMockSupabaseClient() {
  const auth = {
    async signUp({ email, password, options }: any) {
      const existing = (_store.profiles || []).find((p) => p.email === email)
      if (existing) {
        return { data: null, error: { message: 'User already exists' } }
      }
      const newUser = {
        id: crypto.randomUUID(),
        email,
        name: email.split('@')[0],
        role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      _store.profiles.push(newUser)
      _currentUser = newUser
      const session = {
        access_token: signMockJwt(newUser),
        user: newUser,
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }
      return { data: { user: newUser, session }, error: null }
    },

    async signInWithPassword({ email, password }: any) {
      // Allow general admin bypass login, otherwise find existing profile
      let user = (_store.profiles || []).find((p) => p.email === email)
      if (!user && email === 'admin@mussly.ai') {
        user = {
          id: 'admin-id-1111-2222',
          email: 'admin@mussly.ai',
          name: 'مدير النظام',
          role: 'admin',
          is_active: true
        }
        _store.profiles.push(user)
      }

      if (!user) {
        return { data: null, error: { message: 'Invalid credentials' } }
      }

      _currentUser = user
      const session = {
        access_token: signMockJwt(user),
        user,
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }
      return { data: { user, session }, error: null }
    },

    async signOut() {
      _currentUser = null
      return { error: null }
    },

    async getSession() {
      if (!_currentUser) return { data: { session: null }, error: null }
      const session = {
        access_token: signMockJwt(_currentUser),
        user: _currentUser,
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }
      return { data: { session }, error: null }
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      const emit = () => {
        if (_currentUser) {
          callback('SIGNED_IN', {
            access_token: signMockJwt(_currentUser),
            user: _currentUser,
            expires_at: Math.floor(Date.now() / 1000) + 3600
          })
        } else {
          callback('SIGNED_OUT', null)
        }
      }
      emit()
      return {
        data: {
          subscription: {
            unsubscribe() {}
          }
        }
      }
    },

    async resetPasswordForEmail(email: string, options: any) {
      return { data: {}, error: null }
    },

    async getUser(token?: string) {
      if (_currentUser) {
        return { data: { user: _currentUser }, error: null }
      }
      // If token is provided, extract from token
      if (token && token.startsWith('eyJ')) {
        try {
          const parts = token.split('.')
          const payload = JSON.parse(atob(parts[1]))
          return { data: { user: payload.claims }, error: null }
        } catch {}
      }
      return { data: { user: null }, error: null }
    },

    async getClaims(token: string) {
      try {
        const parts = token.split('.')
        const payload = JSON.parse(atob(parts[1]))
        return { data: { claims: payload.claims }, error: null }
      } catch {
        return { data: null, error: { message: 'Invalid token' } }
      }
    }
  }

  const storage = {
    from(bucket: string) {
      return {
        async upload(path: string, file: any) {
          return { data: { path }, error: null }
        },
        async getPublicUrl(path: string) {
          return { data: { publicUrl: `https://mock.supabase.co/storage/v1/object/public/${bucket}/${path}` } }
        },
        async createSignedUrl(path: string, expires: number) {
          return { data: { signedUrl: `https://mock.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=mock` }, error: null }
        }
      }
    }
  }

  const rpc = (fn: string, args: any) => {
    // Basic mocks for standard database RPC procedures
    if (fn === 'has_role') {
      return Promise.resolve({ data: args._role === 'admin' || args._role === 'super_admin' })
    }
    return Promise.resolve({ data: true, error: null })
  }

  const client = {
    auth,
    storage,
    rpc,
    from(table: string) {
      return new MockQueryBuilder(table)
    }
  }

  return client as any
}

// Singleton instances matching standard generated Supabase exports
export const supabase = createMockSupabaseClient()
export const supabaseAdmin = supabase
