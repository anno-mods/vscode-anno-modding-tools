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

    const model = ProppedModel.fromFile(gltfFilePath);
    const xml = AnnoXml.fromFile(cfgFilePath);
    const importer = new InfoImporter();
    importer.importHitBoxes(model, xml);
    importer.importDummies(model, xml);
    importer.importBuildBlocker(model, xml);
    importer.importFeedbackBlocker(model, xml);
    importer.importUnevenBlocker(model, xml);
    fs.writeFileSync(cfgFilePath, xml.toString());
  }

  public importHitBoxes(model: ProppedModel, xml: AnnoXml) {
    const hitboxes = model.getHitBoxes();
    if (hitboxes && hitboxes.length > 0) {
      xml.ensureSection('Info', [ { } ]);
      channel.log(`Import IntersectBox from nodes/meshes starting with 'hitbox'`);

      xml.remove('//Info/IntersectBox', { all: true, silent: true });
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
  }

  /** update or add Dummy entries. Does not remove. */
  public importDummies(model: ProppedModel, xml: AnnoXml) {
    const dummies = model.getDummies();
    xml.ensureSection('Info', [ { } ]);
    const parent = xml.findElement('Info');
    if (dummies && parent) {
      channel.log('Import Dummy from nodes/meshes starting with \'dummy_\'');
      for (let dummy of dummies) {
        let dummyNode = parent.findElement(`//Dummy[Name='${dummy.name}']`);
        if (!dummyNode) {
          const afterElements = [ 'Dummy', 'IntersectBox', 'DisableFeedbackArea', 'MeshBoundingBox', 'BoundingBox' ];
          dummyNode = parent.createChild('Dummy', { after: afterElements });
        }
        dummyNode.set({
          /* eslint-disable @typescript-eslint/naming-convention */
          Name: dummy.name,
          Position: dummy.position.toFixedF(),
          Rotation: dummy.rotation.round(1000000).toF(),
          Extents: dummy.extends.round(1000000).toF()
          /* eslint-enable @typescript-eslint/naming-convention */
        });
      }
    }
    else {
      channel.log('No node/mesh starting with \'dummy_\' found. Skip Dummy');
    }
  }

  public importBuildBlocker(model: ProppedModel, xml: AnnoXml) {
    const ground = model.getBuildBlocker();
    if (ground) {
      xml.ensureSection('Info', [ { } ]);
      channel.log('Import BuildBlocker from node/mesh \'ground\'');
      xml.remove('//Info/BuildBlocker', { silent: true });
      const afterElements = [ 'Sequence', 'Dummy', 'IntersectBox', 'DisableFeedbackArea', 'MeshBoundingBox', 'BoundingBox' ];
      xml.findElement('Info')?.createChild('BuildBlocker', { after: afterElements }).fill('Position', ground.map(e => e.toFixedF(1)));
    }
    else {
      channel.log('No \'ground\' node/mesh found. Skip BuildBlocker');
    }
  }

  public importFeedbackBlocker(model: ProppedModel, xml: AnnoXml) {
    const feedbacks = model.getFeedbackBlocker();
    xml.ensureSection('Info', [ { } ]);
    const parent = xml.findElement('Info');
    if (feedbacks && parent) {
      channel.log('Import FeedbackBlocker from nodes/meshes starting with \'FeedbackBlocker\'');
      xml.remove('//Info/FeedbackBlocker', { all: true, silent: true });
      for (let feedback of feedbacks) {
        const afterElements = [ 'FeedbackBlocker', 'BuildBlocker', 'Sequence', 'Dummy', 'IntersectBox', 'DisableFeedbackArea', 'MeshBoundingBox', 'BoundingBox' ];
        parent.createChild('FeedbackBlocker', { after: afterElements }).fill('Position', feedback.map(e => e.round(100).toF()));
      }
    }
    else {
      channel.log('No node/mesh starting with \'FeedbackBlocker\' found. Skip FeedbackBlocker');
    }
  }

  public importUnevenBlocker(model: ProppedModel, xml: AnnoXml) {
    const unevenBlocker = model.getUnevenBlocker();
    if (unevenBlocker) {
      xml.ensureSection('Info', [ { } ]);
      channel.log('Import UnevenBlocker from node/mesh \'UnevenBlocker\'');
      xml.remove('//Info/UnevenBlocker', { silent: true });
      const afterElements = [ 'FeedbackBlocker', 'BuildBlocker', 'Sequence', 'Dummy', 'IntersectBox', 'DisableFeedbackArea', 'MeshBoundingBox', 'BoundingBox' ];
      xml.findElement('Info')?.createChild('UnevenBlocker', { after: afterElements }).fill('Position', unevenBlocker.map(e => e.toFixedF()));
    }
    else {
      channel.log('No \'UnevenBlocker\' node/mesh found. Skip UnevenBlocker');
    }
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