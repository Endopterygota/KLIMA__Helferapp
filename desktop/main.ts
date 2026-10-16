import { app, BrowserWindow, dialog, ipcMain, shell, net } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { writeFile } from "node:fs/promises";
import { scanDirectory } from "../src/local-files-plugin";
import { runPanoply } from "./panoply";
import { checkTool, convertToNetCDF } from "./utility";
import { readLogbook, saveLogbook } from "./logbook";
import { QuickSetup } from "./quick-setup";
import { workspaceHealth } from "./workspace-health";

const smokeOutput = process.env["CLIMA_SMOKE_OUTPUT"];
if (smokeOutput) app.disableHardwareAcceleration();
if (smokeOutput)
  app.setPath("userData", path.join(app.getPath("temp"), `kloem-smoke-${process.pid}`));
let mainWindow: BrowserWindow | null = null;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    mainWindow?.restore();
    mainWindow?.focus();
  });
  app
    .whenReady()
    .then(async () => {
      app.setAppUserModelId("de.kloem.helferapp");
      const renderer = path.join(__dirname, "renderer", "index.html");
      const rendererUrl = pathToFileURL(renderer).href;
      const checkSender = (event: Electron.IpcMainInvokeEvent) => {
        if (
          event.sender !== mainWindow?.webContents ||
          event.senderFrame?.url.split("#")[0] !== rendererUrl
        )
          throw new Error("Unzulässiger Aufruf.");
      };
      const helper = path.join(__dirname, "java");
      ipcMain.handle("clima:workspace-health", (event, settings) => { checkSender(event); return workspaceHealth(settings); });
      const setup = new QuickSetup((state) => {
        if (!mainWindow?.isDestroyed()) mainWindow?.webContents.send("clima:setup-progress", state);
      }, net.fetch as typeof fetch);
      app.on("before-quit", () => setup.cancel());
      ipcMain.handle("clima:setup-status", (event) => {
        checkSender(event);
        return { ...setup.state, defaultDirectory: path.join(app.getPath("documents"), "KLOM") };
      });
      ipcMain.handle("clima:setup-folder", async (event) => {
        checkSender(event);
        const selected = await dialog.showOpenDialog(mainWindow!, { title: "Überordner wählen – darin wird KLOM angelegt", properties: ["openDirectory", "createDirectory"] });
        return selected.canceled ? null : path.join(selected.filePaths[0]!, "KLOM");
      });
      ipcMain.handle("clima:setup-start", (event, request) => { checkSender(event); return setup.start(request); });
      ipcMain.handle("clima:setup-cancel", (event) => { checkSender(event); setup.cancel(); });
      ipcMain.handle("clima:read-logbook", (event, directory) => {
        checkSender(event);
        return readLogbook(directory);
      });
      ipcMain.handle("clima:save-logbook", (event, directory, text, expected) => {
        checkSender(event);
        return saveLogbook(directory, text, expected);
      });
      ipcMain.handle("clima:check-tool", (event, request) => {
        checkSender(event);
        return checkTool(request);
      });
      ipcMain.handle("clima:convert-netcdf", (event, request) => {
        checkSender(event);
        return convertToNetCDF(request);
      });
      ipcMain.handle("clima:inspect-dataset", async (event, source) => {
        checkSender(event);
        return runPanoply(source, helper);
      });
      ipcMain.handle("clima:create-plot", async (event, source, variable) => {
        checkSender(event);
        if (typeof variable !== "string" || !variable)
          throw new Error("Bitte eine Variable auswählen.");
        return runPanoply(source, helper, variable);
      });
      ipcMain.handle("clima:scan-directory", async (event, directory: unknown) => {
        if (
          event.sender !== mainWindow?.webContents ||
          event.senderFrame?.url.split("#")[0] !== rendererUrl
        )
          throw new Error("Unzulässiger Aufruf.");
        if (typeof directory !== "string" || directory.length > 8192)
          throw new Error("Ungültiger Ordnerpfad.");
        return scanDirectory(directory.trim());
      });
      mainWindow = new BrowserWindow({
        width: 1360,
        height: 950,
        minWidth: 760,
        minHeight: 600,
        title: "KLÖM Helferapp",
        autoHideMenuBar: true,
        show: !smokeOutput && !process.env["CLIMA_TEST_HIDDEN"],
        backgroundColor: "#f8faf9",
        webPreferences: {
          preload: path.join(__dirname, "preload.cjs"),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          backgroundThrottling: !smokeOutput,
        },
      });
      mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https://")) void shell.openExternal(url);
        return { action: "deny" };
      });
      mainWindow.webContents.on("will-navigate", (event, url) => {
        if (url.split("#")[0] !== rendererUrl) event.preventDefault();
      });
      mainWindow.webContents.session.setPermissionRequestHandler(
        (_contents, _permission, callback) => callback(false),
      );
      await mainWindow.loadFile(renderer, { hash: smokeOutput ? "/einstellungen" : "/" });
      if (smokeOutput) {
        // Verify the packaged renderer, preload bridge, real folder scan and saved UI state.
        const report = await mainWindow.webContents.executeJavaScript(`(async () => {
        const waitFor = async (test) => { for (let i = 0; i < 1200; i++) { if (test()) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error('UI timeout: ' + document.body.textContent.slice(-1600)); };
        await waitFor(() => document.querySelector('#climate-directory'));
        const form = document.querySelector('#climate-directory').closest('form');
        form.requestSubmit();
        await waitFor(() => document.querySelector('#path-cdo').value === 'cdo.exe');
        const selections = Object.fromEntries(['cdo','ncdump','panoply','grb','nc'].map(key => [key, document.querySelector('#path-' + key).value]));
        if (Object.values(selections).some(value => !value)) throw new Error('Missing selection');
        [...document.querySelectorAll('button')].find(button => button.textContent.includes('Einstellungen speichern')).click();
        await waitFor(() => document.body.textContent.includes('Einstellungen in diesem Browser gespeichert.'));
        document.querySelector('[aria-label="Light Mode aktivieren"]')?.click();
        await waitFor(() => !document.documentElement.classList.contains('dark'));
        document.querySelector('[aria-label="Dark Mode aktivieren"]').click();
        await waitFor(() => document.documentElement.classList.contains('dark'));
        [...document.querySelectorAll('nav a')].find(link => link.textContent.includes('Datenbibliothek')).click();
        await waitFor(() => document.querySelectorAll('.library-table tbody tr').length === 2);
        const library = [...document.querySelectorAll('.library-table tbody tr')].map(row => row.textContent);
        [...document.querySelectorAll('nav a')].find(link => link.textContent.includes('Übersicht')).click();
        await waitFor(() => document.querySelector('#plot-file')?.options.length > 1 && !document.querySelector('#plot-file').disabled);
        if (!document.querySelector('#plot-file').value) {
          const fileSelect = document.querySelector('#plot-file');
          fileSelect.value = selections.nc;
          fileSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        await waitFor(() => document.querySelector('#plot-variable')?.value);
        const plotVariable = document.querySelector('#plot-variable').value;
        [...document.querySelectorAll('button')].find(button => button.textContent === 'Create Plot').click();
        await waitFor(() => document.querySelector('.plot-preview img'));
        const plotImage = document.querySelector('.plot-preview img').src;
        [...document.querySelectorAll('nav a')].find(link => link.textContent.includes('Utility')).click();
        await waitFor(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'cdo prüfen' && !button.disabled));
        [...document.querySelectorAll('button')].find(button => button.textContent === 'cdo prüfen').click();
        [...document.querySelectorAll('button')].find(button => button.textContent === 'ncdump prüfen').click();
        await waitFor(() => document.body.textContent.includes('cdo funktioniert') && document.body.textContent.includes('ncdump funktioniert'));
        const utilityChecks = { cdo: true, ncdump: true };
        [...document.querySelectorAll('nav a')].find(link => link.textContent.includes('Übersicht')).click();
        await waitFor(() => document.querySelector('.plot-preview img')?.src === plotImage);
        if (document.querySelector('#plot-variable').value !== plotVariable) throw new Error('Overview selection reset');
        [...document.querySelectorAll('nav a')].find(link => link.textContent.includes('Logbuch')).click();
        await waitFor(() => document.querySelector('#logbook-text')?.value.includes('KLÖM | Logbuch'));
        const logbookDisplayed = true;
        [...document.querySelectorAll('nav a')].find(link => link.textContent === 'Links').click();
        await waitFor(() => document.querySelectorAll('.resource-card').length === 6);
        const linksEnabled = true;
        const resourceLinks = [...document.querySelectorAll('.resource-card')].map(link => link.href);
        if (!resourceLinks.every(url => url.startsWith('https://'))) throw new Error('Invalid resource link');
        [...document.querySelectorAll('nav a')].find(link => link.textContent.includes('Übersicht')).click();
        const grbSelect = document.querySelector('#plot-file');
        grbSelect.value = selections.grb;
        grbSelect.dispatchEvent(new Event('change', { bubbles: true }));
        await waitFor(() => document.querySelector('#plot-variable')?.value && document.querySelector('#plot-variable').value !== plotVariable);
        const grbVariable = document.querySelector('#plot-variable').value;
        [...document.querySelectorAll('button')].find(button => button.textContent === 'Create Plot').click();
        await waitFor(() => document.querySelector('.plot-preview img')?.src && document.querySelector('.plot-preview img').src !== plotImage);
        return { title: document.title, selections, library, plotVariable, plotImage, grbVariable, grbPlotCreated: true, logbookDisplayed, linksEnabled, resourceLinks, utilityChecks, overviewPreserved: true, dark: document.documentElement.classList.contains('dark'), themeSaved: localStorage.getItem('clima.theme'), saved: JSON.parse(localStorage.getItem('clima.path-settings.v1')), nodeIntegration: typeof window.require };
      })()`);
        const { plotImage, ...summary } = report;
        if (plotImage)
          await writeFile(
            smokeOutput.replace(/\.json$/, ".png"),
            Buffer.from(plotImage.split(",")[1], "base64"),
          );
        await writeFile(smokeOutput, JSON.stringify(summary, null, 2));
        app.quit();
      }
    })
    .catch(async (error) => {
      if (smokeOutput) await writeFile(smokeOutput, JSON.stringify({ error: String(error) }));
      else dialog.showErrorBox("KLÖM Helferapp konnte nicht starten", String(error));
      app.exit(1);
    });
  app.on("window-all-closed", () => app.quit());
}
