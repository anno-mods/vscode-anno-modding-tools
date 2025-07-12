import * as vscode from 'vscode';

import { GuidCounter } from '../../features/guidCounter';
import * as text from '../../editor/text';
import { SymbolRegistry } from '../../data/symbols';

export function activate() {
  const provider = vscode.languages.registerCompletionItemProvider(
    'anno-xml',
    {
      provideCompletionItems(document, position, token, context) {
        const completionItems: vscode.CompletionItem[] = [];

        const nodePath = text.getNodePath(document, position);
        if (!nodePath) {
          return [];
        }

        if (!nodePath.endsWith('.GUID')) {
          return [];
        }

        GuidCounter.use(document.uri);

        const newGuidItem = new vscode.CompletionItem({
          label: `<new guid>`,
          description: GuidCounter.nextName(),
        }, vscode.CompletionItemKind.Snippet);
        newGuidItem.kind = vscode.CompletionItemKind.Value;
        newGuidItem.insertText = `${GuidCounter.next()}`;
        newGuidItem.command = { command: 'anno-modding-tools.incrementAutoGuid', title: 'increment GUID...' };
        newGuidItem.sortText = '   __000'; // keep it the very first item

        const items = [ newGuidItem ];
        const symbols = SymbolRegistry.all();
        for (const symbol of symbols.values()) {
          const item = new vscode.CompletionItem({
            label: `${symbol.english||symbol.name}`,
            description: `${symbol.template}: ${symbol.guid} (${symbol.name})`
          }, vscode.CompletionItemKind.Snippet);
          item.insertText = symbol.guid;
          items.push(item);
        }

        return items;
      }
    },
    '>' // trigger characters
  );

  return provider;
}
