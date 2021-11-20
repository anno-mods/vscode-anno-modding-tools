import * as fs from 'fs';
import * as path from 'path';
import { Converter } from '../Converter';

export class StaticConverter extends Converter {
  public getName() {
    return 'static';
  }

  public async run(files: string[], sourceFolder: string, outFolder: string, options: {}) {
    for (const file of files) {
      const targetFile = path.join(outFolder, file);
      const sourceFile = path.join(sourceFolder, file);
      
      try {
        if (!fs.existsSync(path.dirname(targetFile))) {
          fs.mkdirSync(path.dirname(targetFile), { recursive: true });
        }
        fs.copyFileSync(sourceFile, targetFile);
        this._logger.log(`  <> ${file}`);
      }
      catch (exception: any)
      {
        this._logger.error(exception.message);
        return false;
      }
    }
    return true;
  }
}
