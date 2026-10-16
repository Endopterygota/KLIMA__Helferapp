const { contextBridge, ipcRenderer } = require("electron");
const invoke = async (channel, ...args) => {
  try { return await ipcRenderer.invoke(channel, ...args); }
  catch (error) { throw new Error(error.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')); }
};
contextBridge.exposeInMainWorld("climaDesktop", {
  readLogbook: (directory) => invoke("clima:read-logbook", directory),
  saveLogbook: (directory, text, expected) =>
    ipcRenderer.invoke("clima:save-logbook", directory, text, expected),
  checkTool: (request) => invoke("clima:check-tool", request),
  convertToNetCDF: (request) => invoke("clima:convert-netcdf", request),
  scanDirectory: (directory) => invoke("clima:scan-directory", directory),
  inspectDataset: (source) => invoke("clima:inspect-dataset", source),
  createPlot: (source, variable) => invoke("clima:create-plot", source, variable),
});
