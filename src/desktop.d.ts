import type { Catalog } from "./lib/path-settings";
import type { SetupState, SetupRequest } from "./lib/quick-setup-types";
import type { LogSnapshot, LogSaveResult } from "./lib/logbook-types";
import type { PlotSource, PlotVariable, PlotResult } from "./lib/plot-types";
import type {
  ToolRequest,
  ToolCheck,
  ConversionRequest,
  ConversionResult,
} from "./lib/utility-types";
declare global {
  interface Window {
    climaDesktop?: {
      setupStatus?: () => Promise<SetupState & { defaultDirectory: string }>;
      setupFolder?: () => Promise<string | null>;
      startSetup?: (request: SetupRequest) => Promise<SetupState>;
      cancelSetup?: () => Promise<void>;
      onSetupProgress?: (callback: (state: SetupState) => void) => () => void;
      readLogbook?: (directory: string) => Promise<LogSnapshot>;
      saveLogbook?: (directory: string, text: string, expected: string) => Promise<LogSaveResult>;
      checkTool?: (request: ToolRequest) => Promise<ToolCheck>;
      convertToNetCDF?: (request: ConversionRequest) => Promise<ConversionResult>;
      inspectDataset?: (source: PlotSource) => Promise<{ variables: PlotVariable[] }>;
      createPlot?: (source: PlotSource, variable: string) => Promise<PlotResult>;
      scanDirectory(
        directory: string,
      ): Promise<{ directory: string; files: Catalog; warnings: string[] }>;
    };
  }
}
export {};
