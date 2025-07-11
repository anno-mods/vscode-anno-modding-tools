import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import * as anno from '../../anno';
import * as schemas from '../../languages/schemas';
import * as utils from '../../other/utils';

export class AddTemplateCommands {
  static _templatesPath: string;

  public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    this._templatesPath = context.asAbsolutePath('templates');

    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.createAnnoMod', AddTemplateCommands.createMod)
    ];

    return disposable;
  }

  public static async createMod(uri: vscode.Uri | undefined) {
    let root: string;
    let version: anno.GameVersion;
    let modid: string | undefined;

    if (uri) {
      const isFile = fs.statSync(uri.fsPath).isFile();
      root = isFile ? path.dirname(uri.fsPath) : uri.fsPath;
    }
    else {
      const folders = vscode.workspace.workspaceFolders;

      if (!folders || folders.length === 0) {
        vscode.window.showErrorMessage(`Please open a folder or workspace before creating a project.`);
        return;
      }
      // TODO multi folder support?
      root = folders[0].uri.fsPath;
    }

    const result = await vscode.window.showQuickPick([
      { label: 'Anno 117' },
      { label: 'Anno 1800' }
    ], {
      title: 'For which Anno game?',
      placeHolder: ''
    });
    if (!result) {
      return;
    }

    version = result.label === 'Anno 117' ? anno.GameVersion.Anno8 : anno.GameVersion.Anno7;

    modid = await vscode.window.showInputBox({
      prompt: 'Enter ModID',
      placeHolder: 'mod-name-creator',
      validateInput: (text) => {
        return /^[a-z][a-z0-9]+(\-[a-z0-9]+)*\-?$/.test(text)
          ? null
          : 'Only lower case letters, numbers and dashes are allowed, e.g. `mod-name-creator`';
      }
    });

    if (modid === undefined) {
      return;
    }

    if (modid.endsWith('-')) {
      modid = modid.slice(0, -1);
    }

    if (modid) {
      root = path.join(root, modid);
    }
    else {
      modid = 'mod-name-creator';
    }

    const modinfoPath = path.join(root, 'modinfo.json');

    let files: string[] = [];

    if (version === anno.GameVersion.Anno8) {
      files = utils.copyFolderNoOverwrite(path.join(AddTemplateCommands._templatesPath, 'anno117'), root);

      AddTemplateCommands.addFile(modinfoPath, `{
  "ModID": "${modid}",
  "Version": "1.0.0",
  "Anno": 8,
  "Difficulty": "cheat",
  "ModName": {
    "English": "Name"
  },
  "Category": {
    "English": "Mod"
  }
}`);
    }
    else if (version === anno.GameVersion.Anno7) {
      files = utils.copyFolderNoOverwrite(path.join(AddTemplateCommands._templatesPath, 'anno1800'), root);

      AddTemplateCommands.addFile(modinfoPath, `{
  "ModID": "${modid}",
  "Version": "1.0.0",
  "Anno": 7,
  "ModName": {
    "English": "Name"
  },
  "Category": {
    "English": "Mod"
  }
}`);
    }

    schemas.refreshSchemas();

    // trigger open of all documents to expand the explorer
    for (const file of files) {
      vscode.window.showTextDocument(vscode.Uri.file(file));
    }

    vscode.window.showTextDocument(vscode.Uri.file(modinfoPath));
  }

  static addFile(filePath: string | undefined, content: string) {
    if (!filePath) {
      // TODO
      return;
    }

    if (!fs.existsSync(filePath)) {
      try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, 'utf8');
      }
      catch {
        vscode.window.showErrorMessage(`Something went wrong creating '${filePath}'.`);
      }
    }
  }
}
