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
    if (editor?.document.uri.scheme.startsWith('annoasset')) {
      _current = new ModContext(undefined);
      _version = editor.document.uri.scheme === 'annoasset8' ? utils.GameVersion.Anno8 : utils.GameVersion.Anno7;
      vscode.languages.setTextDocumentLanguage(editor.document, 'anno-xml');
    }
    else {
      _current = new ModContext(editor?.document);
      if (_current.modinfo?.game) {
        _version = _current.modinfo.game;
      }
    }

    for (let listener of _onDidChangeActiveTextEditor) {
      listener(_current);
    }
  });
}

let _current: ModContext;
export function get() {
  if (!_current) {
    _current = new ModContext(vscode.window.activeTextEditor?.document);
    _version = _current.modinfo ? _current.modinfo.game : utils.GameVersion.Anno7;
  }

  return _current;
}

let _version: utils.GameVersion = utils.GameVersion.Anno7;
export function getVersion() {
  if (!_current) {
    get();
  }
  return _version;
}

let _onDidChangeActiveTextEditor: ModEditorEvent[] = []
export function onDidChangeActiveTextEditor(listener: ModEditorEvent) {
  _onDidChangeActiveTextEditor.push(listener);
}
