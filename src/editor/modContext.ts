import * as vscode from 'vscode';
import * as anno from '../anno';
import * as utils from '../other/utils';

export class ModContext {
  public document?: vscode.TextDocument;
  public modinfo?: anno.ModInfo;

  public constructor(document: vscode.TextDocument | undefined) {
    this.document = document;
    if (document?.uri.fsPath) {
      this.modinfo = anno.ModInfo.read(utils.findModRoot(document?.uri.fsPath), true);
    }
  }
}

type ModEditorEvent = (e: ModContext) => any;

export function activate(context: vscode.ExtensionContext) {
  vscode.window.onDidChangeActiveTextEditor(editor => {
    _current = new ModContext(editor?.document);

    for (let listener of _onDidChangeActiveTextEditor) {
      listener(_current);
    }
  });
}

let _current: ModContext;
export function getCurrent() {
  if (!_current) {
    _current = new ModContext(vscode.window.activeTextEditor?.document);
  }

  return _current;
}

let _onDidChangeActiveTextEditor: ModEditorEvent[] = []
export function onDidChangeActiveTextEditor(listener: ModEditorEvent) {
  _onDidChangeActiveTextEditor.push(listener);
}
