import * as path from 'path';
import * as vscode from 'vscode';

import * as channel from '../channel';
import { CfgYamlConverter } from '../../builder/converter/cfgyaml';
import { ModCache } from '../../builder/ModCache';

export class CfgYamlCommands {
  public static register(context: vscode.ExtensionContext) {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.cfgyamlToCfg', async (fileUri) => {
        if (fileUri) {
          const config = vscode.workspace.getConfiguration('anno');
          const annoRda: string = config.get('rdaFolder') || "";

          const converter = new CfgYamlConverter();
          converter.init(channel, context.asAbsolutePath);
          converter.run([ path.basename(fileUri.fsPath) ], path.dirname(fileUri.fsPath), path.dirname(fileUri.fsPath), {
            dontOverwrite: true,
            modCache: new ModCache('', ''),
            variables: { annoRda }
          });
        }
      })
    ];

    return disposable;
	}
}
