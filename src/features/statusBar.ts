import * as vscode from 'vscode';
import * as utils from '../other/utils';
import * as anno from '../anno';

export function activate(context: vscode.ExtensionContext) {
  let gameVersion = utils.GameVersion.Auto;

  const openFilePath = vscode.window.activeTextEditor?.document.uri.fsPath;
  if (openFilePath) {
    gameVersion = anno.ModInfo.readVersion(utils.findModRoot(openFilePath));
  }
  vscode.commands.executeCommand('setContext', 'anno-modding-tools.gameVersion', gameVersion);
  context.workspaceState.update("anno-modding-tools.gameVersion", gameVersion);

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  statusBarItem.text = utils.gameVersionName(gameVersion);
  statusBarItem.tooltip = 'Click to deploy mod';
  statusBarItem.command = 'anno-modding-tools.buildMod';
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);

  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor?.document) {
      gameVersion = anno.ModInfo.readVersion(utils.findModRoot(editor.document.uri.fsPath));
      vscode.commands.executeCommand('setContext', 'anno-modding-tools.gameVersion', gameVersion);
      context.workspaceState.update("anno-modding-tools.gameVersion", gameVersion);
      statusBarItem.text = utils.gameVersionName(gameVersion);
      statusBarItem.tooltip = editor.document.uri.fsPath;
    }
  });
}