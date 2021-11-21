import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as child from 'child_process';
import { Converter } from '../Converter';

import * as utils from '../../other/utils';
import AnnoXml from '../../other/annoXml';

export class CfgYamlConverter extends Converter {
  _variables: { [index: string]: string } = {};

  public getName() {
    return 'cfgyaml';
  }

  public async run(files: string[], sourceFolder: string, outFolder: string, options: { variables?: { [index: string]: string }, dontOverwrite?: boolean }) {
    const converterPath = this._asAbsolutePath("./external/AnnoFCConverter.exe");
    const _dontOverwrite = options.dontOverwrite ? utils.dontOverwrite : (fp: string) => fp;
    this._variables = options.variables || {};

    for (const file of files) {
      this._logger.log(`  => ${file}`);
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
                this._logger.log(`  <= ${path.basename(targetPathWithoutExt)}.fc`);
              }
              catch {
                this._logger.warn(`     AnnoFCConverter failed to write ${path.basename(targetPathWithoutExt)}.fc`);
              }
            }
            // then fc
            else {
              if (this._copyIfExists(sourcePathWithoutExt + '.fc', _dontOverwrite(targetPathWithoutExt + '.fc', '.fc'))) {
                this._logger.log(`  <= ${path.basename(targetPathWithoutExt)}.fc`);
              }
            }

            // read and modify cfg
            const cfgContent = AnnoXml.fromFile(sourcePathWithoutExt + '.cfg');
            this._runModifications(cfgContent, content.variant.modifications);
            fs.writeFileSync(_dontOverwrite(targetPathWithoutExt + '.cfg', '.cfg'), cfgContent.toString());
            this._logger.log(`  <= ${path.basename(targetPathWithoutExt)}.cfg`);
            
            // read and modify ifo
            if (fs.existsSync(sourcePathWithoutExt + '.ifo')) {
              const ifoContent = AnnoXml.fromFile(sourcePathWithoutExt + '.ifo');
              this._runModifications(ifoContent, content.variant.ifo);
              fs.writeFileSync(_dontOverwrite(targetPathWithoutExt + '.ifo', '.ifo'), ifoContent.toString());
              this._logger.log(`  <= ${path.basename(targetPathWithoutExt)}.ifo`);
            }
          }
          else {
            this._logger.warn(`    ${sourceCfgPath} does not exist.`);
          }
        }
      }
      catch (exception: any)
      {
        this._logger.error(exception.message);
        return false;
      }
    }
    return true;
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
          this._logger.warn(`cannot find ${modification.xpath}`);
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
    // const uri = vscode.window.activeTextEditor?.document?.uri;
    // const config = vscode.workspace.getConfiguration('anno', uri);

    if (this._variables['annoRda']) {
      variantSourceName = path.normalize(variantSourceName.replace('${annoRda}', this._variables['annoRda'] || ""));
    }
    if (!path.isAbsolute(variantSourceName)) {
      variantSourceName = path.join(sourceDirname, variantSourceName);
    }
    return variantSourceName;
  }
}
