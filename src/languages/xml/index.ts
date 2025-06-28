import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { AssetsSymbolProvider } from './assetsOutlineProvider';
import { AssetsActionProvider } from './assetsActionProvider';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(...AssetsSymbolProvider.register(context));
  context.subscriptions.push(...AssetsActionProvider.register(context));

  context.subscriptions.push(registerFolding('anno-xml'));

  const config = vscode.workspace.getConfiguration('anno');
  const customXmlLanguageMode: boolean = config.get('workspace.setCustomXmlLanguageMode') || true;
  const modopSchema: boolean = config.get('workspace.setXmlSchema') || true;

  if (customXmlLanguageMode || modopSchema) {
    writeWorkspaceSettings(context, customXmlLanguageMode, modopSchema);
  }
}

export function registerFolding(language: string): vscode.Disposable {
  return vscode.Disposable.from(
    vscode.languages.registerFoldingRangeProvider(language, { provideFoldingRanges })
  );
}

function provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken) {
  const ranges: vscode.FoldingRange[] = [];
  const text = document.getText();
  const tagStack: { tag: string; line: number }[] = [];

  // XML tag folds, except ModOps
  const tagRegex = /<([a-zA-Z0-9:_-]+)([^/>]*)?>|<\/([a-zA-Z0-9:_-]+)>|<([a-zA-Z0-9:_-]+)([^>]*)\/>/g;

  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchLine = document.positionAt(matchIndex).line;

    // Self-closing tag
    if (match[4]) continue;

    // Opening tag
    if (match[1] && match[1] !== "ModOps" && !text.substring(match.index, match[0].length - 1).endsWith("/>")) {
      tagStack.push({ tag: match[1], line: matchLine });
    }

    // Closing tag
    if (match[3]) {
      const tagName = match[3];
      for (let i = tagStack.length - 1; i >= 0; i--) {
        if (tagStack[i].tag === tagName) {
          const startLine = tagStack[i].line;
          const endLine = matchLine;
          if (endLine > startLine) {
            ranges.push(new vscode.FoldingRange(startLine, endLine));
          }
          tagStack.splice(i, 1);
          break;
        }
      }
    }
  }

  // <!-- # header folds, including ModOps as potential first header
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const text = line.text.trim();

    if (/^<!--\s*#/.test(text) || /^<ModOps>/.test(text)) {
      const start = i;
      let end = document.lineCount - 1;

      for (let j = i + 1; j < document.lineCount; j++) {
        const nextText = document.lineAt(j).text.trim();
        if (/^<!--\s*#/.test(nextText) || /^<\/ModOps>/.test(nextText)) {
          end = j - 1;
          break;
        }
      }

      if (end > start) {
        ranges.push(new vscode.FoldingRange(start, end));
      }
    }
  }

  return ranges;
}

interface ISchema {
  pattern: string,
  systemId: string
}

async function writeWorkspaceSettings(context: vscode.ExtensionContext, languageMode: boolean, schema: boolean) {
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
      if (schema) {
        const schemaUrl = "https://raw.githubusercontent.com/anno-mods/vscode-anno-modding-tools/main/generated/assets.xsd";

        settings['xml.fileAssociations'] ??= [];

        let alreadySet = false;
        for (const entry of settings['xml.fileAssociations']) {
          if ((entry as ISchema).systemId === schemaUrl) {
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

      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    }
    catch (err) {
      vscode.window.showWarningMessage(
        `Failed to update .vscode/settings.json: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}