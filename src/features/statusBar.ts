import * as vscode from 'vscode';
import * as anno from '../anno';
import * as annoContext from '../editor/modContext';
import * as utils from '../other/utils';

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  statusBarItem.command = 'anno-modding-tools.buildMod';

  updateStatusBarItem(context, statusBarItem, annoContext.getCurrent().modinfo);

  context.subscriptions.push(statusBarItem);

  annoContext.onDidChangeActiveTextEditor(editor => {
    updateStatusBarItem(context, statusBarItem, editor?.modinfo);
  });
}

function updateStatusBarItem(context: vscode.ExtensionContext,
  statusBarItem: vscode.StatusBarItem,
  modinfo?: anno.ModInfo) {

  let gameVersion = modinfo?.game ?? utils.GameVersion.Auto;

  vscode.commands.executeCommand('setContext', 'anno-modding-tools.gameVersion', gameVersion);
  context.workspaceState.update("anno-modding-tools.gameVersion", gameVersion);
  statusBarItem.text = utils.gameVersionName(gameVersion);
  statusBarItem.tooltip = `Deploy \`${modinfo?.id}\` to mod folder`;

  if (gameVersion === utils.GameVersion.Auto) {
    statusBarItem.hide();
  }
  else {
    statusBarItem.show();
  }
}