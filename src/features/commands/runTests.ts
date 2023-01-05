import * as vscode from 'vscode';
import * as channel from '../channel';
import * as fs from 'fs';
import * as path from 'path';
import * as xmltest from '../../other/xmltest';

export class RunTests {
	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.runTests', async (fileUri) => {
        const sourcePath = path.dirname(fileUri.fsPath);
        const cachePath = path.join(sourcePath, '.modcache');

        const testInputPath = path.join(sourcePath, 'tests');
        channel.show();
        if (fs.existsSync(testInputPath)) {
          channel.log(`Run tests from ${testInputPath}`);
  
          let patchFilePath = path.join(sourcePath, 'data/config/export/main/asset/assets');
          patchFilePath += fs.existsSync(patchFilePath + '_.xml') ? '_.xml' : '.xml';
          if (!fs.existsSync(patchFilePath)) {
            channel.error(`Cannot find '${patchFilePath}'`);
            return;
          }
  
          if (!xmltest.test(testInputPath, patchFilePath, x => context.asAbsolutePath(x), cachePath)) {
            return false;
          }
        }
        else {
          channel.log(`No test folder: ${testInputPath}`);
        }
      })
    ];

    return disposable;
	}
}
