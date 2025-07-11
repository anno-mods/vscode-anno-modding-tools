import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import * as anno from '../../anno';
import * as schemas from '../../languages/schemas';
import * as utils from '../../other/utils';

export class AddTemplateCommands {
  public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
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

    if (version === anno.GameVersion.Anno8) {
      AddTemplateCommands.addFile(anno.getAssetsXmlPath(root, version), `<ModOps>
  <!-- Anno 117: Happy modding! -->
  <!--
    Documentation on what has changed
    https://github.com/jakobharder/anno-mod-loader/blob/devel/117-changes/doc/modloader-changes.md#modloader-changes-for-anno-117
  -->
</ModOps>`);

      AddTemplateCommands.addFile(path.join(anno.getLanguagePath(root, version), 'texts_english.xml'), `<ModOps>
  <!-- Anno 117 Language Template -->
  <!--
    Note: Texts are now based on LineId and not GUID.
  -->
  <ModOp Add="/TextExport/Texts[1]">
    <Text>
      <Text>Happy Modding</Text>
      <LineId>2001000000</LineId>
    </Text>
  </ModOp>
</ModOps>`);

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
      AddTemplateCommands.addFile(anno.getAssetsXmlPath(root, version), `<ModOps>
  <!-- Anno 1800: Happy modding! -->
</ModOps>`);

      AddTemplateCommands.addFile(path.join(anno.getLanguagePath(root, version), 'texts_english.xml'), `<ModOps>
  <!-- Anno 1800 Language Template -->
  <ModOp Type="add" Path="/TextExport/Texts[1]">
    <Text>
      <Text>Happy Modding</Text>
      <GUID>2001000000</GUID>
    </Text>
  </ModOp>
</ModOps>`);

      AddTemplateCommands.addFile(path.join(root, modinfoPath), `{
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

    const doc = await vscode.workspace.openTextDocument(modinfoPath);
    await vscode.window.showTextDocument(doc);
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
