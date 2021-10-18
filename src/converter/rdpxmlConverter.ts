import * as fs from 'fs';
import * as path from 'path';
import * as child from 'child_process';
import * as vscode from 'vscode';

import * as channel from '../other/outputChannel';
import * as utils from '../other/utils';
import * as rdp from '../other/rdp';

export class RdpxmlConverter {
  public getName() {
    return 'rdpxml';
  }

  public async run(files: string[], sourceFolder: string, outFolder: string, options: { context: vscode.ExtensionContext, cache: string, converterOptions: any }) {
    for (const file of files) {
      channel.log(`  => ${file}`);
      try {
        const dirname = path.dirname(file);
        const basename = path.basename(file, '.rdp.xml');

        utils.ensureDir(path.join(outFolder, dirname));

        const sourceFile = path.join(sourceFolder, file);
        const targetFile = path.join(outFolder, dirname, basename + '.rdp');
        await rdp.xmlToRdp(sourceFile, path.dirname(targetFile));
        channel.log(`  <= ${path.relative(path.join(outFolder), targetFile)}`);
      }
      catch (exception: any)
      {
        channel.warn(exception);
      }
    }
  }
}