# Patchwise

[![npm version](https://img.shields.io/npm/v/patchwise)](https://www.npmjs.com/package/patchwise)
[![npm downloads](https://img.shields.io/npm/dm/patchwise)](https://www.npmjs.com/package/patchwise)
![tests](https://img.shields.io/badge/tests-42%20passing-brightgreen)

AI-assisted Git commits, with you still in charge.

Patchwise is a CLI tool that helps developers turn raw Git changes into clean, structured, and meaningful commits using AI assistance.

It analyzes your diff, suggests commit messages with detailed bodies, and guides you through staging and committing while keeping you fully in control.

---

## Features

* Analyze staged or unstaged changes
* Generate commit messages with body using AI
* Supports Conventional Commits
* Interactive file selection and staging
* Live Groq model selection during setup
* Custom commit message option
* Optional push after commit
* Smart diff truncation for large changesets
* Colorful CLI output with type badges
* Multi-language support (EN / FR)
* Provider-agnostic architecture, Groq by default

---

## Use Without Installing

```bash
npx patchwise@latest setup
```

```bash
pnpm dlx patchwise@latest setup
```

```bash
bunx --bun patchwise@latest setup
```

---

## Quick Start

### 1. Run setup

```bash
npx patchwise@latest setup
```

This interactive wizard will:
- Ask for your Groq API key (get one at [console.groq.com/keys](https://console.groq.com/keys))
- Let you pick a model from the live list of available Groq models
- Set your preferred commit language

Or set your API key manually:

```bash
export GROQ_API_KEY=your_api_key_here
```

### 2. Stage your changes

```bash
git add .
```

### 3. Generate and commit

```bash
npx patchwise@latest commit
```

You can use the same pattern for every command:

```bash
npx patchwise@latest suggest
pnpm dlx patchwise@latest stage
bunx --bun patchwise@latest commit --yes
```

---

## Example

```bash
npx patchwise@latest commit
```

```
────────────────────────────────────────────────
  📝 Commit Suggestions
────────────────────────────────────────────────

  Summary:
  Update project configuration and add payment documentation

  Suggestions:

  1. [CHORE] chore(config): update gitignore and add payment docs
     - Add .gitignore entries for build artifacts
     - Document Genuka Pay integration flow

  2. [DOCS] docs: add payment docs and update gitignore
     - Document payment module structure
     - Ignore generated config files

────────────────────────────────────────────────
```

---

## Commands

### patchwise commit

Generate suggestions and create a commit from staged changes.

```bash
npx patchwise@latest commit
```

Options:

* `--all` stage all changes before commit
* `--select` interactively select files
* `--push` push after commit
* `--yes` skip confirmations
* `--lang <en|fr>` commit language
* `--provider <name>` AI provider
* `--model <model>` AI model
* `--scope <scope>` set commit scope
* `--no-scope` disable scope

---

### patchwise suggest

Generate commit suggestions without committing.

```bash
npx patchwise@latest suggest
```

---

### patchwise stage

Interactively select files to stage.

```bash
npx patchwise@latest stage
```

---

### patchwise setup

Run the interactive setup wizard to configure your AI provider, model, and API key.

```bash
npx patchwise@latest setup
```

---

### patchwise config init

Create a project config file.

```bash
npx patchwise@latest config init
```

---

## Configuration

### Environment variables

```bash
GROQ_API_KEY=xxx
PATCHWISE_PROVIDER=groq
PATCHWISE_MODEL=llama-3.3-70b-versatile
PATCHWISE_LANGUAGE=en
```

---

### Config file

Create `patchwise.config.json`:

```json
{
  "provider": "groq",
  "model": "llama-3.3-70b-versatile",
  "commitConvention": "conventional",
  "language": "en",
  "maxSubjectLength": 72,
  "confirmBeforeCommit": true,
  "confirmBeforePush": true,
  "scopeStrategy": "auto"
}
```

### scopeStrategy

Controls how commit scopes are handled:

* `"auto"` — AI infers the scope from the diff (default)
* `"manual"` — you provide a scope via `--scope`
* `"none"` — no scope is included in commit messages

---

## Conventional Commits

Patchwise generates commits following this format:

```txt
type(scope): subject

body (optional)
```

Supported types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `build`, `ci`

Examples:

```txt
feat(auth): add email verification flow
fix(api): handle null company id
refactor(ui): simplify sidebar logic
docs(readme): update installation guide

chore(config): update gitignore and add payment docs

- Add .gitignore entries for build artifacts
- Document Genuka Pay integration flow
```

---

## AI Providers

Supported:

* Groq (with live model selection)

Planned:

* OpenAI
* Ollama
* Anthropic

---

## Architecture

```
CLI
 ├── Git Layer
 ├── AI Layer (provider-agnostic)
 ├── Commit Engine (diff, format, truncation)
 ├── Config System (env + project + user)
 └── UI Layer (colors, prompts, output)
```

---

## Safety

* No commit without user validation
* No push without confirmation unless explicitly requested
* API keys are not stored in the project
* Only staged changes are used by default
* Smart diff truncation prevents token limit errors

---

## Development

Install dependencies:

```bash
pnpm install
```

Run in development:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Lint + typecheck:

```bash
pnpm check:ci
```

Tests:

```bash
pnpm test
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

* open an issue
* submit a pull request
* improve documentation
* propose features

---

## License

MIT

---

## Philosophy

Patchwise does not replace Git.

It helps you write better commits, keep history clean, and move faster without losing control.

---

## Support

If you find the project useful, consider starring the repository.
