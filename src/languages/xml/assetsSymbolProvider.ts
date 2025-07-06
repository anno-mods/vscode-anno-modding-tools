import * as vscode from 'vscode';

import * as rda from '../../data/rda';
import * as editorFormats from '../../editor/formats';
import * as modContext from '../../editor/modContext';
import { getAllCustomSymbols } from '../../features/guidUtilsProvider'; // only for workspace symbols
import * as xmltest from '../../tools/xmltest';
import { ASSETS_FILENAME_PATTERN } from '../../other/assetsXml';
import { SymbolRegistry } from '../../data/symbols';
import * as utils from '../../other/utils';

let context_: vscode.ExtensionContext;

const vanillaAssetContentProvider = new (class implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(uri: vscode.Uri): string {

    const version = uri.scheme === 'annoasset8' ? utils.GameVersion.Anno8 : utils.GameVersion.Anno7;
    const vanillaPath = rda.getAssetsXml(version);
    if (!vanillaPath) {
      const msg = `assets.xml not found`;
      vscode.window.showErrorMessage(msg);
      throw msg;
    }

    const match = /(\d+)/g.exec(uri.fsPath);
    if (!match) {
      const msg = `GUID not found`;
      vscode.window.showErrorMessage(msg);
      throw msg;
    }
    const guid = match[0];

    return xmltest.show(guid, vanillaPath);
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
    if (!editorFormats.isAnnoXml(document)) {
      return;
    }

    const regex = /[-.:A-Z_a-z0-9]+/i;
    const word = document.getWordRangeAtPosition(position, regex);
    if (!word) {
      // not a valid word pattern
      return undefined;
    }
    const text = document.getText(word);

    const asset = SymbolRegistry.resolve(text);

    if (asset && asset.location) {
      return new vscode.Location(asset.location.filePath, new vscode.Position(asset.location.line, 0));
    }
    else if (asset) {
      const guidWithName = asset.name ? `${text} ${asset.name}` : text;
      const versionNumber = modContext.getVersion().toString();

      return new vscode.Location(
        vscode.Uri.from({ scheme: "annoasset" + versionNumber, path: guidWithName }), new vscode.Position(0, 0));
    }

    return undefined;
  }
}

export function activate(context: vscode.ExtensionContext) {
    const selector: vscode.DocumentSelector = [
      { language: 'anno-xml', scheme: '*' },
      { language: 'xml', scheme: '*', pattern: ASSETS_FILENAME_PATTERN }
    ];

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

  vscode.workspace.registerTextDocumentContentProvider("annoasset7", vanillaAssetContentProvider);
  vscode.workspace.registerTextDocumentContentProvider("annoasset8", vanillaAssetContentProvider);
}
