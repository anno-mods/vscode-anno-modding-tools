import * as vscode from 'vscode';
import * as path from 'path';
import * as glob from 'glob';

import * as channel from '../channel';
import { ModBuilder } from '../../builder';

export class AnnomodCommands {
  context: vscode.ExtensionContext;

	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.buildMod', async (fileUri) => {
        await AnnomodCommands._commandCompileMod(fileUri?.fsPath, context);
      }),
    ];

    return disposable;
	}

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static async _commandCompileMod(filePath: string | undefined, context: vscode.ExtensionContext) {
    let mods;
    if (filePath) {
      mods = [ { label: path.basename(filePath), detail: filePath } ];
    }
    else {
      mods = AnnomodCommands._findMods();
      if (mods.length === 0) {
        vscode.window.showWarningMessage('No annomod.json found in workspace to build.');
        return;
      }
    }

    const selectedMods = [];
    if (mods.length > 1) {
      const result = await vscode.window.showQuickPick([{ label: 'All' }, ...mods], {
          title: 'Which project?',
          placeHolder: 'Pick a project'
        });
      if (!result) {
        return;
      }
      if (!result.detail) { // item 'All' has no detail
        selectedMods.push(...mods);
      }
      else {
        selectedMods.push(result);
      }
    }
    else {
      selectedMods.push(mods[0]);
    }

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

  private static _findMods() {
    const mods: vscode.QuickPickItem[] = [];
    const workspaces = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath) || [];
    for (const folder of workspaces) {
      mods.push(...(glob.sync('**/annomod.json', { cwd: folder, nodir: true }).map((e) => ({
        detail: path.join(folder, e),
        label: path.dirname(e)
      }))));
    }
    return mods;
  }
}
