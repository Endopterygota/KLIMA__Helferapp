const { contextBridge, ipcRenderer } = require("electron");
const invoke = async (channel, ...args) => {
  try { return await ipcRenderer.invoke(channel, ...args); }
  catch (error) { throw new Error(error.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')); }
};
contextBridge.exposeInMainWorld("climaDesktop", {
  workspaceHealth: (settings) => invoke("clima:workspace-health", settings),
  setupStatus: () => invoke("clima:setup-status"),
  setupFolder: () => invoke("clima:setup-folder"),
  startSetup: (request) => invoke("clima:setup-start", request),
  cancelSetup: () => invoke("clima:setup-cancel"),
  onSetupProgress: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("clima:setup-progress", listener);
    return () => ipcRenderer.removeListener("clima:setup-progress", listener);
  },
  readLogbook: (directory) => invoke("clima:read-logbook", directory),
  saveLogbook: (directory, text, expected) =>
    ipcRenderer.invoke("clima:save-logbook", directory, text, expected),
  checkTool: (request) => invoke("clima:check-tool", request),
  convertToNetCDF: (request) => invoke("clima:convert-netcdf", request),
  scanDirectory: (directory) => invoke("clima:scan-directory", directory),
  inspectDataset: (source) => invoke("clima:inspect-dataset", source),
  createPlot: (source, variable) => invoke("clima:create-plot", source, variable),
});
