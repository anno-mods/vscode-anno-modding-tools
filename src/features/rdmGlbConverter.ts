import * as vscode from 'vscode';
import * as child from 'child_process';
import * as path from 'path';

/*
uses rdm4-bin from https://github.com/lukts30/rdm4
*/

export class RdmGlbConverter {
	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const rdmPath = context.asAbsolutePath("./external/rdm4-bin.exe");
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.convertRdmToGlb', (fileUri) => {
        if (fileUri) {
          try {
            const sourceFile = fileUri.fsPath;
            const res = child.execFileSync(rdmPath, [
              '-n',
              '-o',
              path.dirname(sourceFile),
              '-i', 
              sourceFile        
            ]);
          }
          catch (exception: any)
          {
            console.warn('error while converting: ' + fileUri.fsPath);
            console.log(exception.message);
          }
        }
      }),
    ];

    return disposable;
	}
}