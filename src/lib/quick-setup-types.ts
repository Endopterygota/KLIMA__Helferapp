import type { Selection } from "./path-settings";
export type SetupState = {
  running: boolean;
  directory: string;
  message: string;
  completed: string[];
  warnings: string[];
  error?: string | undefined;
  received?: number | undefined;
  total?: number | undefined;
  result?: { directory: string; selection: Selection } | undefined;
};
export type SetupRequest = { directory: string; sourceDirectory?: string };
