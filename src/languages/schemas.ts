import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('anno');
  const customXmlLanguageMode: boolean = config.get('workspace.setCustomXmlLanguageMode') || true;
  const modopSchema: boolean = config.get('workspace.setXmlSchema') || true;
  const modinfoSchema: boolean = config.get('workspace.setModinfoSchema') || true;

  writeWorkspaceSettings(context, customXmlLanguageMode, modopSchema, modinfoSchema);
}

interface IJsonSchema {
  fileMatch: string[],
  url: string
}

interface IXmlSchema {
  pattern: string,
  systemId: string
}

async function writeWorkspaceSettings(context: vscode.ExtensionContext, languageMode: boolean, modopSchema: boolean,
  modinfoSchema: boolean) {
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

      if (languageMode) {
        settings['files.associations'] ??= {};
        settings['files.associations']['assets*.xml'] = 'anno-xml';
        settings['files.associations']['texts_*.xml'] = 'anno-xml';
        settings['files.associations']['*.include.xml'] = 'anno-xml';
      }
      if (modopSchema) {
        const schemaUrl = "https://raw.githubusercontent.com/anno-mods/vscode-anno-modding-tools/main/generated/assets.xsd";

        settings['xml.fileAssociations'] ??= [];

        let alreadySet = false;
        for (const entry of settings['xml.fileAssociations']) {
          if ((entry as IXmlSchema).systemId === schemaUrl) {
            alreadySet = true;
            break;
          }
        }

        if (!alreadySet) {
          settings['xml.fileAssociations'].push({
            "pattern": "{assets*,*.include}.xml",
            "systemId": schemaUrl
          });
        }
      }
      if (modinfoSchema) {
        settings['json.schemas'] ??= [];

        for (const entry of settings['json.schemas']) {
          if ((entry as IJsonSchema).fileMatch.includes('/modinfo.json')) {
            return;
          }
        }

        (settings['json.schemas'] as any[]).push({
          "fileMatch": [ '/modinfo.json' ],
          "url": "https://raw.githubusercontent.com/anno-mods/vscode-anno-modding-tools/main/languages/modinfo-schema.json"
        });
      }

      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    }
    catch (err) {
      vscode.window.showWarningMessage(
        `Failed to update .vscode/settings.json: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}