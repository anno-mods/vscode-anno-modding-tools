import * as vscode from 'vscode';
import * as child from 'child_process';
import * as path from 'path';

import * as channel from '../channel';
import * as utils from '../../other/utils';

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
              '-i', sourceFile,       
              '-o', utils.dontOverwrite(utils.swapExtension(sourceFile, '.glb'), '.glb')
            ]);
          }
          catch (exception: any)
          {
            channel.error(exception.message);
          }
        }
      }),
    ];

    return disposable;
	}
}