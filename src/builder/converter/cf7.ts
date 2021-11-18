import * as fs from 'fs';
import * as path from 'path';
import * as child from 'child_process';
import { Converter } from '../Converter';

export class Cf7Converter extends Converter {
  public getName() {
    return 'cf7';
  }

  public async run(files: string[], sourceFolder: string, outFolder: string, options: { }) {
    const converterPath = this._asAbsolutePath("./external/AnnoFCConverter.exe");

    for (const file of files) {
      this._logger.log(`  => ${file}`);
      try {
        if (!fs.existsSync(path.dirname(path.join(outFolder, file)))) {
          fs.mkdirSync(path.dirname(path.join(outFolder, file)), { recursive: true });
        }
        const fcFilePath = path.join(path.dirname(file), path.basename(file, '.cf7') + '.fc');
        const res = child.execFileSync(converterPath, ['-y', '-o', path.join(outFolder, fcFilePath), '-w', path.join(sourceFolder, file)]);
        // TODO handle errors
        this._logger.log(`  <= ${fcFilePath}`);
      }
      catch (exception: any)
      {
        this._logger.warn(exception);
      }
    }
  }
}
