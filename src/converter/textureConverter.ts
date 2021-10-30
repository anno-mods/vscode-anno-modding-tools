import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import * as channel from '../other/outputChannel';
import * as dds from '../other/dds';
import * as utils from '../other/utils';

export class TextureConverter {
  public getName() {
    return 'texture';
  }

  public async run(files: string[], sourceFolder: string, outFolder: string, options: { context: vscode.ExtensionContext, cache: string, converterOptions: any }) {
    for (const file of files) {
      channel.log(`  => ${file}`);
      const lodLevels = Math.max(0, Math.min(9, options.converterOptions.lods === undefined ? 3 : options.converterOptions.lods));
      const changePath = options.converterOptions.changePath || '';
      const maskEnding = options.converterOptions.maskEnding || '_mask.png';
      const sourceFile = path.join(sourceFolder, file);

      try {
        const dirname = path.dirname(file);
        const basename = path.basename(file, '.png');

        utils.ensureDir(path.join(outFolder, dirname, changePath));
        utils.ensureDir(path.join(options.cache, dirname));

        const lodFilePaths = [];
        if (lodLevels === 0) {
          // lods disabled, don't change file name
          lodFilePaths.push(path.join(outFolder, dirname, changePath, basename + '.dds'));
        }
        else {
          for (let lodLevel = 0; lodLevel < lodLevels; lodLevel++) {
            lodFilePaths.push(path.join(outFolder, dirname, changePath, basename + '_' + lodLevel + '.dds'));
          }
        }

        // save first target
        const tmpFilePath = path.join(options.cache, dirname);
        dds.convertToTexture(sourceFile, tmpFilePath, sourceFile.endsWith(maskEnding) ? dds.TextureFormat.bc1Unorm : dds.TextureFormat.bc7Unorm);
        // unfortunately, texconv doesn't allow to change the output file name
        fs.renameSync(path.join(tmpFilePath, basename + '.dds'), lodFilePaths[0]);
        channel.log(`  <= ${lodLevels ? `LOD ${0}: ` : ''}${path.relative(path.dirname(file), path.relative(outFolder, lodFilePaths[0]))}`);

        // generate lods by reading out previous .dds mipmaps
        if (lodFilePaths.length > 1) {
          this._extractLodsFromDds(lodFilePaths.shift() as string, lodFilePaths, path.join(outFolder, dirname));
        }
      }
      catch (exception: any)
      {
        channel.error(exception.message);
      }
    }
  }

  private _extractLodsFromDds(source: string, targets: string[], outFolder: string) {
    const texture = dds.Texture.fromFile(source);
    if (!texture) {
      return;
    }
    
    const mipmaps = texture.images;
    let width = texture.width;
    let height = texture.height;
    for (let level = 0; level < targets.length && width > 1 && height > 1; level++) {
      // go one mipmap down
      mipmaps.shift();
      if (mipmaps.length === 0) {
        channel.warn(`     LOD ${level + 1}: Skip LOD for ${width}x${height} because of missing source mipmap.`);
        break; // no more mipmaps available
      }
      width = Math.floor((width + 1) / 2);
      height = Math.floor((height + 1) / 2);
      // dump
      fs.writeFileSync(targets[level], Buffer.concat([ 
        texture.getModifiedHeader(width, height, texture.mipmaps - level - 1), 
        ...texture.images
      ]));
      channel.log(`  <= LOD ${level + 1}: ${path.relative(outFolder, targets[level])}`);
    }
  }
}
