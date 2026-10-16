export interface PlotSource {
  directory: string;
  file: string;
  panoply: string;
}
export interface PlotVariable {
  name: string;
  label: string | null;
  units: string | null;
  dimensions: { name: string; length: number; first: string | null }[];
}
export interface PlotResult {
  image: string;
  variable: string;
}
