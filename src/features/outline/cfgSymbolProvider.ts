/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/*
https://github.com/microsoft/vscode/blob/main/extensions/markdown-language-features/src/features/documentSymbolProvider.ts
used almost as is
*/

import * as vscode from 'vscode';
import { SkinnyTextDocument, CfgTocProvider, TocEntry } from './cfgTocProvider';

interface MarkdownSymbol {
	readonly level: number;
	readonly parent: MarkdownSymbol | undefined;
	readonly children: vscode.DocumentSymbol[];
}

export default class CfgDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
	public async provideDocumentSymbols(document: SkinnyTextDocument): Promise<vscode.DocumentSymbol[]> {
		const toc = await new CfgTocProvider(document).getToc();
		const root: MarkdownSymbol = {
			level: -Infinity,
			children: [],
			parent: undefined
		};
		this.buildTree(root, toc);
		return root.children;
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
		return entry.text;
	}
}