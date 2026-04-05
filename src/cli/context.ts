import type { AppConfig } from "@/types";

export interface CommandContext {
  cwd: string;
  config: AppConfig;
}
