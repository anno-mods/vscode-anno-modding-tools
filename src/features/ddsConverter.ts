import * as vscode from 'vscode';
import * as child from 'child_process';
import * as path from 'path';

export class DdsConverter {
	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const converterPath = context.asAbsolutePath("./external/texconv.exe");
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.pngToDds', (fileUri) => {
        if (fileUri) {
          // try {
            const res = child.execFileSync(converterPath, [fileUri.fsPath, '-y', '-f', 'BC7_UNORM', '-srgbo', '-srgbi', '-o', path.dirname(fileUri.fsPath)]);
          // }
          // catch (exception)
          // {
          //   console.warn('error while converting: ' + fileUri.fsPath);
          // }
        }
      }),
      vscode.commands.registerCommand('anno-modding-tools.ddsToPng', (fileUri) => {
        if (fileUri) {
          // try {
            const res = child.execFileSync(converterPath, [fileUri.fsPath, '-y', '-ft', 'png', '-o', path.dirname(fileUri.fsPath)]);
          // }
          // catch (exception)
          // {
          //   console.warn('error while converting: ' + fileUri.fsPath);
          // }
        }
      })
    ];

    return disposable;
	}
}