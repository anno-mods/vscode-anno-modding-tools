import * as path from 'path';
import * as vscode from 'vscode';

import * as channel from '../channel';
import { CfgYamlConverter } from '../../builder/converter/cfgyaml';

export class CfgYamlCommands {
  public static register(context: vscode.ExtensionContext) {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.cfgyamlToCfg', async (fileUri) => {
        if (fileUri) {
          const converter = new CfgYamlConverter();
          converter.init(channel, context.asAbsolutePath);
          converter.run([ path.basename(fileUri.fsPath) ], path.dirname(fileUri.fsPath), path.dirname(fileUri.fsPath), {
            dontOverwrite: true
          });
        }
      })
    ];

    return disposable;
	}
}
