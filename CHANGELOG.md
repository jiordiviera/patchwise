# patchwise

## 1.0.0

### Minor Changes

- Initial release of Patchwise — AI-assisted Git commits with developer control.

  ### Features
  - Generate commit suggestions from staged changes using Groq AI
  - Conventional Commits support (`type(scope): subject`)
  - Interactive file selection and staging (`patchwise stage`)
  - Commit message preview with multiple suggestions
  - Custom commit message option
  - Optional push after commit
  - Groq model selection from live API during setup
  - Multi-language support (English / French)
  - Smart diff truncation for large changesets (handles 413 errors)
  - Colorful CLI output with type badges and visual separators
  - Project and user configuration merging
  - Environment variable overrides (`GROQ_API_KEY`, `PATCHWISE_PROVIDER`, etc.)

  ### Commands
  - `patchwise commit` — generate and create a commit
  - `patchwise suggest` — generate suggestions without committing
  - `patchwise stage` — interactively select files to stage
  - `patchwise setup` — configure AI provider, model, and API key
  - `patchwise config init` — create project config file
