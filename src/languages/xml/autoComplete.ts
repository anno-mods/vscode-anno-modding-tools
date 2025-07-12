import * as vscode from 'vscode';

import { GuidCounter } from '../../features/guidCounter';
import * as text from '../../editor/text';
import { SymbolRegistry } from '../../data/symbols';

export function activate() {
  const provider = vscode.languages.registerCompletionItemProvider(
    { language: 'anno-xml', scheme: 'file' },
    {
      provideCompletionItems(document, position, token, context) {
        const nodePath = text.getAutoCompletePath(document, position);
        if (!nodePath) {
          return [];
        }

        vscode.window.showErrorMessage(nodePath);

        const xpath = nodePath.startsWith('XPath');
        if (xpath && !(
          nodePath.endsWith('GUID')
          || nodePath.endsWith('Path') || nodePath.endsWith('Content')
          || nodePath.endsWith('Add') || nodePath.endsWith('Remove')
          || nodePath.endsWith('Append') || nodePath.endsWith('Prepand'))) {
          return [];
        }

        // TODO for now allow any tag
        // if (!nodePath.endsWith('.GUID')) {
        //   return [];
        // }

        GuidCounter.use(document.uri);

        const items: vscode.CompletionItem[] = [];

        if (!xpath) {
          items.push(...GuidCounter.getCompletionItems());
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
