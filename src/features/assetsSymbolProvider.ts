import * as vscode from 'vscode';
import * as minimatch from 'minimatch';
import { resolveGUID, getAllCustomSymbols } from './guidUtilsProvider';
import { ASSETS_FILENAME_PATTERN } from '../other/assetsXml';
import * as channel from './channel';

export class WorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {
  public async provideWorkspaceSymbols(search: string, token: vscode.CancellationToken): Promise<vscode.SymbolInformation[]> {
    const matchingSymbols = getAllCustomSymbols();
    let result: vscode.SymbolInformation[] = [];
    
    for (const symbol of matchingSymbols) {
      if (symbol.location) {
        result.push(
          new vscode.SymbolInformation(
            symbol.name ?? symbol.guid + (symbol.template ? ` ${symbol.template}` : ''), 
            vscode.SymbolKind.Class, 
            new vscode.Range(symbol.location.line, 0, symbol.location.line, 0), 
            vscode.Uri.file(symbol.location.filePath))
        );
      }
      else {
        channel.error('no location');
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
      return new vscode.Location(vscode.Uri.file(asset.location.filePath), new vscode.Position(asset.location.line, 0));
    }
    return undefined;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const selector: vscode.DocumentSelector = { language: 'xml', scheme: '*', pattern: ASSETS_FILENAME_PATTERN };

  context.subscriptions.push(
    vscode.Disposable.from(
      vscode.languages.registerWorkspaceSymbolProvider(
        new WorkspaceSymbolProvider())));
  context.subscriptions.push(
    vscode.Disposable.from(
      vscode.languages.registerDefinitionProvider(
        selector,
        new DefinitionProvider())));
}
