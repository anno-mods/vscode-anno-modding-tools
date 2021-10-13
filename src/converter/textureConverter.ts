import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as child from 'child_process';

import * as channel from '../other/outputChannel';

export class TextureConverter {
  public getName() {
    return 'texture';
  }

  public run(files: string[], sourceFolder: string, outFolder: string, options: { context: vscode.ExtensionContext, cache: string, converterOptions: any }) {
    const converterPath = options.context.asAbsolutePath("./external/texconv.exe");
    
    for (const file of files) {
      const sourceFile = path.join(sourceFolder, file);

      try {
        if (!fs.existsSync(path.dirname(path.join(outFolder, file)))) {
          fs.mkdirSync(path.dirname(path.join(outFolder, file)), { recursive: true });
        }
        if (!fs.existsSync(path.dirname(path.join(options.cache, file)))) {
          fs.mkdirSync(path.dirname(path.join(options.cache, file)), { recursive: true });
        }

        const dirname = path.dirname(file);
        const basename = path.basename(file, '.png');

        const lodLevels = Math.max(0, Math.min(9, options.converterOptions.lods || 3));

        if (lodLevels === 0) {
          // lods disabled, don't change file name
          const res = child.execFileSync(converterPath, [ 
            '-y', '-f', 'BC7_UNORM',
            sourceFile, 
            '-o', path.join(outFolder, dirname)
          ]);
        }
        else {
          for (let lodLevel = 0; lodLevel < lodLevels; lodLevel++) {
            const lodname = path.join(dirname, basename + '_' + lodLevel);
            fs.copyFileSync(sourceFolder + file, path.join(options.cache, lodname) + '.png');
            const res = child.execFileSync(converterPath, [
              '-y', '-f', 'BC7_UNORM', '-srgbo', '-srgbi',
              path.join(options.cache, lodname) + '.png', 
              '-o', path.join(outFolder, dirname)
            ]);
          }
        }
        console.info(sourceFile);
      }
      catch (exception: any)
      {
        channel.log('error while converting: ' + sourceFile);
        channel.log(exception.message);
      }
    }
  }
}