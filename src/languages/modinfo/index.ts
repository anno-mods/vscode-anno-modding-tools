import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('anno');
  const modinfoSchema: boolean = config.get('workspace.setModinfoSchema') || true;

  if (modinfoSchema) {
    writeWorkspaceSettings(context);
  }
}

interface ISchema {
  fileMatch: string[],
  url: string
}

async function writeWorkspaceSettings(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return;

  const modinfoFiles = await vscode.workspace.findFiles('**/modinfo.json', '**/node_modules/**', 1);
  if (modinfoFiles.length === 0) return;

  for (const folder of workspaceFolders) {
    const folderPath = folder.uri.fsPath;

    const vscodeDir = path.join(folderPath, '.vscode');
    const settingsPath = path.join(vscodeDir, 'settings.json');

    try {
      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir);
      }

      let settings: any = {};
      if (fs.existsSync(settingsPath)) {
        const content = fs.readFileSync(settingsPath, 'utf8');
        settings = JSON.parse(content);
      }

      settings['json.schemas'] ??= [];

      for (const entry of settings['json.schemas']) {
        if ((entry as ISchema).fileMatch.includes('/modinfo.json')) {
          return;
        }
      }

      (settings['json.schemas'] as any[]).push({
        "fileMatch": [ '/modinfo.json' ],
        "url": "https://raw.githubusercontent.com/anno-mods/vscode-anno-modding-tools/main/languages/modinfo-schema.json"
      });

      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    }
    catch (err) {
      vscode.window.showWarningMessage(
        `Failed to update .vscode/settings.json: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}