import * as vscode from 'vscode';
import * as fs from 'fs';
import { resolveGUID } from './guidUtilsProvider';

// this method is called when vs code is activated
export function activate(context: vscode.ExtensionContext) {
  const assetPath = context.asAbsolutePath('./generated/');
  const allowedTags = JSON.parse(
      fs.readFileSync(assetPath + 'guids.json', { encoding: 'utf8' })) as { [index: string]: any };

  let timeout: NodeJS.Timer | undefined = undefined;

  // create a decorator type that we use to decorate small numbers
  const guidDecorationType = vscode.window.createTextEditorDecorationType({});
  const assetDecorationType = vscode.window.createTextEditorDecorationType({});

  let activeEditor = vscode.window.activeTextEditor;

  function decorationText(tag: string, guid: string) {
    const tagInfo = allowedTags[tag];
    if (tag !== 'BaseAssetGUID' && (!tagInfo || tagInfo.templates.length === 0 || tag === 'Amount')) {
      return '';
    }

    if (guid === '0') {
      return '(no target)';
    }
    else if (guid === '-1') {
      return '(not set)';
    }

    const resolved = resolveGUID(guid);
    if (!resolved) {
      return '??';
    }

    return (resolved.english ?? resolved.name) + (resolved.template ? ` (${resolved.template})` : '');
  }

  function updateDecorations() {
    if (!activeEditor) {
      return;
    }

    const traverse = (activeEditor: vscode.TextEditor, color: string, 
      regex: RegExp, onMatch: (match: RegExpExecArray) => string, 
      type: vscode.TextEditorDecorationType) => {

      if (activeEditor.document.lineCount > 30000) {
        // ignore 30k+ lines
        return;
      }

      const text = activeEditor.document.getText();
      if (text.length > 1024 * 1024 * 10) {
        // ignore 10MB+ files
        return;
      }

      const guids: vscode.DecorationOptions[] = [];
      let match;
      while ((match = regex.exec(text))) {
        const startPos = activeEditor.document.positionAt(match.index);
        const endPos = activeEditor.document.positionAt(match.index + match[0].length);
        const text = onMatch(match);
        if (!text) {
          continue;
        }
  
        const decoration: vscode.DecorationOptions = {
          range: new vscode.Range(startPos, endPos),
          renderOptions: {
            after: {
              contentText: text,
              color: new vscode.ThemeColor(color),
              margin: '15px'
            }
          }
        };
        guids.push(decoration);
      }
      
      activeEditor.setDecorations(type, guids);
    };

    traverse(activeEditor, 'editorCodeLens.foreground', /<(\w+)>(\d+)<\/\1>/g, (match) => {
      return decorationText(match[1], match[2]);
    }, guidDecorationType);

    traverse(activeEditor, 'terminal.ansiGreen' /*'button.background'*/, /<Asset>/g, (match) => {
      const startPos = activeEditor!.document.positionAt(match.index);
      let standard = activeEditor!.document.getText(new vscode.Range(startPos.line, startPos.character, startPos.line + 20, 0));
      const endPos = standard.indexOf('</Asset>');
      if (endPos >= 0) {
        standard = standard.substring(0, endPos);
      }
      const guidRegex = /<GUID>(\d+)<\/GUID>/g;
      let guidMatch = guidRegex.exec(standard);
      if (!guidMatch) {
        return '';
      }
      return decorationText('GUID', guidMatch[1]);
    }, assetDecorationType);
  }

  function triggerUpdateDecorations(throttle = false) {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    if (throttle) {
      timeout = setTimeout(updateDecorations, 500);
    } else {
      updateDecorations();
    }
  }

  if (activeEditor) {
    triggerUpdateDecorations();
  }

  vscode.window.onDidChangeActiveTextEditor(editor => {
    activeEditor = editor;
    if (editor) {
      triggerUpdateDecorations();
    }
  }, null, context.subscriptions);

  vscode.workspace.onDidChangeTextDocument(event => {
    if (activeEditor && event.document === activeEditor.document) {
      triggerUpdateDecorations(true);
    }
  }, null, context.subscriptions);

}