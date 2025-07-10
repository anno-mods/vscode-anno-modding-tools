import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import * as anno from '../../anno';
import * as utils from '../../other/utils';

export class AddTemplateCommands {
  public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.addTemplateAssets', AddTemplateCommands.addAssets)
    ];

    return disposable;
  }

  public static async addAssets(uri: vscode.Uri | undefined) {
    uri ??= vscode.window.activeTextEditor?.document.uri;
    
    if (!uri) {
      vscode.window.showErrorMessage(`Can't create template. Please select a file or folder to use as location.`);
      return;
    }

    const root = utils.findModRoot(uri.fsPath);
    const version = anno.ModInfo.readVersion(root);
  
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
    }
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
