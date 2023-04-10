import * as vscode from 'vscode';
import * as child from 'child_process';
import * as channel from '../channel';
import * as fs from 'fs';
import * as path from 'path';
import * as editorUtils from '../../other/editorUtils';
import * as utils from '../../other/utils';

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

        _patch = editorUtils.getSelectedModOps(editor.document, editor.selection);
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

  public static async getVanilla(fileUri: vscode.Uri) {
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

      const searchModPath = utils.searchModPath(_patchPath);

      const tester = new PatchTester(context);
      const result = tester.diff(_originalPath, 
        _patch ? ('<ModOps>' + _patch + '</ModOps>') : fs.readFileSync(_patchPath, 'utf-8'), 
        _patchPath, 
        searchModPath);
      _originalContent = result.original;
      _patchedContent = result.patched;
      _logContent = result.log;

      // TODO remove this fix
      _logContent = _logContent.replace('ModOp time: 0.', 'ModOp time: ');

      channel.log(_logContent);
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

    const maxBuffer = 20;

    try {
      const modRelativePath = path.relative(modPath, patchFilePath);

      const res = child.execFileSync(differ, ["patchdiff", originalPath, modRelativePath, modPath], {
        cwd: this._workingDir, 
        input: patchContent, 
        encoding: 'utf-8',
        maxBuffer: maxBuffer * 1024 * 1024
      });
      const split = res.split('##annodiff##');
      
      return { original: split[2], patched: split[1], log: split[0] };
    }
    catch (e)
    {
      
      if ((<Error>e).message.endsWith('ENOBUFS')) {
        throw new Error(`Diff exceeds ${maxBuffer} MB!`);
      }
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
}
