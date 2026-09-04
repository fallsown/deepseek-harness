---
description: "Credit Pass context-assembly plugin: 将驱动端按会话下发的结构化 run context 渲染为 system-prompt 分节。"
kind: "package-reference"
---

# @deepseek-ai/dsh-credit-context-assembly

## Summary

`@deepseek-ai/dsh-credit-context-assembly` is a Credit Pass fork plugin: it reads the structured per-session run context (`runContext`) that the driving application delivers on `session/prompt`, exposes it through the `sdkRunContext` service provided by `@deepseek-ai/dsh-sdk-jsonrpc-server`, and renders it as one per-session system-prompt section placed after the deployment persona. Sessions without a run context render nothing.

## Known Limitations and Deferred Work

- The run context is intentionally not appended as a session event: the authoritative audit record lives in the driving application's run store (Credit Pass `agent_runtime` PostgreSQL), not in the Harness session log. Accepted deviation from the model-visible/logged rule, tracked in the Credit Pass coding-plan.
- Session-level dynamic tool policy and dynamic MCP attachment are deferred to later stage-2 slices.

## Model Experience

- Token effect: the section adds only the delivered run-context text (bounded by the driving application's composer budget) to sessions that carry one; other sessions are unaffected.
- KV-cache effect: the section is per-session and stable across turns of the same run, so it prefixes the prompt cache identically turn over turn.
- Model-visible content: scope header plus the delivered sections verbatim; the plugin never invents content.
