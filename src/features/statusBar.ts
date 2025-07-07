import * as path from 'path';
import * as vscode from 'vscode';

import * as modContext from '../editor/modContext';
import * as utils from '../other/utils';

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);

  updateStatusBarItem(context, statusBarItem, modContext.get());

  context.subscriptions.push(statusBarItem);

  modContext.onDidChangeActiveTextEditor(e => {
    updateStatusBarItem(context, statusBarItem, e);
  });
}

function updateStatusBarItem(context: vscode.ExtensionContext,
  statusBarItem: vscode.StatusBarItem,
  modContext: modContext.ModContext) {

  const gameVersion = modContext.version;
  const modinfo = modContext.modinfo;

  vscode.commands.executeCommand('setContext', 'anno-modding-tools.gameVersion', gameVersion);
  context.workspaceState.update("anno-modding-tools.gameVersion", gameVersion);

  const versionName = utils.gameVersionName(gameVersion);

  if (modinfo?.path) {
    statusBarItem.tooltip = `Deploy to mod folder`;
    statusBarItem.command = {
      command: 'anno-modding-tools.buildMod',
      title: statusBarItem.tooltip,
      arguments: [vscode.Uri.file(path.join(modinfo?.path, 'modinfo.json'))]
    };
    statusBarItem.text = `${versionName}: ${modinfo.id}`;
  }
  else {
    statusBarItem.tooltip = undefined;
    statusBarItem.command = undefined;
    statusBarItem.text = versionName;
  }

  if (gameVersion === utils.GameVersion.Auto) {
    statusBarItem.hide();
  }
  else {
    statusBarItem.show();
  }
}