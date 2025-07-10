import * as vscode from 'vscode';

import * as anno from '../../anno';
import * as rda from '../../data/rda';
import * as editorFormats from '../../editor/formats';
import * as modContext from '../../editor/modContext';
import * as xmltest from '../../tools/xmltest';
import { ASSETS_FILENAME_PATTERN, guidWithName } from '../../other/assetsXml';
import { SymbolRegistry } from '../../data/symbols';

const vanillaAssetContentProvider = new (class implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(uri: vscode.Uri): string {

    const version = uri.scheme === 'annoasset8' ? anno.GameVersion.Anno8 : anno.GameVersion.Anno7;
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
    if (!modContext.getVersion()) {
      return [];
    }

    const matchingSymbols = SymbolRegistry.all();
    let result: vscode.SymbolInformation[] = [];

    const versionNumber = modContext.getVersion().toString();

    for (const [_, symbol] of matchingSymbols) {
      const location = !symbol.location ?
        new vscode.Location(vscode.Uri.from({ scheme: "annoasset" + versionNumber, path: guidWithName(symbol) }), new vscode.Position(0, 0))
        : new vscode.Location(symbol.location.filePath, new vscode.Position(symbol.location.line, 0));

      result.push(
        new vscode.SymbolInformation(
          (symbol.english ?? symbol.name ?? symbol.guid) + (symbol.template ? ` (${symbol.template})` : ''),
          vscode.SymbolKind.Class,
          symbol.modName ?? 'vanilla',
          location)
      );
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
      const versionNumber = modContext.getVersion().toString();

      return new vscode.Location(
        vscode.Uri.from({ scheme: "annoasset" + versionNumber, path: guidWithName(asset) }), new vscode.Position(0, 0));
    }

    return undefined;
  }
}

export function activate(context: vscode.ExtensionContext) {
    const selector: vscode.DocumentSelector = [
      { language: 'anno-xml', scheme: '*' },
      { language: 'xml', scheme: '*', pattern: ASSETS_FILENAME_PATTERN }
    ];

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

  modContext.onCheckTextEditorContext(editor => {
    if (editor.document.uri.scheme.startsWith('annoasset')) {
      vscode.languages.setTextDocumentLanguage(editor.document, 'anno-xml');
      const version = editor.document.uri.scheme === 'annoasset8' ? anno.GameVersion.Anno8 : anno.GameVersion.Anno7;
      return new modContext.ModContext(editor?.document, version);
    }
  });
}
