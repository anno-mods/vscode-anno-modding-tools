import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import * as modContext from './modContext';
import * as anno from '../anno';

const ANNO8_SEARCH_PATHS = [
  `C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games\\Anno 117`,
  `C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games\\Anno 117 Closed Beta`,
  `D:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games\\Anno 117`,
  `D:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games\\Anno 117 Closed Beta`
]

export class GamePaths {
  public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    return [
      vscode.commands.registerCommand('anno-modding-tools.selectAnno117GamePath', GamePaths.selectGamePath),
      vscode.commands.registerCommand('anno-modding-tools.selectAnno117ModsFolder', GamePaths.selectModsFolder)
    ];
  }

  public static getModsFolder(options?: { filePath?: string, version?: anno.GameVersion }): string | undefined {
    const uri = options?.filePath ? vscode.Uri.file(options.filePath) : undefined;
    const config = vscode.workspace.getConfiguration('anno', uri);

    const version = options?.version ?? modContext.getVersion();

    // TODO ensure dialog

    if (version === anno.GameVersion.Anno8) {
      const gamePath = config.get<string>('117.gamePath');
      let modsFolder = config.get<string>('117.modsFolder');
      if (!modsFolder && gamePath) {
        return path.join(gamePath, 'mods');
      }
      return modsFolder;
    }
    else {
      return config.get<string>('modsFolder');
    }
  }

  public static async ensureGamePathAsync(options?: { filePath?: string, version?: anno.GameVersion }): Promise<boolean> {
    const uri = options?.filePath ? vscode.Uri.file(options.filePath) : undefined;
    const config = vscode.workspace.getConfiguration('anno', uri);
    const version = options?.version ?? modContext.getVersion();

    let valid = false;

    if (version === anno.GameVersion.Anno7) {
      const annoMods: string | undefined = config.get<string>('rdaFolder');

      const validPath = annoMods !== undefined && annoMods !== "" && fs.existsSync(annoMods);
      valid = validPath && fs.existsSync(path.join(annoMods, anno.ANNO7_ASSETS_PATH));

      if (!valid) {
        const goSettings = 'Change Settings';
        const chosen = await vscode.window.showErrorMessage("`anno.rdaFolder` is not set up correctly.\n\nIt does not contain `" + anno.ANNO7_ASSETS_PATH + "`.", goSettings);
        if (chosen === goSettings) {
          vscode.commands.executeCommand('workbench.action.openSettings', 'anno.rdaFolder');
        }
        return false;
      }
    }
    else if (version === anno.GameVersion.Anno8) {
      const annoMods: string | undefined = config.get<string>('117.gamePath');

      // TODO rda files are not supported yet
      // const validPath = annoMods !== undefined && annoMods !== "" && fs.existsSync(annoMods);
      // const validExtractedPath = validPath && fs.existsSync(path.join(annoMods, utils.ANNO8_ASSETS_PATH));

      const validGamePath = annoMods !== undefined && annoMods !== "" && GamePaths.isValidGamePath(annoMods);

      valid = validGamePath;

      if (!valid) {
        const goSettings = 'Change Settings';
        const chosen = await vscode.window.showErrorMessage("`117.gamePath` is not set up correctly.\n\nIt does not contain `maindata/config.rda` and `Bin/Win64/Anno117.exe`.", goSettings);
        if (chosen === goSettings) {
          vscode.commands.executeCommand('workbench.action.openSettings', '117.gamePath');
        }
        return false;
      }
    }
    else {
      vscode.window.showErrorMessage("Something went wrong. The game version isn't set.");
      return false;
    }

    return true;
  }

  static async selectGamePath(fileUri: vscode.Uri) {
    const config = vscode.workspace.getConfiguration('anno');

    const initialGamePath = config.get<string>('117.gamePath');
    let gamePath = initialGamePath;
    if (!gamePath) {
      gamePath = GamePaths.detectGamePath() ?? '';
    }

    const skipDialog = false; // (initialGamePath !== gamePath && SelectPathCommands.isValidGamePath(gamePath));
    if (!skipDialog) {
      const result = await vscode.window.showOpenDialog({
        defaultUri: vscode.Uri.file(gamePath),
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Anno 117 Game Path'
      });

      if (!result) {
        return;
      }

      gamePath = result[0].fsPath;
    }

    if (!GamePaths.isValidGamePath(gamePath)) {
      // auto correct selecting the executable path
      gamePath = GamePaths.correctGamePath(gamePath);
    }

    await config.update('117.gamePath', gamePath, vscode.ConfigurationTarget.Global);

    if (!GamePaths.isValidGamePath(gamePath)) {
      vscode.window.showErrorMessage(
        "Didn't find `Bin\\Win64\\Anno117.exe` or `maindata\\config.rda` in the specified location.");
    }
    else {
      vscode.window.showInformationMessage("Valid Anno 117 installation found.");
    }
  }

  static async selectModsFolder(fileUri: vscode.Uri) {
    const config = vscode.workspace.getConfiguration('anno');

    const gamePath = config.get<string>('117.gamePath');
    const initialModsFolder = config.get<string>('117.modsFolder');
    let modsFolder = initialModsFolder;
    if (!modsFolder && gamePath) {
      modsFolder = path.join(gamePath, 'mods');
      if (fs.existsSync(gamePath) && !fs.existsSync(modsFolder)) {
        fs.mkdirSync(modsFolder);
      }
    }

    const result = await vscode.window.showOpenDialog({
      defaultUri: vscode.Uri.file(modsFolder ?? ''),
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select Anno 117 Mods Folder'
    });

    if (!result) {
      return;
    }

    modsFolder = result[0].fsPath;

    if (gamePath && normalizeWithDrive(modsFolder) === normalizeWithDrive(path.join(gamePath, 'mods'))) {
      modsFolder = '';
    }

    await config.update('117.modsFolder', modsFolder, vscode.ConfigurationTarget.Global);
  }

  static detectGamePath(): string | undefined {
    for (const gamePath of ANNO8_SEARCH_PATHS) {
      if (fs.existsSync(gamePath)) {
        return gamePath;
      }
    }

    return undefined;
  }

  static correctGamePath(folderPath: string): string {
    if (fs.existsSync(path.join(folderPath, "Anno117.exe"))
      || fs.existsSync(path.join(folderPath, "Anno8.exe"))) {
        return path.normalize(path.join(folderPath, "../../"));
    }

    return folderPath;
  }

  static isValidGamePath(folderPath: string): boolean {
    const executable = fs.existsSync(path.join(folderPath, "Bin\\Win64\\Anno117.exe"))
      || fs.existsSync(path.join(folderPath, "Bin\\Win64\\Anno8.exe"));
    const config = fs.existsSync(path.join(folderPath, "maindata\\config.rda"));
    return executable && config;
  }
}

function normalizeWithDrive(filePath: string) {
  let normalized = path.normalize(filePath);

  if (process.platform === 'win32' && /^[a-zA-Z]:/.test(normalized)) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return normalized;
}