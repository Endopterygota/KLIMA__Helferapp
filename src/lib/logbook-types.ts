export interface LogSnapshot {
  text: string;
  version: string;
  modified: string;
  path: string;
}
export type LogSaveResult =
  { saved: true; snapshot: LogSnapshot } | { saved: false; snapshot: LogSnapshot };
