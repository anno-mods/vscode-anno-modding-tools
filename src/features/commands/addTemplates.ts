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
    if (uri) {
      root = utils.findModRoot(uri.fsPath);
      version = anno.ModInfo.readVersion(root);
    }
    else {
      const folders = vscode.workspace.workspaceFolders;

      if (!folders || folders.length === 0) {
        vscode.window.showErrorMessage(`Please open a folder or workspace before creating a project.`);
        return;
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

      // TODO multi folder support?
      root = folders[0].uri.fsPath;
    }

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

      AddTemplateCommands.addFile(path.join(root, 'modinfo.json'), `{
  "ModID": "mod-name-creator",
  "Version": "1.0.0",
  "Anno": 8,
  "Difficulty": "unchanged",
  "ModName": {
    "English": "Mod Name"
  },
  "Category": {
    "English": "Gameplay"
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

      AddTemplateCommands.addFile(path.join(root, 'modinfo.json'), `{
  "ModID": "mod-name-creator",
  "Version": "1.0.0",
  "Anno": 7,
  "ModName": {
    "English": "Mod Name"
  },
  "Category": {
    "English": "Gameplay"
  }
}`);
    }

    schemas.refreshSchemas();

    const doc = await vscode.workspace.openTextDocument(path.join(root, 'modinfo.json'));
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
