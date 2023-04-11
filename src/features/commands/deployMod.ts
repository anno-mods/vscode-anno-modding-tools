import * as vscode from 'vscode';
import * as path from 'path';
import * as glob from 'glob';

import * as channel from '../channel';
import { ModBuilder } from '../../builder';

export class DeployModCommand {
  context: vscode.ExtensionContext;

	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.copyMod', async (fileUri) => {
        await DeployModCommand._commandCompileMod(fileUri?.fsPath, context);
      }),
    ];

    return disposable;
	}

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static async _commandCompileMod(filePath: string | undefined, context: vscode.ExtensionContext) {
    let mods;
    if (!filePath) {
      return;
    }

    mods = [ { label: path.basename(filePath), detail: filePath } ];

    const selectedMods = [];
    selectedMods.push(mods[0]);

    const uri = vscode.window.activeTextEditor?.document?.uri;
    const config = vscode.workspace.getConfiguration('anno', uri);
    const annoMods: string = config.get('modsFolder') || "";
    const annoRda: string = config.get('rdaFolder') || "";

    channel.show();
    const builder = new ModBuilder(channel, context.asAbsolutePath, { annoMods, annoRda });
    for (const mod of selectedMods) {
      if (!await builder.build(mod.detail as string)) {
        console.error('building mods failed');
        break;
      }
    }
  }
}
