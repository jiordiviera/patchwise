# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Patchwise is a Node.js CLI (published to npm as `patchwise`) that reads a Git diff, sends it to an AI provider, and proposes Conventional Commits messages for the user to review, edit, and confirm before anything is committed or pushed. The user always stays in control — no command commits or pushes without explicit confirmation (or `--yes`).

## Commands

```bash
pnpm install           # install deps (pnpm 10.33.0, Node >= 20 required)
pnpm dev                # tsup --watch (build in watch mode)
pnpm build              # tsup build -> dist/patchwise.js (bin entry)
pnpm test               # vitest run (all tests, single pass)
pnpm test:watch         # vitest in watch mode
pnpm test:coverage      # vitest run --coverage (v8 provider)
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint
pnpm check               # prettier --write + eslint --fix
pnpm check:ci           # lint + typecheck (what CI runs, plus `pnpm test` separately)
```

Run a single test file: `pnpm vitest run test/config.test.ts`
Run tests matching a name: `pnpm vitest run -t "some test name"`

CI (`.github/workflows/ci.yml`) runs `lint` → `typecheck` → `test` on push/PR to `main`, then on `main` pushes runs Changesets to open a release PR or publish to npm via OIDC trusted publishing (no `NPM_TOKEN`).

Releases use [Changesets](https://github.com/changesets/changesets): `pnpm changeset` to record a change, `pnpm changeset version` (via CI) to bump versions, `pnpm release` to publish. Every user-facing PR should include a changeset.

## Architecture

```
src/bin/patchwise.ts      entry point, builds and runs the Commander program
src/cli/program.ts        command wiring (suggest/stage/commit/setup/config init), global preAction hook
src/cli/commands/         one handler per command (commit.ts, config.ts, stage.ts, suggest.ts)
src/cli/context.ts        CommandContext = { cwd, config } threaded through all commands
src/cli/services.ts       shared services wiring for commands (git client, AI provider, etc.)
src/core/git/client.ts    exec-based git operations (status, diff, add, commit, push)
src/core/ai/              provider-agnostic AI layer: create-provider.ts (factory), prompt.ts, schemas.ts (zod)
src/core/ai/providers/    concrete provider implementations (only groq.ts today)
src/core/commit/          diff.ts (extraction/truncation), format.ts (message formatting)
src/core/config/          load-config.ts, defaults.ts (DEFAULT_CONFIG, CONFIG_FILE_NAME)
src/core/errors/app-error.ts  AppError + toAppError() — normalizes any thrown value (incl. ZodError) into a user-facing error with code/hint
src/core/cli/update.ts    background npm-update check + prompt
src/core/ui/              output.ts (colored terminal output), prompts.ts (@inquirer/prompts wrappers)
src/types/index.ts        all shared types (AppConfig, AIProvider, CommitSuggestion, etc.)
schemas/patchwise.schema.json   JSON Schema published alongside dist for `patchwise.config.json` IDE validation
```

Path alias: `@/*` → `src/*` (defined in both `tsconfig.json` and `vitest.config.ts`; used everywhere instead of relative imports).

### Config resolution

`loadConfig()` in `src/core/config/load-config.ts` merges, in increasing priority: `DEFAULT_CONFIG` → user config file (`~/.config/patchwise/config.json`, or platform equivalent via `getUserConfigPath()`) → project config file (`patchwise.config.json` in cwd) → environment variables (`GROQ_API_KEY`, `PATCHWISE_PROVIDER`, `PATCHWISE_MODEL`, `PATCHWISE_LANGUAGE`). Both config files are validated with the same zod `configSchema`. Array fields (`rules`, `allowedScopes`, `forbiddenPatterns`, `fewShotExamples`) are merged rather than overwritten — see `mergeStringArrays`/`mergeAllowedScopes`.

`program.ts` runs a `preAction` hook before every command except `setup`/`config init`: it reloads config, and if onboarding isn't complete or no API key is set, it silently runs the setup flow first, then checks for an npm update and offers to run it interactively.

### Adding an AI provider

Providers implement the `AIProvider` interface (`src/types/index.ts`): `generateCommitSuggestions(input: SuggestCommitInput): Promise<SuggestionResult>`. `createAIProvider()` in `src/core/ai/create-provider.ts` is the single factory switch — add a new provider there and in `src/core/ai/providers/`. `ProviderName` in `src/types/index.ts` is currently the single literal `"groq"`; extending it will require updating the zod schema in `load-config.ts` too. Prompt construction lives in `src/core/ai/prompt.ts`; response validation uses zod schemas in `src/core/ai/schemas.ts` (invalid AI responses become `AppError` with code `INVALID_RESPONSE` via `toAppError`).

### Errors

All command handlers funnel through `handleCommand()` in `program.ts`, which calls `toAppError()` and prints via `printAppError()`. Throw `AppError` with a `code`/`message`/`hint` for anything user-facing (missing API key, unsupported provider, invalid config) rather than a bare `Error`.

## Conventions

- ESM throughout (`"type": "module"`); no CommonJS.
- TypeScript `strict: true`; `@typescript-eslint/no-explicit-any` is turned off in `eslint.config.ts`.
- Commit messages follow Conventional Commits (`type(scope): subject`), types: `feat fix refactor docs test chore perf build ci` — this is both what Patchwise generates and what its own repo commits should follow.
