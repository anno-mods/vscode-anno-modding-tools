import path = require('path');
import * as vscode from 'vscode';
import * as fs from 'fs';

const _TAGS_TO_COMPLETE: { [index: string]: string[] } = {
  /* eslint-disable @typescript-eslint/naming-convention */
  'Ingredient': [ 'Product' ],
  'Product': [ 'Product' ],
  'ItemLink': [ 'GuildhouseItem', 'HarborOfficeItem', 'TownhallItem', 'CultureItem', 'VehicleItem' ],
  'Good': [ 'Product' ], // TODO and items?
  'GUID': [ '*' ]
  /* eslint-enable @typescript-eslint/naming-convention */
};

interface IAsset {
  guid: string;
  template?: string;
  name?: string;
  english?: string;
}

function resolveGUID(guid: string): IAsset | undefined {
  const vanilla = _vanillaAssets || {};

  let entry = undefined;
  if (vanilla) {
    entry = vanilla[guid];
  }
  // if (!entry) {
  //   // TODO workspace files
  //   const db: {[index: string]: string } = { '1500010020': 'Small Gas Power Plant' };
  //   entry = db[guid];
  // }
  
  return entry;
}

function getValueAfterTag(line: string, position: number) {
  const closing = line.indexOf('>', position);
  if (closing === -1) {
    return undefined;
  }
  const opening = line.indexOf('<', closing);
  if (opening === -1) {
    return undefined;
  } 

  return line.substr(closing + 1, opening - closing - 1);
}

function getLastTag(line: string, position: number) {
  const linePrefix = line.substr(0, position);

  const closing = linePrefix.lastIndexOf('>');
  if (closing === -1) {
    return undefined;
  }
  const opening = linePrefix.lastIndexOf('<');
  if (opening === -1 || opening > closing) {
    return undefined;
  }

  return linePrefix.substr(opening + 1, closing - opening - 1);
}

function getValueAt(line: string, position: number) {
  let valueEnd = line.length;
  for (let i = position; i < line.length; i++) {
    const codeValue = line.charCodeAt(i);
    if (codeValue < 48 || codeValue > 57) {
      valueEnd = i;
      break;
    }
  }
  let valueBegin = 0;
  for (let i = position; i >= 0; i--) {
    const codeValue = line.charCodeAt(i);
    if (codeValue < 48 || codeValue > 57) {
      valueBegin = i + 1;
      break;
    }
  }
  if (valueBegin >= valueEnd) {
    return undefined;
  }

  const linePrefix = line.substr(0, valueBegin);
  const match = linePrefix.match(/[\s'"<](\w+)\s*(=\s*['"]|>\s*)$/);
  if (!match) {
    return undefined;
  }

  return {
    name: match[1],
    text: line.substr(valueBegin, valueEnd - valueBegin)
  };
}

const _completionItems: { [ index: string]: vscode.CompletionItem[] } = {};
let _vanillaAssets: { [index: string]: IAsset } | undefined = undefined;
async function loadVanillaAssets(context: vscode.ExtensionContext) {
  if (!_vanillaAssets) {
    const assetPath = context.asAbsolutePath('./generated/assets.json');
    _vanillaAssets = JSON.parse(fs.readFileSync(assetPath, { encoding: 'utf8' }));

    if (_vanillaAssets) {
      // prepare CompletionItem lists
      for (let tag of Object.keys(_TAGS_TO_COMPLETE)) {
        _completionItems[tag] = [];
      }

      // fill CompletionItem lists for the different kind of tags
      for (let guid of Object.keys(_vanillaAssets)) {
        const asset = _vanillaAssets[guid];
        const item = new vscode.CompletionItem({ label: `${asset.english}`, description: `${asset.template}: ${guid} (${asset.name})` }, vscode.CompletionItemKind.Snippet);
        item.insertText = guid;

        for (let tag of Object.keys(_TAGS_TO_COMPLETE)) {
          for (let template of _TAGS_TO_COMPLETE[tag]) {
            if (template === '*' || template === asset.template) {
              _completionItems[tag].push(item);
              break;
            }
          }
        }
      }
    }
  }

  return _vanillaAssets;
}

export function registerGuidUtilsProvider(context: vscode.ExtensionContext): vscode.Disposable[] {
  loadVanillaAssets(context);

	return [
    vscode.Disposable.from(vscode.languages.registerHoverProvider({ language: 'xml', pattern: '**/assets.xml' }, { provideHover })), 
    vscode.Disposable.from(vscode.languages.registerCompletionItemProvider({ language: 'xml', pattern: '**/assets.xml' }, { provideCompletionItems }))
  ];
}

function provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
  const tag = getLastTag(document.lineAt(position).text, position.character);
  if (!tag) {
    return undefined;
  }
  // TODO scan open file
  return _completionItems[tag];
}

function provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
  const value = getValueAt(document.lineAt(position).text, position.character);
  if (!value) {
    return undefined;
  }

  if (-1 !== Object.keys(_TAGS_TO_COMPLETE).indexOf(value.name)) {
    const guid = value.text;
    if (guid) {
      const namedGuid = resolveGUID(guid);
      if (namedGuid) {
        return {
          contents: [ `${namedGuid.template}: ${namedGuid.english} (${namedGuid.name})` ]
        };
      }
      else {
        return {
          contents: [ `GUID ${guid} not found.` ]
        };
      }
    }
  }

  return undefined;
}