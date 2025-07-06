import * as vscode from 'vscode';
import * as channel from '../channel';
import * as fs from 'fs';
import * as path from 'path';
import * as utils from '../../other/utils';
import * as xmltest from '../../tools/xmltest';

export class RunTests {
	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.runTests', async (fileUri) => {
        const sourcePath = utils.findModRoot(fileUri.fsPath);
        const cachePath = path.join(sourcePath, '.modcache');
        utils.ensureDir(cachePath);

        const testInputPath = path.join(sourcePath, 'tests');
        channel.show();
        if (fs.existsSync(testInputPath)) {
          channel.log(`Run tests from ${testInputPath}`);
  
          const patchFilePath = utils.getAssetsXmlPath(sourcePath);
          if (!patchFilePath) {
            channel.error(`Cannot find '${patchFilePath}'`);
            return;
          }
  
          if (!xmltest.test(testInputPath, sourcePath, patchFilePath, cachePath)) {
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
