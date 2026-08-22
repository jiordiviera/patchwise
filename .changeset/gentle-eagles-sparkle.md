---
"patchwise": major
---

Add Gemini as the default AI provider, with Groq as an optional fallback.

- **Breaking:** Gemini is now the default provider (`gemini-2.5-flash`); Groq remains fully supported but is no longer selected by default
- **Breaking:** `AppConfig.groqApiKey` is replaced by `apiKeys: { gemini?, groq? }`. Existing user configs are migrated automatically at load time (with a one-time deprecation notice); a `groqApiKey` found in a project's `patchwise.config.json` is ignored, since API keys are no longer allowed there — only in the user-level config or `GEMINI_API_KEY` / `GROQ_API_KEY` env vars
- Add a real multi-provider fallback: configure `fallbackProvider` and Patchwise automatically retries with it if the primary provider is rate-limited, unreachable, or temporarily down (auth failures and oversized requests don't trigger a retry)
- Rewrite `patchwise setup`: choose a primary provider, configure an optional fallback (with its own key prompt), and set an emoji preference, with a summary screen before anything is saved. Model-fetch failures now show the actual error instead of silently falling back to manual entry
- Replace the provider `if/else` with an extensible registry so adding a provider is a matter of one new entry
