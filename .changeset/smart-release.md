---
"patchwise": minor
---

### New Features

- **CI/CD support**: `--yes` now auto-selects the first suggestion and commits without any TTY interaction
- **Smart diff truncation**: Large diffs are now intelligently truncated with file stats to prevent 413 token limit errors
- **Groq model selection**: Setup wizard fetches live model list from Groq API for interactive selection
- **Commit body support**: Suggestions now include detailed bodies with bullet points grouping changes by area

### Improvements

- **Compact prompt**: Reduced token usage by ~50% to avoid Groq free tier limits
- **Streamlined UI output**: Removed verbose headers, showing only suggestions with badges
- **Version from package.json**: CLI version is now read dynamically instead of being hardcoded
- **Type coercion**: Invalid AI commit types (e.g., "bugfix", "feature") are now auto-corrected to valid types
