import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as child from 'child_process';

import * as channel from '../other/outputChannel';
import * as utils from '../other/utils';
import AnnoXml from '../other/annoXml';

export class CfgYamlConverter {
  public getName() {
    return 'cfgyaml';
  }

  public static register(context: vscode.ExtensionContext) {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.cfgyamlToCfg', async (fileUri) => {
        if (fileUri) {
          const converter = new CfgYamlConverter();
          converter.run([ path.basename(fileUri.fsPath) ], path.dirname(fileUri.fsPath), path.dirname(fileUri.fsPath), { context, dontOverwrite: true });
        }
      })
    ];

    return disposable;
	}

  public async run(files: string[], sourceFolder: string, outFolder: string, options: { context: vscode.ExtensionContext, dontOverwrite?: boolean }) {
    const converterPath = options.context.asAbsolutePath("./external/AnnoFCConverter.exe");

    const _dontOverwrite = options.dontOverwrite ? utils.dontOverwrite : (fp: string) => fp;

    for (const file of files) {
      channel.log(`  => ${file}`);
      const targetFile = path.join(outFolder, file);
      const sourceFile = path.join(sourceFolder, file);
      
      try {
        const sourceDirname = path.dirname(sourceFile);
        const targetDirname = path.dirname(targetFile);
        const basename = path.basename(targetFile, '.cfg.yaml');
        utils.ensureDir(targetDirname);

        const content = yaml.load(fs.readFileSync(sourceFile, 'utf8')) as any;

        if (content?.variant) {
          const variantSourceName = content.variant.source;
          const sourceCfgPath = this._findSourceCfg(sourceDirname, variantSourceName);
          if (fs.existsSync(sourceCfgPath)) {
            const sourcePathWithoutExt = path.join(path.dirname(sourceCfgPath), path.basename(sourceCfgPath, '.cfg'));
            const targetPathWithoutExt = path.join(targetDirname, basename);

            // first try cf7
            if (fs.existsSync(sourcePathWithoutExt + '.cf7')) {
              try {
                child.execFileSync(converterPath, ['-y', '-o', _dontOverwrite(targetPathWithoutExt + '.fc', '.fc'), '-w', sourcePathWithoutExt + '.cf7']);
                channel.log(`  <= ${path.basename(targetPathWithoutExt)}.fc`);
              }
              catch {
                channel.warn(`     AnnoFCConverter failed to write ${path.basename(targetPathWithoutExt)}.fc`);
              }
            }
            // then fc
            else {
              if (this._copyIfExists(sourcePathWithoutExt + '.fc', _dontOverwrite(targetPathWithoutExt + '.fc', '.fc'))) {
                channel.log(`  <= ${path.basename(targetPathWithoutExt)}.fc`);
              }
            }

            // read and modify cfg
            const cfgContent = AnnoXml.fromFile(sourcePathWithoutExt + '.cfg');
            this._runModifications(cfgContent, content.variant.modifications);
            fs.writeFileSync(_dontOverwrite(targetPathWithoutExt + '.cfg', '.cfg'), cfgContent.toString());
            channel.log(`  <= ${path.basename(targetPathWithoutExt)}.cfg`);
            
            // read and modify ifo
            if (fs.existsSync(sourcePathWithoutExt + '.ifo')) {
              const ifoContent = AnnoXml.fromFile(sourcePathWithoutExt + '.ifo');
              this._runModifications(ifoContent, content.variant.ifo);
              fs.writeFileSync(_dontOverwrite(targetPathWithoutExt + '.ifo', '.ifo'), ifoContent.toString());
              channel.log(`  <= ${path.basename(targetPathWithoutExt)}.ifo`);
            }
          }
          else {
            channel.warn(`    ${sourceCfgPath} does not exist.`);
          }
        }
      }
      catch (exception: any)
      {
        channel.error(exception.message);
      }
    }
  }

  private _runModifications(xml: AnnoXml, modifications: any[]) {
    if (!modifications) {
      return;
    }

    for (let modification of modifications) {
      if (modification.xpath) {
        // overwrite all values except xpath
        const { xpath, ...values } = modification;
        if (!xml.set(modification.xpath, values, { all: true })) {
          channel.warn(`cannot find ${modification.xpath}`);
        }
      }
      else if (modification['xpath-remove']) {
        xml.remove(modification['xpath-remove']);
      }
    }
  }

  private _copyIfExists(source: string, target: string) {
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
      return true;
    }

    return false;
  }

  private _findSourceCfg(sourceDirname: string, variantSourceName: string) {
    const uri = vscode.window.activeTextEditor?.document?.uri;
    const config = vscode.workspace.getConfiguration('anno', uri);
    variantSourceName = path.normalize(variantSourceName.replace('${annoRda}', config.get('rdaFolder') || ""));
    if (!path.isAbsolute(variantSourceName)) {
      variantSourceName = path.join(sourceDirname, variantSourceName);
    }
    return variantSourceName;
  }
}