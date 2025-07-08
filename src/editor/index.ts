import * as vscode from 'vscode';

import { GamePaths } from './gamePaths';

export const getModsFolder = GamePaths.getModsFolder;
export const ensureModsFolder = GamePaths.ensureModsFolder;
export const ensureGamePath = GamePaths.ensureGamePath;
export const isGamePathExtracted = GamePaths.isGamePathExtracted;

export const hasGamePath = GamePaths.hasGamePath;
export const getGamePathSetting = GamePaths.getGamePathSetting;
export const onDidChangeGamePath = GamePaths.onDidChangeGamePath;

export function activate(context: vscode.ExtensionContext): vscode.Disposable[] {
  return GamePaths.activate(context);
}
