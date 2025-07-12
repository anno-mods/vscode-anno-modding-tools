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

        const nodePath = text.getAutoCompletePath(document, position);
        if (!nodePath) {
          return [];
        }

        // TODO for now allow any tag
        // if (!nodePath.endsWith('.GUID')) {
        //   return [];
        // }

        GuidCounter.use(document.uri);

        const items = [];

        if (!nodePath.startsWith('XPath')) {
          const newGuidItem = new vscode.CompletionItem({
            label: `<new guid>`,
            description: GuidCounter.nextName(),
          }, vscode.CompletionItemKind.Snippet);
          newGuidItem.kind = vscode.CompletionItemKind.Event;
          newGuidItem.insertText = `${GuidCounter.next()}`;
          newGuidItem.command = { command: 'anno-modding-tools.incrementAutoGuid', title: 'increment GUID...' };
          newGuidItem.sortText = '   __000'; // keep it the very first item

          items.push(newGuidItem);
        }

        const symbols = SymbolRegistry.all();
        for (const symbol of symbols.values()) {
          SymbolRegistry.resolveTemplate(symbol);

          if (symbol.template === 'Sequence' ||
            symbol.template === 'Objective' ||
            symbol.template === 'Function' ||
            symbol.template === 'FunctionImmidiate' ||
            symbol.template === 'Decision' ||
            symbol.template === 'SelectObjectiveComponent' ||
            symbol.template === 'FunctionImmediate' ||
            symbol.template === 'SequenceCharNotif' ||
            symbol.template === 'QuestInteractionWindow' ||
            symbol.template === 'PositionMarker' ||
            symbol.template === 'CampaignQuestObject' ||
            symbol.template === 'VisualQuestObject' ||
            symbol.template === 'QuestLine' ||
            symbol.template === 'ProvinceStoryObject' ||
            symbol.template === 'Matcher' ||
            symbol.template === 'StateChecker' ||
            symbol.template === 'TextPool' ||
            symbol.template === 'VisualObject' ||
            symbol.template === 'Prop' ||
            symbol.template === 'Achievement'
          ) {
            continue;
          }

          const item = new vscode.CompletionItem({
            label: `${symbol.english||symbol.name}`,
            description: `${symbol.template}: ${symbol.guid} (${symbol.name})`
          }, vscode.CompletionItemKind.Snippet);
          item.insertText = symbol.guid;
          item.kind = vscode.CompletionItemKind.Value;
          items.push(item);
        }

        return items;
      }
    },
    // TODO disable > trigger until we have proper patch matching.
    // For now just allow it anywhere.
    // '>' // trigger characters
  );

  return provider;
}
