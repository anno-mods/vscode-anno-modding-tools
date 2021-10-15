import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as child from 'child_process';

import * as channel from '../other/outputChannel';
import { Dds } from '../other/dds';

export class TextureConverter {
  public getName() {
    return 'texture';
  }

  public run(files: string[], sourceFolder: string, outFolder: string, options: { context: vscode.ExtensionContext, cache: string, converterOptions: any }) {
    const converterPath = options.context.asAbsolutePath("./external/texconv.exe");
    
    for (const file of files) {
      const lodLevels = Math.max(0, Math.min(9, options.converterOptions.lods || 3));
      const sourceFile = path.join(sourceFolder, file);
      channel.log(`convert with ${lodLevels||'no'} LODs ${sourceFile}`);

      try {
        if (!fs.existsSync(path.dirname(path.join(outFolder, file)))) {
          fs.mkdirSync(path.dirname(path.join(outFolder, file)), { recursive: true });
        }
        if (!fs.existsSync(path.dirname(path.join(options.cache, file)))) {
          fs.mkdirSync(path.dirname(path.join(options.cache, file)), { recursive: true });
        }

        const dirname = path.dirname(file);
        const basename = path.basename(file, '.png');

        const lodFilePaths = [];
        if (lodLevels === 0) {
          // lods disabled, don't change file name
          lodFilePaths.push(path.join(outFolder, dirname, basename + '.dds'));
        }
        else {
          for (let lodLevel = 0; lodLevel < lodLevels; lodLevel++) {
            lodFilePaths.push(path.join(outFolder, dirname, basename + '_' + lodLevel + '.dds'));
          }
        }

        // save first target
        const tmpFilePath = path.join(options.cache, dirname);
        const res = child.execFileSync(converterPath, [
          '-y', '-f', 'BC7_UNORM', '-srgbo', '-srgbi',
          sourceFile, 
          '-o', tmpFilePath
        ]);
        // unfortunately, texconv doesn't allow to change the output file name
        fs.renameSync(path.join(tmpFilePath, basename + '.dds'), lodFilePaths[0]);

        // generate lods by reading out previous .dds mipmaps
        if (lodFilePaths.length > 1) {
          this._extractLodsFromDds(lodFilePaths.shift() as string, lodFilePaths);
        }
      }
      catch (exception: any)
      {
        channel.error('error while converting: ' + sourceFile);
        channel.error(exception.message);
      }
    }
  }

  private _extractLodsFromDds(source: string, targets: string[]) {
    const dds = Dds.fromFile(source);
    if (!dds) {
      return;
    }
    
    const mipmaps = dds.images;
    let width = dds.width;
    let height = dds.height;
    for (let level = 0; level < targets.length && width > 1 && height > 1; level++) {
      // go one mipmap down
      mipmaps.shift();
      if (mipmaps.length === 0) {
        channel.warn(`skip lod ${width} ${height} because of missing source mipmap`);
        break; // no mipmaps available
      }
      width = Math.floor((width + 1) / 2);
      height = Math.floor((height + 1) / 2);
      // dump
      fs.writeFileSync(targets[level], Buffer.concat([ 
        dds.getModifiedHeader(width, height, dds.mipmaps - level - 1), 
        ...dds.images
      ]));
    }
  }
}
