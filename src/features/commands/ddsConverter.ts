import * as vscode from 'vscode';
import * as path from 'path';
import * as dds from '../../other/dds';
import * as utils from '../../other/utils';

export class DdsConverter {
	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.pngToDds', (fileUri) => {
        if (fileUri) {
          utils.dontOverwriteFolder(fileUri.fsPath, '.dds', (source, targetFolder) => {
            dds.convertToTexture(source, targetFolder);
          });
        }
      }),
      vscode.commands.registerCommand('anno-modding-tools.ddsToPng', (fileUri) => {
        if (fileUri) {
          utils.dontOverwriteFolder(fileUri.fsPath, '.png', (source, targetFolder) => {
            dds.convertToImage(source, targetFolder);
          });
        }
      })
    ];

    return disposable;
	}
}