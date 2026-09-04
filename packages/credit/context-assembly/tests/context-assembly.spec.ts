import { describe, expect, test } from 'vitest'
import { type RunContextService, apply, renderRunContext } from '@deepseek-ai/dsh-credit-context-assembly'

const payload = {
  merchantId: 'merchant-nail-001',
  customerId: 'customer-001',
  agentProfileKey: 'nail-salon-assistant',
  sections: [
    { name: 'instructions', text: 'Answer only with tool facts.' },
    { name: 'memory', text: '- [preference] Prefers afternoons.' },
  ],
}

describe('renderRunContext', () => {
  test('renders scope header and ordered sections', () => {
    const text = renderRunContext(payload)
    expect(text).toContain('merchant=merchant-nail-001 customer=customer-001')
    expect(text).toContain('## instructions')
    expect(text).toContain('Answer only with tool facts.')
    expect(text).toContain('## memory')
    expect(text.indexOf('## instructions')).toBeLessThan(text.indexOf('## memory'))
  })

  test('renders none for a missing customer id', () => {
    const text = renderRunContext({ ...payload, customerId: null })
    expect(text).toContain('customer=none')
  })
})

describe('apply', () => {
  function makeCtx(runContext: (typeof payload) | undefined) {
    const service: RunContextService = {
      forAgentSession: session => (session.id === 's1' ? runContext : undefined),
    }
    const registered: {
      name: string
      order: number
      text: (context: { agent?: { session: { readonly id: string } } }) => string
    }[] = []
    const ctx = {
      systemPrompt: {
        getSectionOrder: (name: string) => (name === 'DEPLOYMENT_PERSONA' ? 10 : 0),
        section: (section: {
          name: string
          order: number
          text: (context: { agent?: { session: { readonly id: string } } }) => string
        }) => {
          registered.push(section)
        },
      },
      sdkRunContext: service,
    }
    apply(ctx as never, {})
    return { registered, ctx }
  }

  test('registers one section right after the deployment persona', () => {
    const { registered, ctx } = makeCtx(undefined)
    expect(registered).toHaveLength(1)
    const section = registered[0]!
    expect(section.name).toBe('credit:run-context')
    expect(section.order).toBe(11)
    expect(section.text({})).toBe('')
    expect(section.text({ agent: { session: { id: 'other' } } })).toBe('')
    expect(ctx).toBeDefined()
  })

  test('renders the recorded run context for the assembling session', () => {
    const { registered } = makeCtx(payload)
    const text = registered[0]!.text({ agent: { session: { id: 's1' } } })
    expect(text).toContain('merchant=merchant-nail-001')
    expect(text).toContain('## instructions')
  })
})
