import * as fs from 'fs';
import * as path from 'path';
import { Converter } from '../Converter';

export class AssetsConverter extends Converter {
  public getName() {
    return 'assets';
  }

  public async run(files: string[], sourceFolder: string, outFolder: string, options: {}) {
    const targetFile = path.join(outFolder, "data/config/export/main/asset/assets.xml");
    const sourceFile = path.join(sourceFolder, "data/config/export/main/asset/assets_.xml");
    const dontCopy = path.join(outFolder, "data/config/export/main/asset/assets_.xml");

    try {
      if (fs.existsSync(path.dirname(sourceFile))) {
        if (!fs.existsSync(path.dirname(targetFile))) {
          fs.mkdirSync(path.dirname(targetFile), { recursive: true });
        }

        fs.copyFileSync(sourceFile, targetFile);
        fs.appendFileSync(targetFile, "\r<!-- force cache refresh: " + Date.now() + " -->\r");
        if (fs.existsSync(dontCopy)) {
          fs.rmSync(dontCopy);
        }
        this._logger.log(`  <> ${path.basename(targetFile)}`);
      }
    }
    catch (exception: any)
    {
      this._logger.error(exception.message);
      return false;
    }

    return true;
  }
}
