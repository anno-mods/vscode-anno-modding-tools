import * as vscode from 'vscode';
import * as child from 'child_process';

/*
uses AnnoFCConverter from https://github.com/taubenangriff/AnnoFCConverter/
*/

export class FcConverter {
	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const converterPath = context.asAbsolutePath("./external/AnnoFCConverter.exe");

    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.convertFcCf7', (fileUri) => {
        if (fileUri) {
          const res = child.execFileSync(converterPath, ['-y', '-r', fileUri.fsPath]);
          console.log(res.toString());
        }
      }),
      vscode.commands.registerCommand('anno-modding-tools.convertCf7Fc', (fileUri) => {
        if (fileUri) {
          const res = child.execFileSync(converterPath, ['-y', '-w', fileUri.fsPath]);
          console.log(res.toString());
        }
      })
    ];

    return disposable;
	}
}