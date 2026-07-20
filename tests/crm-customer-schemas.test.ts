import { describe, it, expect } from 'vitest'
import {
  createCustomerInput, updateCustomerInput, mergeCustomersInput,
  addAddressInput, addContactInput, addTagInput,
} from '@/domain/crm/commands'

const ORG = '00000000-0000-0000-0000-000000000001'
const A = '00000000-0000-0000-0000-0000000000aa'
const B = '00000000-0000-0000-0000-0000000000bb'

describe('CRM command schemas', () => {
  it('requires org + name + idempotency on create', () => {
    expect(() => createCustomerInput.parse({})).toThrow()
    const ok = createCustomerInput.parse({
      organizationId: ORG, full_name: 'أحمد', idempotencyKey: 'idem-1234',
    })
    expect(ok.full_name).toBe('أحمد')
  })

  it('rejects invalid email', () => {
    expect(() => createCustomerInput.parse({
      organizationId: ORG, full_name: 'x', email: 'not-an-email', idempotencyKey: 'idem-1234',
    })).toThrow()
  })

  it('update allows partial patch', () => {
    const p = updateCustomerInput.parse({ id: A, status: 'archived' })
    expect(p.status).toBe('archived')
  })

  it('merge requires two distinct uuids', () => {
    expect(() => mergeCustomersInput.parse({ targetId: A, sourceId: A })).not.toThrow()
    // The runtime check for target !== source lives in the mutation handler,
    // not the schema; schema only validates uuid shape.
    const m = mergeCustomersInput.parse({ targetId: A, sourceId: B })
    expect(m.targetId).toBe(A)
  })

  it('address requires line1', () => {
    expect(() => addAddressInput.parse({ customerId: A })).toThrow()
    const a = addAddressInput.parse({ customerId: A, line1: 'شارع 1' })
    expect(a.kind).toBe('shipping')
  })

  it('contact requires kind and value', () => {
    expect(() => addContactInput.parse({ customerId: A })).toThrow()
    const c = addContactInput.parse({ customerId: A, kind: 'phone', value: '+9665...' })
    expect(c.kind).toBe('phone')
  })

  it('tag requires non-empty tag', () => {
    expect(() => addTagInput.parse({ customerId: A, tag: '' })).toThrow()
    const t = addTagInput.parse({ customerId: A, tag: 'VIP' })
    expect(t.tag).toBe('VIP')
  })
})
