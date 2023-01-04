import * as vscode from 'vscode';
import * as child from 'child_process';
import * as channel from '../channel';
import * as fs from 'fs';
import * as path from 'path';
import { resourceLimits } from 'worker_threads';

let _originalPath: string;
let _patchPath: string;
let _reload: boolean = false;

let _originalContent: string;
let _patchedContent: string;
let _logContent: string;

export class PatchTester {
	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const annodiffContentProvider = new (class implements vscode.TextDocumentContentProvider {
      provideTextDocumentContent(uri: vscode.Uri): string {
        PatchTester.reload(context);

        if (uri.query === 'original') {
          return _originalContent;
        }
        else {
          return _patchedContent;
        }
      }
    })();

    const modloaderLogProvider = new (class implements vscode.TextDocumentContentProvider {
      provideTextDocumentContent(uri: vscode.Uri): string {
        PatchTester.reload(context);

        return _logContent;
      }
    })();

    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.patchCheckDiff', async (fileUri) => {
        const vanillaAssetsFilePath = await this.getVanilla(fileUri);
        if (!vanillaAssetsFilePath) {
          return;
        }

        // TODO checksum??
        // if (_originalPath !== vanillaAssetsFilePath) {
          _originalPath = vanillaAssetsFilePath;
          // _reload = true;
        // }
        // if (_patchPath !== fileUri.fsPath) {
          _patchPath = fileUri.fsPath;
          _reload = true;
        // }

        const timestamp = Date.now();

        vscode.commands.executeCommand('vscode.diff', 
          vscode.Uri.parse('annodiff:' + _originalPath + '?original#' + timestamp),
          vscode.Uri.parse('annodiff:' + _patchPath + '?patch#' + timestamp),
          'Anno Diff: Original ↔ Patched');
      }),
      vscode.workspace.registerTextDocumentContentProvider("annodiff", annodiffContentProvider),
      // vscode.commands.registerCommand('anno-modding-tools.patchCheckLog', async (fileUri) => {
      //   const vanillaAssetsFilePath = await this.getVanilla(fileUri);
      //   if (!vanillaAssetsFilePath) {
      //     return;
      //   }

      //   // TODO checksum??
      //   // if (_originalPath !== vanillaAssetsFilePath) {
      //     _originalPath = vanillaAssetsFilePath;
      //     // _reload = true;
      //   // }
      //   // if (_patchPath !== fileUri.fsPath) {
      //     _patchPath = fileUri.fsPath;
      //     _reload = true;
      //   // }

      //   const timestamp = Date.now();

      //   // TODO find mod name
      //   vscode.commands.executeCommand('vscode.open', 
      //     vscode.Uri.parse('annolog:' + fileUri.fsPath + '?' + vanillaAssetsFilePath + '#' + timestamp),
      //     {},
      //     'Modloader Log');
      // }),
      // vscode.workspace.registerTextDocumentContentProvider("annolog", modloaderLogProvider),
    ];

    return disposable;
	}

  static async getVanilla(fileUri: vscode.Uri) {
    const config = vscode.workspace.getConfiguration('anno', fileUri);
    const annoRda: string = config.get('rdaFolder') || "";
    const vanillaAssetsFilePath = annoRda + '/data/config/export/main/asset/assets.xml'.toLowerCase();

    if (!fs.existsSync(vanillaAssetsFilePath)) {
      const goSettings = 'Change Settings';
      const chosen = await vscode.window.showErrorMessage('Your `rdaFolder` is not set up correctly.', goSettings);
      if (chosen === goSettings) {
        vscode.commands.executeCommand('workbench.action.openSettings', 'anno.rdaFolder');
      }
      return undefined;
    }

    return vanillaAssetsFilePath;
  }

  static reload(context: vscode.ExtensionContext) {
    if (_reload) {
      const start = Date.now()

      const tester = new PatchTester(context);
      const result = tester.diff(_originalPath, _patchPath);
      _originalContent = result.original;
      _patchedContent = result.patched;
      _logContent = result.log;
      _reload = false;

      const stop = Date.now()

      channel.log(_logContent);
      channel.log(`annodiff: ${(stop - start)/1000}s`);
    }
  }

  _context: vscode.ExtensionContext;
  _workingDir: string = "";
  
  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }
  
  diff(originalPath: string, patchedPath: string) {
    const differ = this._context.asAbsolutePath('./external/annodiff.exe');

    if (!originalPath || !patchedPath) {
      return { original: '', patched: '', log: ''};
    }
    this._workingDir = path.resolve(path.dirname(patchedPath));

    const res = child.execFileSync(differ, ["patchdiff", originalPath, patchedPath], { cwd: this._workingDir });
    const split = res.toString().split('##annodiff##');

    return { original: split[2], patched: split[1], log: split[0] };
  }
}
