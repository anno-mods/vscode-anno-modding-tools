import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as xmldoc from 'xmldoc';
import ProppedModel from '../../other/proppedModel';
import AnnoXml from '../../other/annoXml';
import * as channel from '../channel';

export class InfoImporter {
  insertPropContainer: xmldoc.XmlElement | undefined = undefined;

	public static register(context: vscode.ExtensionContext) {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.importInfo', async (fileUri) => {
        const modelFile = InfoImporter._findModelFile(fileUri.fsPath);

        const options: vscode.OpenDialogOptions = {
          canSelectMany: false,
          defaultUri: modelFile ? vscode.Uri.file(modelFile) : undefined,
          openLabel: 'Import',
          filters: {
              'glTF': ['gltf']
          }
        };

        let openUri = await vscode.window.showOpenDialog(options);
        if (openUri && openUri[0]) {
          channel.show();
          channel.log(`Import from ${path.basename(openUri[0].fsPath)} into ${path.basename(fileUri.fsPath)}`);

          const importer = new InfoImporter();
          importer.importInfo(fileUri.fsPath, openUri[0].fsPath);
        }
      })
    ];

    return disposable;
	}

  public importInfo(targetFile: string, modelFile: string) {
    const model = ProppedModel.fromFile(modelFile);
    const xml = AnnoXml.fromFile(targetFile);

    const ground = model.getBuildBlocker();
    if (ground) {
      channel.log('Import BuildBlocker from node/mesh \'ground\'');
      xml.setArray('BuildBlocker', 'Position', ground);
    }
    else {
      channel.log('No \'ground\' node/mesh found. Skip BuildBlocker');
    }

    fs.writeFileSync(targetFile, xml.toString());
  }

  private static _findModelFile(cfgFilePath: string) {
    const dirname = path.dirname(cfgFilePath);
    const basename = path.basename(cfgFilePath, '.ifo');
    
    // look for samename.gltf in either same folder or rdm/ folder
    let modelFile = path.join(dirname, basename + '.gltf');
    if (!fs.existsSync(modelFile)) {
      modelFile = path.join(dirname, 'rdm', basename + '.gltf');
    }
    if (!fs.existsSync(modelFile)) {
      return undefined;
    }

    return modelFile;
  }
}