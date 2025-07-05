import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('anno');
  const customXmlLanguageMode: boolean = config.get('workspace.setCustomXmlLanguageMode') || true;
  const modopSchema: boolean = config.get('workspace.setXmlSchema') || true;
  const modinfoSchema: boolean = config.get('workspace.setModinfoSchema') || true;

  if (customXmlLanguageMode || modopSchema || modinfoSchema) {
    writeWorkspaceSettings(context, customXmlLanguageMode, modopSchema, modinfoSchema);
  }
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

      let updateLanguage = true;
      let updateModopSchema = true;
      let updateModinfoSchema = true;

      if (languageMode) {
        settings['files.associations'] ??= {};

        if (settings['files.associations']['**/data/base/config/{engine,export,game,gui}/**/*.xml'] == 'anno-xml') {
          updateLanguage = false;
        }

        if (updateLanguage) {
          settings['files.associations']['**/data/base/config/{engine,export,game,gui}/**/*.xml'] = 'anno-xml';
        }
      }

      if (modopSchema) {
        const schemaUrl = "https://raw.githubusercontent.com/anno-mods/vscode-anno-modding-tools/main/generated/assets.xsd";

        settings['xml.fileAssociations'] ??= [];

        for (const entry of settings['xml.fileAssociations']) {
          if ((entry as IXmlSchema).systemId === schemaUrl) {
            updateModopSchema = false;
            break;
          }
        }

        if (updateModopSchema) {
          settings['xml.fileAssociations'].push({
            "pattern": "data/config/{engine,export,game,gui}/**/*.xml",
            "systemId": schemaUrl
          });
        }
      }
      if (modinfoSchema) {
        settings['json.schemas'] ??= [];

        for (const entry of settings['json.schemas']) {
          if ((entry as IJsonSchema).fileMatch.includes('/modinfo.json')) {
            updateModinfoSchema = false;
            break;
          }
        }

        if (updateModinfoSchema) {
          (settings['json.schemas'] as any[]).push({
            "fileMatch": [ '/modinfo.json' ],
            "url": "https://raw.githubusercontent.com/anno-mods/vscode-anno-modding-tools/main/languages/modinfo-schema.json"
          });
        }
      }

      if (updateLanguage || updateModinfoSchema || updateModopSchema) {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      }
    }
    catch (err) {
      vscode.window.showWarningMessage(
        `Failed to update .vscode/settings.json: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}