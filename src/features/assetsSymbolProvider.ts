import * as vscode from 'vscode';
import * as minimatch from 'minimatch';
import { resolveGUID, getAllCustomSymbols } from './guidUtilsProvider';
import { ASSETS_FILENAME_PATTERN } from '../other/assetsXml';
import * as channel from './channel';
import * as path from 'path';
import * as child from 'child_process';

let context_: vscode.ExtensionContext;

const vanillaAssetContentProvider = new (class implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(uri: vscode.Uri): string {
    const differ = context_.asAbsolutePath('./external/xmltest.exe');
    const config = vscode.workspace.getConfiguration('anno', uri);
    const annoRda: string = config.get('rdaFolder') || "";
    let vanillaPath = path.join(annoRda, 'data/config/export/main/asset/assets.xml');

    const match = /(\d+)/g.exec(uri.fsPath);
    if (!match) {
      return 'GUID not found';
    }
    const guid = match[0];

    try {
      const res = child.execFileSync(differ, ['-c', 'show', vanillaPath, guid]);
      return res.toString();
    }
    catch (e)
    {
      channel.error((<Error>e).message);
      throw e;
    }
  }
})();

export class WorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {
  public async provideWorkspaceSymbols(search: string, token: vscode.CancellationToken): Promise<vscode.SymbolInformation[]> {
    const matchingSymbols = getAllCustomSymbols();
    let result: vscode.SymbolInformation[] = [];
    
    for (const symbol of matchingSymbols) {
      if (symbol.location) {
        result.push(
          new vscode.SymbolInformation(
            (symbol.english ?? symbol.name ?? symbol.guid) + (symbol.template ? ` (${symbol.template})` : ''), 
            vscode.SymbolKind.Class, 
            new vscode.Range(symbol.location.line, 0, symbol.location.line, 0), 
            symbol.location.filePath)
        );
      }
    }

    return result;
  }
}

export class DefinitionProvider implements vscode.DefinitionProvider {
  public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
    if (document.lineCount > 10000 || !minimatch(document.fileName, ASSETS_FILENAME_PATTERN)) {
      // ignore large files and non-assets.xmls
      return;
    }
    
    const word = document.getWordRangeAtPosition(position);
    const text = document.getText(word);

    const asset = resolveGUID(text);
    if (asset && asset.location) {
      return new vscode.Location(asset.location.filePath, new vscode.Position(asset.location.line, 0));
    }
    return undefined;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const selector: vscode.DocumentSelector = { language: 'xml', scheme: '*', pattern: ASSETS_FILENAME_PATTERN };


  context_ = context;

  context.subscriptions.push(
    vscode.Disposable.from(
      vscode.languages.registerWorkspaceSymbolProvider(
        new WorkspaceSymbolProvider())));
  context.subscriptions.push(
    vscode.Disposable.from(
      vscode.languages.registerDefinitionProvider(
        selector,
        new DefinitionProvider())));

  vscode.workspace.registerTextDocumentContentProvider("annoasset", vanillaAssetContentProvider);
}
