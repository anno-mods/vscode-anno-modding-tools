import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as xmldoc from 'xmldoc';
import ProppedModel from '../other/proppedModel';
import AnnoXml from '../other/annoXml';
import * as channel from '../other/outputChannel';

export class FcImporter {
  insertPropContainer: xmldoc.XmlElement | undefined = undefined;

	public static register(context: vscode.ExtensionContext) {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.importFeedback', async (fileUri) => {
        const modelFile = FcImporter._findModelFile(fileUri.fsPath);

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
          const importer = new FcImporter();
          const model = ProppedModel.fromFile(openUri[0].fsPath);
          const xml = AnnoXml.fromFile(fileUri.fsPath);

          channel.show();
          channel.log(`Import from ${path.basename(openUri[0].fsPath)} into ${path.basename(fileUri.fsPath)}`);

          importer.importFeedback(xml, model);

          fs.writeFileSync(fileUri.fsPath, xml.toString());
        }
      })
    ];

    return disposable;
	}

  public importFeedback(xml: AnnoXml, model: ProppedModel) {
    // update existing particles
    for (let feedback of model.getFeedbacks()) {
      const feedbackName = feedback.Name.substr(3);

      channel.log(`Import feedback ${feedbackName} position and orientation`);
      const path = `//DummyRoot/Groups/i/Dummies/i[Name=${feedbackName}]`;
      const element = xml.findElement(path, { silent: true }) || xml.findElement(`//DummyRoot/Dummies/i[Name=${feedbackName}]`);
      if (element) {
        element.findElement('//Position')?.set(feedback.Position);
        element.findElement('//Orientation')?.set(feedback.Orientation);
        /* eslint-disable-next-line @typescript-eslint/naming-convention */
        element.set({ RotationY: feedback.RotationY });
      }
    }
  }

  private static _findModelFile(cfgFilePath: string) {
    const dirname = path.dirname(cfgFilePath);
    const basename = path.basename(cfgFilePath, '.cfg');
    
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