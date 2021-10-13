import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as xmldoc from 'xmldoc';
import ProppedModel, { PROP_DEFAULTS, PROPCONTAINER_DEFAULTS } from '../other/proppedModel';
import AnnoXml from '../other/annoXml';
import * as channel from '../other/outputChannel';

export class PropImporter {
  insertPropContainer: xmldoc.XmlElement | undefined = undefined;

	public static register(context: vscode.ExtensionContext) {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.importProps', async (fileUri) => {
        const modelFile = PropImporter._findModelFile(fileUri.fsPath);

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
          const importer = new PropImporter();
          const model = ProppedModel.fromFile(openUri[0].fsPath);
          const xml = AnnoXml.fromFile(fileUri.fsPath);

          channel.show();
          channel.log(`Import from ${path.basename(openUri[0].fsPath)} into ${path.basename(fileUri.fsPath)}`);

          importer.importProps(xml, model);
          importer.importParticles(xml, model);
          importer.importDecals(xml, model);

          fs.writeFileSync(fileUri.fsPath, xml.toString());
        }
      })
    ];

    return disposable;
	}

  public importProps(xml: AnnoXml, model: ProppedModel) {
    xml.ensureSection('PropContainers.Config.Props', [ 
      { position: 'Models:after' }, 
      { defaults: PROPCONTAINER_DEFAULTS }, 
      { }
    ]);

    // update existing and add new props
    for (let prop of model.getProps()) {
      channel.log(`Import PROP ${prop.Name}`);
      xml.setValue(prop.Name, prop, { insert: 'PropContainers.Config.Props', defaults: PROP_DEFAULTS });
    }
    // mark removed props
    for (let name of xml.getPropNames()) {
      if (!model.getProp(name) && !name.endsWith('_removed')) {
        channel.log(`Mark PROP ${name} as removed`);
        // eslint-disable-next-line @typescript-eslint/naming-convention
        xml.setValue(name, { Name: name + '_removed' });
      }
    }
  }

  public importParticles(xml: AnnoXml, model: ProppedModel) {
    // update existing particles
    for (let particle of model.getParticles()) {
      channel.log(`Import PARTICLE ${particle.Name} Transformer`);

      // this will fetch the first Transformer occurence with Conditions=0
      const path = `/Config/Particles/Config[Name='${particle.Name}']/Transformer/Config[ConfigType='ORIENTATION_TRANSFORM' and Conditions='0']`;
      // TODO create node if necessary
      xml.set(path, particle.Transformer.Config);
    }
  }

  public importDecals(xml: AnnoXml, model: ProppedModel) {
    const decal = model.getDecalExtends();
    if (decal) {
      channel.log(`Import DECAL Extents from node/mesh 'ground'`);

      const path = `/Config/Decals/Config[ConfigType='DECAL']`;
      // don't create, just update
      // TODO only create when ground has texture
      xml.set(path, decal);
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