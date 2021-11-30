import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as xmldoc from 'xmldoc';
import ProppedModel from '../../other/proppedModel';
import AnnoXml from '../../other/annoXml';
import * as channel from '../channel';
import { Quaternion } from '../../other/math';

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
          InfoImporter.commandImportInfo(fileUri.fsPath, openUri[0].fsPath);
        }
      })
    ];

    return disposable;
	}

  public static commandImportInfo(cfgFilePath: string, gltfFilePath: string) {
    channel.show();
    channel.log(`Import from ${path.basename(gltfFilePath)} into ${path.basename(cfgFilePath)}`);

    const importer = new InfoImporter();
    importer.importInfo(cfgFilePath, gltfFilePath);
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

    const hitboxes = model.getHitBoxes();
    if (hitboxes && hitboxes.length > 0) {
      xml.ensureSection('Info', [ { } ]);
      channel.log(`${hitboxes.length} hitboxes found`);

      xml.remove('//Info/IntersectBox', true);
      for (let hitbox of hitboxes) {
        const parent = xml.findElement('//Info'); 
        if (parent) {
          /* eslint-disable @typescript-eslint/naming-convention */
          parent.createChild('IntersectBox', { after: [ 'IntersectBox', 'DisableFeedbackArea', 'MeshBoundingBox', 'BoundingBox' ] }).set({
            Name: hitbox.name,
            Position: hitbox.center.toFixedF(),
            Rotation: Quaternion.default.toFixedF(0),
            Extents: hitbox.size.div(2).toFixedF()
          });
          /* eslint-enable @typescript-eslint/naming-convention */
        }
        else {
          console.error(`ensureSection should have created //Info`);
        }
      }
    }
    else {
      channel.log('No node/mesh starting with \'hitbox\' found. Skip hitboxes');
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