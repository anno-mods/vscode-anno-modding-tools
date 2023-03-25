import * as vscode from 'vscode';
import { SkinnyTextDocument, AssetsTocProvider, TocEntry } from './assetsTocProvider';
import { ASSETS_FILENAME_PATTERN } from '../../other/assetsXml';
import * as channel from '../channel';

interface MarkdownSymbol {
	readonly level: number;
	readonly parent: MarkdownSymbol | undefined;
	readonly children: vscode.DocumentSymbol[];
}

export class AssetsSymbolProvider {
	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const selector: vscode.DocumentSelector = {
			language: 'xml', 
			scheme: '*', 
			pattern: ASSETS_FILENAME_PATTERN };

    const symbolProvider = new AssetsSymbolProvider();

    return [ 
      vscode.Disposable.from(vscode.languages.registerDocumentSymbolProvider(selector, symbolProvider)),
      vscode.Disposable.from(vscode.languages.registerWorkspaceSymbolProvider(symbolProvider))
    ];
  }

  public async provideDocumentSymbols(document: SkinnyTextDocument): Promise<vscode.DocumentSymbol[]> {
		const toc = await new AssetsTocProvider(document).getToc();
		const root: MarkdownSymbol = {
			level: -Infinity,
			children: [],
			parent: undefined
		};
		this.buildTree(root, toc);
		return root.children;
	}

  public provideWorkspaceSymbols(query: string, token: vscode. CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[]> {
    return undefined;
  }

  public resolveWorkspaceSymbol(symbol: vscode.SymbolInformation, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation> {
    return undefined;
  }

	private buildTree(parent: MarkdownSymbol, entries: TocEntry[]) {
		if (!entries.length) {
			return;
		}

		const entry = entries[0];
		const symbol = this.toDocumentSymbol(entry);
		symbol.children = [];

		while (parent && entry.level <= parent.level) {
			parent = parent.parent!;
		}
		parent.children.push(symbol);
		this.buildTree({ level: entry.level, children: symbol.children, parent }, entries.slice(1));
	}

	private toDocumentSymbol(entry: TocEntry) {
		return new vscode.DocumentSymbol(
			this.getSymbolName(entry),
			entry.detail,
			entry.symbol,
			entry.location.range,
			entry.location.range);
	}

	private getSymbolName(entry: TocEntry): string {
		return entry.guid ?? entry.text;
	}
}