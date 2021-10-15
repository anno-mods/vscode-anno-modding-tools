import * as vscode from 'vscode';
import * as path from 'path';
import * as dds from '../other/dds';

export class DdsConverter {
	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.pngToDds', (fileUri) => {
        if (fileUri) {
          dds.convertToTexture(fileUri.fsPath, path.dirname(fileUri.fsPath));
        }
      }),
      vscode.commands.registerCommand('anno-modding-tools.ddsToPng', (fileUri) => {
        if (fileUri) {
          dds.convertToImage(fileUri.fsPath, path.dirname(fileUri.fsPath));
        }
      })
    ];

    return disposable;
	}
}