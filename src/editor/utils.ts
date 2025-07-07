import * as fs from 'fs';
import * as path from 'path';
import * as anno from '../anno';
import * as vscode from 'vscode';

export function getTagCloseAt(doc: vscode.TextDocument, position: vscode.Position) {
  let lineNumber = position.line;
  let line = doc.lineAt(lineNumber);
  let index = -1;
  while (index === -1 && lineNumber < doc.lineCount - 1) {
    line = doc.lineAt(lineNumber++);
    index = line.text.search(/<(?=\w)/);
  }

  if (line && index !== -1 && line.text.length > index + 1) {
    if (line.text[index + 1] !== '/') {
      // we're in a tag. probably
      let end = line.text.substring(index + 1).search(/[ \/>]/);
      return { 
        name: line.text.substring(index + 1, end === -1 ? undefined : (end + index + 1)),
        line: lineNumber - 1,
        position: index
      };
    }
  }

  return undefined;
}

export function findTagUp(tag: string, doc: vscode.TextDocument, position: vscode.Position) {
  let lineNumber = position.line;
  let line = doc.lineAt(lineNumber);
  let index = -1;
  const exp = new RegExp('<' + tag + '(?=[ />])');
  while (index === -1 && lineNumber >= 0) {
    line = doc.lineAt(lineNumber--);
    index = line.text.search(exp);
  }

  if (index !== -1) {
    return new vscode.Position(lineNumber + 1, index);
  }

  return new vscode.Position(0, 0);
}

export function findTagBegin(tag: string, doc: vscode.TextDocument, position: vscode.Position) {
  let firstTag = getTagCloseAt(doc, position);
  if (firstTag === undefined) {
    return new vscode.Position(0, 0);
  }

  if (firstTag.name !== tag) {
    return findTagUp(tag, doc, position);
  }

  return new vscode.Position(firstTag.line, firstTag.position);
}

export function findTagEnd(tag: string, doc: vscode.TextDocument, position: vscode.Position) {
  let lineNumber = position.line;
  let line = doc.lineAt(lineNumber);
  let index = -1;
  while (index === -1 && lineNumber < doc.lineCount) {
    line = doc.lineAt(lineNumber++);
    index = line.text.indexOf('</' + tag + '>');
  }

  // TODO no opening tags!

  if (index !== -1) {
    return new vscode.Position(lineNumber - 1, index + 3 + tag.length);
  }

  return doc.lineAt(doc.lineCount - 1).range.end;
}

export function getSelectedModOps(doc: vscode.TextDocument, selection: vscode.Selection) {
  let content: string = doc.getText();

  const start = doc.offsetAt(selection.start);
  const end = doc.offsetAt(selection.end);

  const reduceRegexes = [
    /<ModOp [^>]*>([\s\S]*?)<\/ModOp>/g,
    /<(ModOp|Include) [^>]*\/>/g
  ];

  for (const regex of reduceRegexes) {
    content = content.replace(regex, (match, group, offset) => {
      if (offset + match.length <= start || offset >= end) {
        return "";
      } else {
        return match;
      }
    });
  }

  return content;
}

export async function ensurePathSettingAsync(pathSetting: string, fileUri?: vscode.Uri) {
  const config = vscode.workspace.getConfiguration('anno', fileUri);
  const annoMods: string | undefined = config.get(pathSetting);

  if (!annoMods || !fs.existsSync(annoMods)) {
    const goSettings = 'Change Settings';
    const chosen = await vscode.window.showErrorMessage("Your `" + pathSetting + "` is not set up correctly.", goSettings);
    if (chosen === goSettings) {
      vscode.commands.executeCommand('workbench.action.openSettings', 'anno.' + pathSetting);
    }
    return false;
  }

  return true;
}

export function getVanilla(filePath: string, modRoot?: string) {
  const config = vscode.workspace.getConfiguration('anno', vscode.Uri.file(filePath));
  const annoRda: string = config.get('rdaFolder') || "";

  const anno8 = fs.existsSync(path.join(annoRda, 'data/base/config'));
  const basePath = anno8 ? anno.ANNO8_ASSETS_PATH : anno.ANNO7_ASSETS_PATH;

  const basename = path.basename(filePath, path.extname(filePath));
  let vanillaPath = '';
  if (filePath.endsWith('export.bin.xml') || path.dirname(filePath).endsWith("infotips")) {
    vanillaPath = path.join(annoRda, 'data/infotips/export.bin');
  }
  else if (basename.indexOf("templates") >= 0) {
    vanillaPath = path.join(annoRda, basePath, 'templates.xml');
  }
  else if (basename.indexOf("texts_") >= 0) {
    vanillaPath = path.join(annoRda, (anno8 ? 'data/base/config/gui/' : 'data/config/gui/') + basename + '.xml');
  }
  else if (modRoot && (filePath.endsWith('.cfg.xml') || filePath.endsWith('.fc.xml'))) {
    const relative = path.relative(modRoot, filePath);
    vanillaPath = path.join(annoRda, relative.substring(0, relative.length - 4));
  }
  else {
    vanillaPath = path.join(annoRda, basePath, 'assets.xml');
  }

  if (!fs.existsSync(vanillaPath)) {
    return undefined;
  }

  return vanillaPath;
}
