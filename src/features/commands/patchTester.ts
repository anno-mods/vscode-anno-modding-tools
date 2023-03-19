import * as vscode from 'vscode';
import * as child from 'child_process';
import * as channel from '../channel';
import * as fs from 'fs';
import * as path from 'path';
import * as utils from '../../other/editorUtils';

let _originalPath: string;
let _patchPath: string;
let _patch: string;
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
    
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.patchCheckDiff', async (fileUri) => {
        const vanillaAssetsFilePath = await this.getVanilla(fileUri);
        if (!vanillaAssetsFilePath) {
          return;
        }

        let patchFilePath = fileUri.fsPath;
        if (path.basename(patchFilePath) === 'annomod.json') {
          patchFilePath = this.getAssetsFromModinfo(patchFilePath);
        }
        channel.error(patchFilePath);

        if (!fs.existsSync(patchFilePath)) {
          vscode.window.showErrorMessage(`Cannot find '${patchFilePath}'`);
          return;
        }

        // TODO cache with checksum?
        _originalPath = vanillaAssetsFilePath;
        _patchPath = patchFilePath;
        _patch = "";
        _reload = true;

        const timestamp = Date.now();
        channel.show();
        vscode.commands.executeCommand('vscode.diff', 
          vscode.Uri.parse('annodiff:' + _originalPath + '?original#' + timestamp),
          vscode.Uri.parse('annodiff:' + _patchPath + '?patch#' + timestamp),
          'Anno Diff: Original ↔ Patched');
      }),
      vscode.commands.registerCommand('anno-modding-tools.selectionCheckDiff', async (fileUri) => {
        const vanillaAssetsFilePath = await this.getVanilla(fileUri);
        if (!vanillaAssetsFilePath) {
          return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }

        // TODO cache with checksum?
        _originalPath = vanillaAssetsFilePath;
        _patchPath = fileUri.fsPath;

        _patch = utils.getSelectedModOps(editor.document, editor.selection);
        _reload = true;

        _patch = _patch.replace(/<\/?ModOps>/g, '');

        const timestamp = Date.now();
        channel.show();
        vscode.commands.executeCommand('vscode.diff', 
          vscode.Uri.parse('annodiff:' + _originalPath + '?original#' + timestamp),
          vscode.Uri.parse('annodiff:' + _patchPath + '?patch#' + timestamp),
          'Anno Diff: Original ↔ Patched');
      }),
      vscode.workspace.registerTextDocumentContentProvider("annodiff", annodiffContentProvider)
    ];

    return disposable;
	}

  static async getVanilla(fileUri: vscode.Uri) {
    const config = vscode.workspace.getConfiguration('anno', fileUri);
    const annoRda: string = config.get('rdaFolder') || "";
    let vanillaPath = path.join(annoRda, 'data/config/export/main/asset/assets.xml');

    if (!fs.existsSync(vanillaPath)) {
      const goSettings = 'Change Settings';
      const chosen = await vscode.window.showErrorMessage('Your `rdaFolder` is not set up correctly.', goSettings);
      if (chosen === goSettings) {
        vscode.commands.executeCommand('workbench.action.openSettings', 'anno.rdaFolder');
      }
      return undefined;
    }

    const basename = path.basename(fileUri.fsPath, path.extname(fileUri.fsPath));
    if (basename.indexOf("templates") >= 0) {
      vanillaPath = path.join(annoRda, 'data/config/export/main/asset/templates.xml');
    }
    else if (basename.indexOf("texts_") >= 0) {
      vanillaPath = path.join(annoRda, 'data/config/gui/' + basename + '.xml');
    }

    return vanillaPath;
  }

  static reload(context: vscode.ExtensionContext) {
    if (_reload) {
      _reload = false;
      const start = Date.now();

      const searchModPath = this.searchModPath(_patchPath);

      const tester = new PatchTester(context);
      const result = tester.diff(_originalPath, 
        '<ModOps>' + _patch + '</ModOps>', 
        _patchPath, 
        searchModPath);
      _originalContent = result.original;
      _patchedContent = result.patched;
      _logContent = result.log;

      const stop = Date.now();

      channel.log(_logContent);
      channel.log(`annodiff: ${(stop - start)/1000}s`);
    }
  }

  _context: vscode.ExtensionContext;
  _workingDir: string = "";
  
  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }
  
  diff(originalPath: string, patchContent: string, patchFilePath: string, modPath: string) {
    const differ = this._context.asAbsolutePath('./external/annodiff.exe');

    if (!originalPath || !patchContent) {
      return { original: '', patched: '', log: ''};
    }
    this._workingDir = path.resolve(path.dirname(patchFilePath));

    try {
      const modRelativePath = path.relative(patchFilePath, modPath);

      const res = child.execFileSync(differ, ["patchdiff", originalPath, modRelativePath, modPath], { cwd: this._workingDir, input: patchContent });
      const split = res.toString().split('##annodiff##');
      
      return { original: split[2], patched: split[1], log: split[0] };
    }
    catch (e)
    {
      channel.error((<Error>e).message);
      throw e;
    }
  }

  static getAssetsFromModinfo(modinfoPath: string) {
    const assetsFilePath = path.join(path.dirname(modinfoPath), 'data/config/export/main/asset/assets');
    if (fs.existsSync(assetsFilePath + '_.xml')) {
      return assetsFilePath + '_.xml';
    }
    else {
      return assetsFilePath + '.xml';
    }
  }

  static searchModPath(patchFilePath: string) {
    let searchPath = path.dirname(patchFilePath);

    for (let i = 0; i < 100 && searchPath && searchPath !== '/'; i++) {
      if (fs.existsSync(path.join(searchPath, "modinfo.json"))
        || fs.existsSync(path.join(searchPath, "buildmod.json"))
        || fs.existsSync(path.join(searchPath, "data/config/export/main/asset"))
        || fs.existsSync(path.join(searchPath, "data/config/gui"))) {
        return searchPath;
      }

      searchPath = path.dirname(searchPath);
    }

    return path.dirname(patchFilePath);
  }
}
