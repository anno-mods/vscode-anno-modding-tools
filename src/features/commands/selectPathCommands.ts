import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const ANNO8_SEARCH_PATHS = [
  `C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games\\Anno 117`,
  `C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games\\Anno 117 Closed Beta`,
  `D:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games\\Anno 117`,
  `D:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games\\Anno 117 Closed Beta`
]

export class SelectPathCommands {
  public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    return [
      vscode.commands.registerCommand('anno-modding-tools.selectAnno117GamePath', SelectPathCommands.selectGamePath),
      vscode.commands.registerCommand('anno-modding-tools.selectAnno117ModsFolder', SelectPathCommands.selectModsFolder)
    ];
  }

  static async selectGamePath(fileUri: vscode.Uri) {
    const config = vscode.workspace.getConfiguration('anno');

    const initialGamePath = config.get<string>('117.gamePath');
    let gamePath = initialGamePath;
    if (!gamePath) {
      gamePath = SelectPathCommands.detectGamePath() ?? '';
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

    if (!SelectPathCommands.isValidGamePath(gamePath)) {
      // auto correct selecting the executable path
      gamePath = SelectPathCommands.correctGamePath(gamePath);
    }

    await config.update('117.gamePath', gamePath, vscode.ConfigurationTarget.Global);

    if (!SelectPathCommands.isValidGamePath(gamePath)) {
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