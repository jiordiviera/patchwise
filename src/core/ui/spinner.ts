import chalk from "chalk";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL_MS = 80;
const MESSAGE_INTERVAL_MS = 1800;
const CLEAR_LINE = "\r\x1b[2K";

export interface Spinner {
  /** Replace the rotating message list and restart from its first entry. */
  update(messages: string | string[]): void;
}

function toList(messages: string | string[]): string[] {
  const list = (Array.isArray(messages) ? messages : [messages]).filter(
    (message) => message.length > 0,
  );
  return list.length > 0 ? list : [""];
}

/**
 * Runs `task` while showing an animated spinner on stderr. When several
 * messages are given, the label steps through them (~1.8s each) and then
 * holds on the last one — so a slow request keeps feeling alive without
 * pretending to know progress. Non-TTY streams (CI, pipes, tests) get no
 * output; the task just runs. The spinner line is always cleared before
 * this resolves or rejects.
 */
export async function withSpinner<T>(
  messages: string | string[],
  task: (spinner: Spinner) => Promise<T>,
): Promise<T> {
  const stream = process.stderr;

  if (!stream.isTTY) {
    return task({ update: () => {} });
  }

  let phrases = toList(messages);
  let frame = 0;
  let phraseIndex = 0;
  let sincePhraseChange = 0;

  const render = (): void => {
    stream.write(
      `${CLEAR_LINE}${chalk.cyan(FRAMES[frame])} ${phrases[phraseIndex]}`,
    );
    frame = (frame + 1) % FRAMES.length;
    sincePhraseChange += FRAME_INTERVAL_MS;

    if (
      sincePhraseChange >= MESSAGE_INTERVAL_MS &&
      phraseIndex < phrases.length - 1
    ) {
      sincePhraseChange = 0;
      phraseIndex += 1;
    }
  };

  render();
  const timer = setInterval(render, FRAME_INTERVAL_MS);

  try {
    return await task({
      update: (next) => {
        phrases = toList(next);
        phraseIndex = 0;
        sincePhraseChange = 0;
      },
    });
  } finally {
    clearInterval(timer);
    stream.write(CLEAR_LINE);
  }
}
