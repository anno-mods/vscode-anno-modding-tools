import * as fs from 'fs';
import * as path from 'path';
import * as child from 'child_process';
import * as vscode from 'vscode';

import * as channel from '../other/outputChannel';

/*
uses AnnoFCConverter from https://github.com/taubenangriff/AnnoFCConverter/
*/

export class Cf7Converter {
  public getName() {
    return 'cf7';
  }

  public async run(files: string[], sourceFolder: string, outFolder: string, options: { context: vscode.ExtensionContext }) {
    const converterPath = options.context.asAbsolutePath("./external/AnnoFCConverter.exe");

    for (const file of files) {
      channel.log(`  => ${file}`);
      try {
        if (!fs.existsSync(path.dirname(path.join(outFolder, file)))) {
          fs.mkdirSync(path.dirname(path.join(outFolder, file)), { recursive: true });
        }
        const fcFilePath = path.join(path.dirname(file), path.basename(file, '.cf7') + '.fc');
        const res = child.execFileSync(converterPath, ['-y', '-o', path.join(outFolder, fcFilePath), '-w', path.join(sourceFolder, file)]);
        // TODO handle errors
        channel.log(`  <= ${fcFilePath}`);
      }
      catch (exception: any)
      {
        console.warn(exception);
      }
    }
  }
}