# Patchwise

AI-assisted Git commits, with you still in charge.

Patchwise is a CLI tool that helps developers turn raw Git changes into clean, structured, and meaningful commits using AI assistance.

It analyzes your diff, suggests commit messages, and guides you through staging and committing while keeping you fully in control.

---

## Features

* Analyze staged or unstaged changes
* Generate commit messages using AI
* Supports Conventional Commits
* Interactive file selection
* Edit before committing
* Optional push after commit
* Provider-agnostic architecture, Groq by default
* Multi-language support (EN / FR)

---

## Installation

```bash
npm install -g patchwise
```

or

```bash
pnpm add -g patchwise
```

---

## Quick Start

### 1. Set your API key

```bash
export GROQ_API_KEY=your_api_key_here
```

### 2. Stage your changes

```bash
git add .
```

### 3. Generate and commit

```bash
patchwise commit
```

---

## Example

```bash
patchwise commit
```

```txt
Summary:
Adds retry logic for failed payment transactions

Suggestions:
1. feat(payment): add retry mechanism for failed transactions
2. fix(payment): handle transient provider failures
3. refactor(payment): improve error handling

Select a commit message:
```

---

## Commands

### patchwise commit

Generate and create a commit from staged changes.

```bash
patchwise commit
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
patchwise suggest
```

---

### patchwise stage

Interactively select files to stage.

```bash
patchwise stage
```

---

### patchwise config init

Create a config file.

```bash
patchwise config init
```

---

## Configuration

### Environment variables

```bash
GROQ_API_KEY=xxx
PATCHWISE_PROVIDER=groq
PATCHWISE_MODEL=llama-3.3-70b-versatile
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
  "confirmBeforePush": true
}
```

---

## Conventional Commits

Patchwise generates commits following this format:

```txt
type(scope): subject
```

Examples:

```txt
feat(auth): add email verification flow
fix(api): handle null company id
refactor(ui): simplify sidebar logic
docs(readme): update installation guide
```

---

## AI Providers

Supported:

* Groq

Planned:

* OpenAI
* Ollama
* Anthropic

---

## Architecture

```
CLI
 ├── Git Layer
 ├── AI Layer
 ├── Commit Engine
 └── UI Layer
```

---

## Safety

* No commit without user validation
* No push without confirmation unless explicitly requested
* API keys are not stored in the project
* Only staged changes are used by default

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

---

## Roadmap

V1:

* commit suggestions
* commit execution
* Groq integration
* file selection

V1.1:

* push support
* commit body generation
* language support

V2:

* hunk selection
* multi-commit split
* multi-provider support
* local AI

---

## Contributing

Contributions are welcome.

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
