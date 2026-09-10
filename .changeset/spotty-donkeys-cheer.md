---
"patchwise": minor
---

Improve the interactive feel of `patchwise commit`:

- Show an animated spinner while the AI provider generates suggestions,
  so the request no longer looks frozen. Its label steps through a few
  phrases ("Sending the diff…", "…is analyzing the changes…", …) and
  then holds, switches provider name when a fallback kicks in, and stays
  silent on non-TTY streams (CI, pipes).
- Yes/no confirmations now resolve on a single `y` / `n` keypress — no
  more pressing Enter afterwards. Enter alone still accepts the default.
