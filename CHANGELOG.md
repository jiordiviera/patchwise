# patchwise

## 1.1.0

### Minor Changes

- 8899c5d: ### New Features
  - **CI/CD support**: `--yes` now auto-selects the first suggestion and commits without any TTY interaction
  - **Smart diff truncation**: Large diffs are now intelligently truncated with file stats to prevent 413 token limit errors
  - **Groq model selection**: Setup wizard fetches live model list from Groq API for interactive selection
  - **Commit body support**: Suggestions now include detailed bodies with bullet points grouping changes by area

  ### Improvements
  - **Compact prompt**: Reduced token usage by ~50% to avoid Groq free tier limits
  - **Streamlined UI output**: Removed verbose headers, showing only suggestions with badges
  - **Version from package.json**: CLI version is now read dynamically instead of being hardcoded
  - **Type coercion**: Invalid AI commit types (e.g., "bugfix", "feature") are now auto-corrected to valid types

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
