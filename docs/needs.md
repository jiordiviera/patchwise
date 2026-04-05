Parfait, **`patchwise`** est un très bon choix.
On va faire une vraie doc technique propre, comme un projet sérieux que tu peux publier direct.

---

# 📦 Patchwise – Technical Documentation

## 1. Overview

**Patchwise** is a CLI tool that helps developers transform raw Git changes into clean, structured, and meaningful commits using AI assistance.

It provides:

* intelligent commit message generation
* guided staging and selection of changes
* support for Conventional Commits
* optional push workflow
* provider-agnostic AI integration (Groq by default)

---

## 2. Core Principles

* Human always validates before commit
* No automatic push without confirmation
* Git state must remain explicit and predictable
* AI assists, never decides blindly
* Staged vs unstaged must be respected

---

## 3. Features

## 3.1 Commit Suggestion

Generate commit messages from staged changes.

### Command

```bash
patchwise suggest
```

### Behavior

* Reads `git diff --cached`
* Sends diff to AI provider
* Returns:

  * summary of changes
  * 2–3 commit suggestions

### Output Example

```txt
Summary:
Adds retry logic for failed payment transactions

Suggestions:
1. feat(payment): add retry mechanism for failed transactions
2. fix(payment): handle transient provider failures
3. refactor(payment): improve error handling in transaction flow
```

---

## 3.2 Commit Creation

Generate and execute a commit.

### Command

```bash
patchwise commit
```

### Behavior

* Reads staged changes
* Generates suggestions
* Prompts user to:

  * select suggestion
  * edit message
* Executes:

```bash
git commit -m "..."
```

---

## 3.3 File Selection (Staging)

### Command

```bash
patchwise stage
```

### Behavior

* Lists modified files
* Interactive selection
* Executes:

```bash
git add <selected-files>
```

---

## 3.4 Commit with File Selection

```bash
patchwise commit --select
```

### Flow

1. Select files
2. Stage them
3. Generate commit message
4. Confirm commit

---

## 3.5 Commit All Changes

```bash
patchwise commit --all
```

### Behavior

* Executes:

```bash
git add -A
```

* Then normal commit flow

---

## 3.6 Interactive Mode (Future)

```bash
patchwise commit --interactive
```

### Planned Behavior

* Split diff into hunks
* Allow inclusion/exclusion per hunk
* Build precise commit scope

---

## 3.7 Push After Commit

```bash
patchwise commit --push
```

### Flow

1. Create commit
2. Detect current branch
3. Ask:

```txt
Push to origin/branch-name?
```

4. Execute:

```bash
git push
```

### Auto confirm

```bash
patchwise commit --push --yes
```

---

## 3.8 Language Support

```bash
patchwise commit --lang en
patchwise commit --lang fr
```

Controls commit message language.

---

## 3.9 Conventional Commits

Enabled by default.

### Supported Types

* feat
* fix
* refactor
* docs
* test
* chore
* perf
* build
* ci

### Format

```txt
type(scope): subject
```

---

## 3.10 Scope Detection

### Strategies

* auto (default)
* manual
* none

### Example

```bash
patchwise commit --scope auth
patchwise commit --no-scope
```

---

## 3.11 Multi-Commit Splitting (Future)

```bash
patchwise split
```

### Behavior

* Detect multiple logical changes
* Suggest multiple commits
* Assist staging per commit

---

## 4. CLI Commands

### Main Commands

```bash
patchwise commit
patchwise suggest
patchwise stage
patchwise split
patchwise config init
```

---

## 5. CLI Options

| Option          | Description                |
| --------------- | -------------------------- |
| `--all`         | Stage all changes          |
| `--select`      | Select files interactively |
| `--interactive` | Select hunks (future)      |
| `--push`        | Push after commit          |
| `--yes`         | Skip confirmations         |
| `--lang`        | Commit language            |
| `--provider`    | AI provider                |
| `--model`       | Model to use               |
| `--scope`       | Set commit scope           |
| `--no-scope`    | Disable scope              |

---

## 6. Architecture

### High-Level

```txt
CLI
 ├── Git Layer
 ├── AI Layer
 ├── Commit Engine
 └── UI Layer
```

---

## 6.1 Modules

### CLI Layer

* command parsing
* user interaction

### Git Layer

* read diff
* stage files
* commit
* push

### AI Layer

* provider abstraction
* prompt building
* response parsing

### Commit Engine

* suggestion generation
* conventional commit formatting
* scope detection

### UI Layer

* prompts
* selections
* output formatting

---

## 7. Project Structure

```txt
src/
 ├─ cli/
 ├─ core/
 │   ├─ git/
 │   ├─ ai/
 │   ├─ commit/
 │   ├─ config/
 │   └─ ui/
 ├─ types/
 └─ utils/
```

---

## 8. AI Integration

## 8.1 Provider Interface

```ts
interface AIProvider {
  generateCommitSuggestions(input: DiffInput): Promise<CommitSuggestion[]>;
}
```

---

## 8.2 Supported Providers

### Initial

* Groq

### Future

* OpenAI
* Ollama (local)
* Anthropic

---

## 8.3 Configuration

### Environment Variables

```bash
GROQ_API_KEY=xxx
PATCHWISE_PROVIDER=groq
PATCHWISE_MODEL=llama-3.3-70b-versatile
```

---

## 8.4 Config File

`patchwise.config.json`

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

## 9. Prompt Design

### Input

* file names
* diff summary
* truncated diff if needed
* desired format

### Output (strict JSON)

```json
{
  "summary": "string",
  "suggestions": [
    {
      "type": "feat",
      "scope": "auth",
      "subject": "add login validation"
    }
  ]
}
```

---

## 10. Git Integration

### Commands Used

* `git diff --cached`
* `git diff`
* `git add`
* `git commit`
* `git push`
* `git branch --show-current`

---

## 11. Error Handling

Must handle:

* not a git repository
* no staged changes
* empty diff
* API errors
* rate limits
* invalid responses
* network failures

---

## 12. Security

* API keys via env only
* no key stored in repo
* no automatic execution without confirmation
* sanitize diff before sending to AI

---

## 13. Performance

* truncate large diffs
* limit tokens sent to AI
* async calls
* fast CLI response (<2s ideal)

---

## 14. Testing

### Tools

* Vitest

### Coverage

* Git parsing
* AI response parsing
* CLI flows
* config loading

---

## 15. Build & Release

### Build

* tsup

### Release

* changesets
* npm publish
* GitHub Actions

---

## 16. Roadmap

### V1

* commit suggestion
* commit execution
* Groq integration
* file selection

### V1.1

* push support
* commit body
* language config

### V2

* hunk selection
* multi-commit split
* multi-provider
* Ollama support

---

## 17. Non-Goals (for now)

* full Git replacement
* automatic commits without validation
* GUI interface
* CI/CD integration

---

## 18. License

Recommended:

* MIT

---

## 19. Conclusion

Patchwise is not a commit generator.
It is a developer tool designed to:

* enforce clean commit practices
* reduce cognitive load
* improve repository quality
* integrate seamlessly into existing workflows

---

Si tu veux, next step je peux te faire :

* le **README prêt à push sur GitHub**
* le **squelette du projet avec code initial**
* ou le **design exact du prompt Groq optimisé pour éviter les hallucinations**

Et là tu peux lancer le repo direct.
