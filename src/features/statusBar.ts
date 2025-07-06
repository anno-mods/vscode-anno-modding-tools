import * as path from 'path';
import * as vscode from 'vscode';

import * as anno from '../anno';
import * as annoContext from '../editor/modContext';
import * as utils from '../other/utils';

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);

  updateStatusBarItem(context, statusBarItem, annoContext.get().modinfo);

  context.subscriptions.push(statusBarItem);

  annoContext.onDidChangeActiveTextEditor(modContext => {
    updateStatusBarItem(context, statusBarItem, modContext?.modinfo);
  });
}

function updateStatusBarItem(context: vscode.ExtensionContext,
  statusBarItem: vscode.StatusBarItem,
  modinfo?: anno.ModInfo) {

  let gameVersion = modinfo?.game ?? utils.GameVersion.Auto;

  vscode.commands.executeCommand('setContext', 'anno-modding-tools.gameVersion', gameVersion);
  context.workspaceState.update("anno-modding-tools.gameVersion", gameVersion);
  statusBarItem.text = utils.gameVersionName(gameVersion);

  if (modinfo?.path) {
    statusBarItem.tooltip = `Deploy \`${modinfo?.id}\` to mod folder`;
    statusBarItem.command = {
      command: 'anno-modding-tools.buildMod',
      title: statusBarItem.tooltip,
      arguments: [vscode.Uri.file(path.join(modinfo?.path, 'Modinfo.Json'))]
    };
  }
  else {
    statusBarItem.tooltip = `\`${modinfo?.id}\``;
    statusBarItem.command = undefined;
  }

  if (gameVersion === utils.GameVersion.Auto) {
    statusBarItem.hide();
  }
  else {
    statusBarItem.show();
  }
}