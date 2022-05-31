import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import * as channel from '../channel';
import { GltfConverter } from '../../builder/converter/gltf';
import * as utils from '../../other/utils';

/*
uses rdm4-bin from https://github.com/lukts30/rdm4
*/

export class GltfRdmConverter {
	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const rdmPath = context.asAbsolutePath("./external/rdm4-bin.exe");
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.convertGltfToRdm', async (fileUri) => {
        if (fileUri) {
          const uri = vscode.window.activeTextEditor?.document?.uri;
          const config = vscode.workspace.getConfiguration('anno', uri);

          const cache = path.join(path.dirname(fileUri.fsPath), '.gtlfconvert');

          const converter = new GltfConverter();
          converter.init(channel, context.asAbsolutePath);
          await converter.run([ path.basename(fileUri.fsPath) ], path.dirname(fileUri.fsPath), path.dirname(fileUri.fsPath), {
            cache,
            converterOptions: {
              animPath: utils.swapExtension(path.basename(fileUri.fsPath), '') + '-anim/'
            }
          });

          fs.rmdirSync(cache, { recursive: true });
        }
      }),
    ];

    return disposable;
	}
}