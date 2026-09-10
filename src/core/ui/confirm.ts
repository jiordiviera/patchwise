import {
  createPrompt,
  isEnterKey,
  useKeypress,
  useState,
} from "@inquirer/core";
import chalk from "chalk";

interface ConfirmConfig {
  message: string;
  default: boolean;
}

// Annotated explicitly so the exported type doesn't reference the
// transitive `@inquirer/type` package (TS2742).
type InstantConfirm = (config: ConfirmConfig) => Promise<boolean>;

/**
 * Like @inquirer/prompts `confirm`, but resolves on a single `y`/`n`
 * keypress with no Enter required. Enter alone accepts the default.
 * Exported for tests; use `confirmAction` everywhere else.
 */
export const instantConfirm: InstantConfirm = createPrompt<
  boolean,
  ConfirmConfig
>((config, done) => {
  const [status, setStatus] = useState<"idle" | "done">("idle");
  const [answer, setAnswer] = useState(config.default);

  const submit = (value: boolean): void => {
    setAnswer(value);
    setStatus("done");
    done(value);
  };

  useKeypress((key) => {
    if (status !== "idle") {
      return;
    }

    if (key.name === "y") {
      submit(true);
    } else if (key.name === "n") {
      submit(false);
    } else if (isEnterKey(key)) {
      submit(config.default);
    }
  });

  const prompt = chalk.yellow(`? ${config.message}`);

  if (status === "done") {
    return `${prompt} ${chalk.cyan(answer ? "yes" : "no")}`;
  }

  return `${prompt} ${chalk.dim(config.default ? "Y/n" : "y/N")}`;
});

export async function confirmAction(
  message: string,
  defaultValue = true,
): Promise<boolean> {
  if (!process.stdout.isTTY) {
    return defaultValue;
  }

  return instantConfirm({ message, default: defaultValue });
}
