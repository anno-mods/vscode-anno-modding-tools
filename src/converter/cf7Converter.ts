import * as fs from 'fs';
import * as path from 'path';
import * as child from 'child_process';
import * as vscode from 'vscode';

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
      try {
        if (!fs.existsSync(path.dirname(path.join(outFolder, file)))) {
          fs.mkdirSync(path.dirname(path.join(outFolder, file)), { recursive: true });
        }
        const newFileName = path.join(path.dirname(file), path.basename(file, '.cf7') + '.fc');
        console.log('cf7 -> fc: ' + path.join(outFolder, newFileName));
        const res = child.execFileSync(converterPath, ['-y', '-o', path.join(outFolder, newFileName), '-w', path.join(sourceFolder, file)]);
        console.log(res.toString());
      }
      catch (exception)
      {
        console.warn('error while converting: ' + path.join(sourceFolder, file));
      }
    }
  }
}