import * as vscode from 'vscode';
import * as channel from '../channel';
import * as fs from 'fs';
import * as path from 'path';
import * as editorUtils from '../../editor/utils';
import * as utils from '../../other/utils';
import { ModInfo } from '../../anno';
import * as xmltest from '../../tools/xmltest';

let _originalPath: string;
let _patchPath: string;
let _patch: string;
let _reload: boolean = false;

let _originalContent: string;
let _patchedContent: string;
let _logContent: string;

let _version = utils.GameVersion.Auto;

export class ShowDiffCommand {
	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const annodiffContentProvider = new (class implements vscode.TextDocumentContentProvider {
      provideTextDocumentContent(uri: vscode.Uri): string {
        ShowDiffCommand.reload(context);

        if (uri.query === 'original') {
          return _originalContent;
        }
        else {
          return _patchedContent;
        }
      }
    })();

    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.showFileDiff', ShowDiffCommand.showFileDiff),
      vscode.commands.registerCommand('anno-modding-tools.showSelectionDiff', ShowDiffCommand.showSelectionDiff),
      vscode.workspace.registerTextDocumentContentProvider("annodiff", annodiffContentProvider)
    ];

    return disposable;
	}

  static async showFileDiff(fileUri: any) {
    if (!await editorUtils.ensureRdaFolderSettingAsync('rdaFolder', fileUri)) {
      return;
    }

    const modPath = utils.findModRoot(fileUri.fsPath);
    const vanillaAssetsFilePath = editorUtils.getVanilla(fileUri.fsPath, modPath);
    if (!vanillaAssetsFilePath) {
      vscode.window.showWarningMessage(`Can't find corresponding vanilla file.`);
      return;
    }

    let modInfo: ModInfo | undefined;

    let patchFilePath = fileUri.fsPath;
    if (path.basename(patchFilePath) === 'modinfo.json') {
      modInfo = ModInfo.read(patchFilePath);
      if (!modInfo || modInfo.game === utils.GameVersion.Auto) {
        vscode.window.showWarningMessage(`modinfo.json contains errors. Please fix and check the version field, e.g. '"Anno": 8'.`);
        return;
      }

      _version = modInfo?.game;
      patchFilePath = utils.getAssetsXmlPath(path.dirname(patchFilePath), modInfo?.game);
    }
    else {
      modInfo = ModInfo.read(modPath);
      _version = modInfo?.game || utils.GameVersion.Auto;
    }

    if (!fs.existsSync(patchFilePath)) {
      vscode.window.showWarningMessage(`No assets.xml to compare.\n\nThere is no file at: '${patchFilePath}'`);
      return;
    }

    // TODO cache with checksum?
    _originalPath = vanillaAssetsFilePath;
    _patchPath = patchFilePath;
    _patch = "";
    _reload = true;

    ShowDiffCommand.executeDiff();
  }

  static async showSelectionDiff(fileUri: any) {
    if (!await editorUtils.ensureRdaFolderSettingAsync('rdaFolder', fileUri)) {
      return;
    }

    const modPath = utils.findModRoot(fileUri.fsPath);
    const vanillaAssetsFilePath = editorUtils.getVanilla(fileUri.fsPath);
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


    let modInfo: ModInfo | undefined;

    let patchFilePath = fileUri.fsPath;
    modInfo = ModInfo.read(modPath);
    _version = modInfo?.game || utils.GameVersion.Auto;

    _patch = _patch.replace(/<\/?ModOps>/g, '');

    ShowDiffCommand.executeDiff();
  }

  static executeDiff() {
    const timestamp = Date.now();
    channel.show();
    vscode.commands.executeCommand('vscode.diff',
      vscode.Uri.parse('annodiff:' + _originalPath + '?original#' + timestamp),
      vscode.Uri.parse('annodiff:' + _patchPath + '?patch#' + timestamp),
      _version === utils.GameVersion.Anno8 ? 'Anno 117: Original ↔ Patched' : 'Anno 1800: Original ↔ Patched');
  }

  static reload(context: vscode.ExtensionContext) {
    if (_reload) {
      _reload = false;

      const searchModPath = utils.searchModPath(_patchPath);
      const config = vscode.workspace.getConfiguration('anno', vscode.Uri.file(_patchPath));
      const modsFolder: string | undefined = config.get('modsFolder');
      const tester = new ShowDiffCommand(context, modsFolder);
      const result = tester.diff(_originalPath,
        _patch ? ('<ModOps>' + _patch + '</ModOps>') : fs.readFileSync(_patchPath, 'utf-8'),
        _patchPath,
        searchModPath);
      _originalContent = result.original;
      _patchedContent = result.patched;
      _logContent = result.log;

      channel.log(_logContent);
    }
  }

  _context: vscode.ExtensionContext;
  _workingDir: string = "";
  _modsFolder?: string;

  constructor(context: vscode.ExtensionContext, modsFolder?: string) {
    this._context = context;
    this._modsFolder = modsFolder;
  }

  diff(originalPath: string, patchContent: string, patchFilePath: string, modPath: string) {
    return xmltest.diff(originalPath, patchContent, patchFilePath, modPath, this._modsFolder, this._context.asAbsolutePath);
  }
}
