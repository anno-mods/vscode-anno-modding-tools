import * as vscode from 'vscode';
import * as child from 'child_process';

import * as channel from '../other/outputChannel';
import * as utils from '../other/utils';

/*
uses AnnoFCConverter from https://github.com/taubenangriff/AnnoFCConverter/
*/

export class FcConverter {
	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const converterPath = context.asAbsolutePath("./external/AnnoFCConverter.exe");

    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.convertFcCf7', (fileUri) => {
        if (fileUri) {
          const res = child.execFileSync(converterPath, [
            '-r', fileUri.fsPath, 
            '-o', utils.dontOverwrite(utils.swapExtension(fileUri.fsPath, '.fc', '.cf7'), '.cf7')
          ]);
          channel.log(res.toString());
        }
      }),
      vscode.commands.registerCommand('anno-modding-tools.convertCf7Fc', (fileUri) => {
        if (fileUri) {
          const res = child.execFileSync(converterPath, [
            '-w', fileUri.fsPath,
            '-o', utils.dontOverwrite(utils.swapExtension(fileUri.fsPath, '.cf7', '.fc'), '.fc')
          ]);
          channel.log(res.toString());
        }
      })
    ];

    return disposable;
	}
}