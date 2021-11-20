import * as path from 'path';
import { Converter } from '../Converter';

import * as utils from '../../other/utils';
import * as rdp from '../../other/rdp';

export class RdpxmlConverter extends Converter {
  public getName() {
    return 'rdpxml';
  }

  public async run(files: string[], sourceFolder: string, outFolder: string, options: {
    cache: string, converterOptions: any
  }) {
    for (const file of files) {
      this._logger.log(`  => ${file}`);
      try {
        const dirname = path.dirname(file);
        const basename = path.basename(file, '.rdp.xml');

        utils.ensureDir(path.join(outFolder, dirname));

        const sourceFile = path.join(sourceFolder, file);
        const targetFile = path.join(outFolder, dirname, basename + '.rdp');
        await rdp.xmlToRdp(sourceFile, path.dirname(targetFile));
        this._logger.log(`  <= ${path.relative(path.join(outFolder), targetFile)}`);
      }
      catch (exception: any)
      {
        this._logger.error(exception);
        return false;
      }
    }
    return true;
  }
}
