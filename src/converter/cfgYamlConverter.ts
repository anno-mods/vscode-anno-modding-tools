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

  public async run(files: string[], sourceFolder: string, outFolder: string, options: { context: vscode.ExtensionContext }) {
    const converterPath = options.context.asAbsolutePath("./external/AnnoFCConverter.exe");

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
          
          const sourceCfgPath = path.join(sourceDirname, variantSourceName);
          if (fs.existsSync(sourceCfgPath)) {
            const sourcePathWithoutExt = path.join(sourceDirname, path.basename(variantSourceName, '.cfg'));
            const targetPathWithoutExt = path.join(targetDirname, basename);
            
            // ifo and fc can just be copied
            for (let ext of [ '.ifo', '.fc' ]) {
              if (this._copyIfExists(sourcePathWithoutExt + ext, targetPathWithoutExt + ext)) {
                channel.log(`  <= ${path.basename(targetPathWithoutExt)}${ext}`);
              }
            }

            // consider cf7 as well
            if (fs.existsSync(sourcePathWithoutExt + '.cf7')) {
              child.execFileSync(converterPath, ['-y', '-o', targetPathWithoutExt + '.fc', '-w', sourcePathWithoutExt + '.cf7']);
              channel.log(`  <= ${path.basename(targetPathWithoutExt)}.fc`);
            }

            // cfg needs some changes
            const cfgContent = AnnoXml.fromFile(sourcePathWithoutExt + '.cfg');
            for (let modification of content.variant.modifications) {
              // overwrite all values except xpath
              const { xpath, ...values } = modification;
              cfgContent.set(modification.xpath, values);
            }
            fs.writeFileSync(targetPathWithoutExt + '.cfg', cfgContent.toString());
            channel.log(`  <= ${path.basename(targetPathWithoutExt)}.cfg`);
          }
          else {
            channel.warn(`    ${sourceCfgPath} does not exist.`);
          }
        }
        else {
          console.log(content);
        }
      }
      catch (exception: any)
      {
        channel.error(exception.message);
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
}