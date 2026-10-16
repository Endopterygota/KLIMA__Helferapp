export interface ToolRequest {
  directory: string;
  executable: string;
  tool: "cdo" | "ncdump";
}
export interface ToolCheck {
  ok: boolean;
  output: string;
  command: string;
  exitCode: number | null;
}
export interface ConversionRequest {
  directory: string;
  cdo: string;
  input: string;
  output: string;
}
export interface ConversionResult {
  output: string;
  log: string;
}
