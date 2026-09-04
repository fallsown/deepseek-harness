/**
 * Credit Pass context-assembly plugin. Renders the structured per-session run
 * context delivered on `session/prompt` (`runContext`) into a per-session
 * system-prompt section named `credit:run-context`, placed directly after the
 * deployment persona. The driving application owns composition, ordering, and
 * audit persistence; this plugin only renders what the `sdkRunContext`
 * service holds for the assembling session and renders nothing for sessions
 * without a run context.
 * @module @deepseek-ai/dsh-credit-context-assembly
 */

import type { Context } from '@deepseek-ai/cordis'
import type { RunContextPayload } from '@deepseek-ai/dsh-sdk-protocol'

export const name = 'credit-context-assembly'

export const inject = ['systemPrompt', 'sdkRunContext']

/** Plugin config; the current slice has no tunables. */
export interface Config {}

/** Narrow local face of the `sdkRunContext` service provided by the SDK server. */
export interface RunContextService {
  forAgentSession(session: { readonly id: string }): RunContextPayload | undefined
}

interface SystemPromptService {
  getSectionOrder(name: string): number
  section(section: {
    name: string
    order: number
    text: (context: { agent?: { session: { readonly id: string } } }) => string
  }): void
}

/**
 * Render one run context as model-facing section text: a scope header plus
 * each delivered section in array order.
 * @param runContext - structured context recorded for the assembling session.
 * @returns the rendered section text, never empty for a well-formed payload.
 */
export function renderRunContext(runContext: RunContextPayload): string {
  const scope =
    `merchant=${runContext.merchantId} customer=${runContext.customerId ?? 'none'} ` +
    `profile=${runContext.agentProfileKey}`
  const sections = runContext.sections
    .map(section => `## ${section.name}\n${section.text}`)
    .join('\n\n')
  return `Run context (${scope}):\n\n${sections}`
}

/**
 * Register the per-session run-context section.
 * @param ctx - plugin context; `systemPrompt` and `sdkRunContext` are declared in `inject`.
 * @param _config - unused; the slice has no tunables.
 */
export function apply(ctx: Context, _config: Config = {}): void {
  const systemPrompt = (ctx as Context & { systemPrompt: SystemPromptService }).systemPrompt
  const runContextService = (ctx as Context & { sdkRunContext: RunContextService }).sdkRunContext
  systemPrompt.section({
    name: 'credit:run-context',
    order: systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA') + 1,
    text: (context) => {
      if (context.agent === undefined) return ''
      const runContext = runContextService.forAgentSession(context.agent.session)
      if (runContext === undefined) return ''
      return renderRunContext(runContext)
    },
  })
}
