import path = require('path');
import * as vscode from 'vscode';
import * as fs from 'fs';
import { AssetsTocProvider } from '../other/assetsTocProvider';
import * as xmldoc from 'xmldoc';

const _TAGS_TO_COMPLETE: { [index: string]: string[] } = {
  /* eslint-disable @typescript-eslint/naming-convention */
  'Ingredient': [ 'Product' ],
  'Product': [ 'Product' ],
  'ItemLink': [ 'GuildhouseItem', 'HarborOfficeItem', 'TownhallItem', 'CultureItem', 'VehicleItem' ],
  'Good': [ 'Product' ], // TODO and items?
  'GUID': [ '*' ],
  'Building': [ '*' ],
  'ProvidedNeed': [ 'Product' ],
  'SubstituteNeed': [ 'Product' ],
  /* eslint-enable @typescript-eslint/naming-convention */
};

interface IAsset {
  guid: string;
  template?: string;
  name?: string;
  english?: string;
}

export function resolveGUID(guid: string) {
  let entry = undefined;
  if (_vanillaAssets) {
    entry = _vanillaAssets[guid];
  }
  if (_customAssets && !entry) {
    entry = _customAssets[guid];
  }
  return entry;
}

function resolveGuidRange(guid: string) {
  const vanilla = _guidRanges || {};
  const result = [];

  const guidNumber = parseInt(guid);

  let entry = undefined;
  for (let range of vanilla.ranges) {
    if (guidNumber >= range.start && guidNumber <= range.end) {
      entry = range;
      break;
    }
  }

  if (entry) {
    result.push(`${entry.name}'s GUID range`);
  }
  return result;
}

function resolveSafeRange(guid: string) {
  const vanilla = _guidRanges || {};
  const guidNumber = parseInt(guid);
  const addYourRange = 'add your range at [github.com/anno-mods/GuidRanges](https://github.com/anno-mods/GuidRanges)';
  if (guidNumber >= vanilla.safe.start && guidNumber < vanilla.safe.end) {
    return [ `Is safe for your own assets. Remember to ${addYourRange}.` ];
  }
  else {
    return [ `⚠ Is not safe for your own assets.\n\nPlease use from 1.337.471.142 to 2.147.483.647 and ${addYourRange}.` ];
  }
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

interface IKeyword {
  name: string,
  position: number,
  type: 'tag' | 'xpath',
  parent?: IKeyword
}

function _findLastKeywordInLine(line: string, position?: number): IKeyword | undefined {
  if (!position) {
    position = line.length - 1;
  }
  const linePrefix = line.substr(0, position);

  const closingTag = linePrefix.lastIndexOf('>');
  const equalSign = linePrefix.lastIndexOf('=');
  if (closingTag === -1 && equalSign === -1) {
    return undefined;
  }
  const openingTag = linePrefix.lastIndexOf('<');
  
  const validTag = openingTag !== -1 && openingTag <= closingTag;
  const validQuote = equalSign !== -1;
  if (!validQuote && !validTag) {
    return undefined;
  }

  if (validTag && closingTag > equalSign) {
    return {
      name: linePrefix.substr(openingTag + 1, closingTag - openingTag - 1), 
      position: openingTag,
      type: 'tag'
    };
  }
  else {
    const propertyMatch = linePrefix.substring(0, equalSign).match(/\s*(\w+)\s*$/);
    if (propertyMatch) {
      return {
        name: propertyMatch[1],
        position: linePrefix.length - propertyMatch[1].length,
        type: 'xpath'
      };
    }
  }

  return undefined;
}

function findKeywordBeforePosition(document: vscode.TextDocument, position: vscode.Position) {
  const thisLine = document.lineAt(position)?.text;
  
  const keyword = _findLastKeywordInLine(thisLine, position.character);
  if (!keyword) {
    return undefined;
  }
  // let parent = undefined;
  // if (keyword && keyword.type === 'tag' && position.line > 0) {
  //   parent = _findLastKeywordInLine(document.lineAt(position.line - 1).text + thisLine.substring(0, keyword.position));
  // }
  // else {
  // }

  return { ...keyword, parent: undefined };
}

function findKeywordAtPosition(document: vscode.TextDocument, position: vscode.Position) {
  const word = document.getWordRangeAtPosition(position);
  if (!word) {
    return undefined;
  }

  let parent = undefined;
  if (position.line > 0) {
    parent = new AssetsTocProvider(document).getParentPath(position.line, position.character);
  }

  return {
    name: document.lineAt(word.start.line).text.substr(word.start.character, word.end.character - word.start.character),
    parent
  };
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

function _updateCompletionItems(assets: { [index: string]: IAsset }) {
  const completionItems: { [ index: string]: vscode.CompletionItem[] } = {};
  
  // prepare CompletionItem lists
  for (let tag of Object.keys(_TAGS_TO_COMPLETE)) {
    completionItems[tag] = [];
  }

  // fill CompletionItem lists for the different kind of tags
  for (let guid of Object.keys(assets)) {
    const asset = assets[guid];
    const item = new vscode.CompletionItem({
      label: `${asset.english||asset.name}`,
      description: `${asset.template}: ${guid} (${asset.name})`
    }, vscode.CompletionItemKind.Snippet);
    item.insertText = guid;

    for (let tag of Object.keys(_TAGS_TO_COMPLETE)) {
      if (_TAGS_TO_COMPLETE[tag].indexOf('*') !== -1 || asset.template && _TAGS_TO_COMPLETE[tag].indexOf(asset.template) !== -1) {
        completionItems[tag].push(item);
      }
    }
  }

  return completionItems;
}

let _completionItems: { [ index: string]: vscode.CompletionItem[] } = {};
let _vanillaCompletionItems: { [ index: string]: vscode.CompletionItem[] } = {};
let _customCompletionItems: { [ index: string]: vscode.CompletionItem[] } | undefined = undefined;
let _vanillaAssets: { [index: string]: IAsset } | undefined = undefined;
async function loadVanillaAssets(context: vscode.ExtensionContext) {
  if (!_vanillaAssets) {
    const assetPath = context.asAbsolutePath('./generated/assets.json');
    _vanillaAssets = JSON.parse(fs.readFileSync(assetPath, { encoding: 'utf8' }));
    if (_vanillaAssets) {
      _vanillaCompletionItems = _updateCompletionItems(_vanillaAssets);
      _completionItems = _vanillaCompletionItems;
    }
  }

  return _vanillaAssets;
}

let _guidRanges: { safe: { start: number, end: number }, ranges: { name: string, start: number, end: number }[] };
async function loadGuidRanges(context: vscode.ExtensionContext) {
  if (!_guidRanges) {
    const assetPath = context.asAbsolutePath('./generated/guidranges.json');
    _guidRanges = JSON.parse(fs.readFileSync(assetPath, { encoding: 'utf8' }));
  }
  return _guidRanges;
}

interface IKeywordHelp {
  parent?: string,
  help: string[]
}
let _keywordHelp: { [index: string]: IKeywordHelp[] } | undefined = undefined;
async function loadKeywordHelp(context: vscode.ExtensionContext) {
  if (!_keywordHelp) {
    const assetPath = context.asAbsolutePath('./languages/keywords.json');
    const parsed = JSON.parse(fs.readFileSync(assetPath, { encoding: 'utf8' }));
    _keywordHelp = {};
    for (let entryKey of Object.keys(parsed)) {
      const entryValue = parsed[entryKey];
      if (!Array.isArray(entryValue) || entryValue.length === 0) {
        continue;
      }
      _keywordHelp[entryKey] = typeof entryValue[0] === 'string' ? [ { help: entryValue } ] : entryValue;
    }
  }

  return _keywordHelp;
}

let _customAssets: { [index: string]: IAsset } | undefined = undefined;
export function refreshCustomAssets(document: vscode.TextDocument | undefined): void {
  if (!document) {
    _customAssets = undefined;
    _customCompletionItems = undefined;
    return;
  }

  _customAssets = {};

  const relevantNodes = new Set<string>(['ModOps', 'ModOp', 'Asset', 'Values', 'Standard', 'GUID']);

  const xmlContent = new xmldoc.XmlDocument(document.getText());
  const nodeStack: { history: xmldoc.XmlElement[], element: xmldoc.XmlNode }[] = [{ history: [], element: xmlContent }];
  while (nodeStack.length > 0) {
    const top = nodeStack.pop();
    if (top?.element.type === 'element' && relevantNodes.has(top.element.name)) {
      const name = top.element.name;
      if (top.element.name === 'GUID') {
        const guid = top.element.val;
        const parent = top.history.length >= 2 ? top.history[top.history.length - 2] : undefined;
        const name = parent?.valueWithPath('Name');

        if (name) {
          _customAssets[guid] = {
            guid,
            name,
            template: top.history.length >= 4 ? top.history[top.history.length - 4].valueWithPath('Template') : undefined
          };
        }
      }

      const children = (top.element.children ? top.element.children.filter((e) => e.type === 'element') : []).map((e) => (
        { history: [...top.history, e as xmldoc.XmlElement], element: e }
      ));
      if (children.length > 0) {
        // has tag children
        nodeStack.push(...children.reverse());
      }
    }
    else {
      // ignore
    }
  }

  _customCompletionItems = _updateCompletionItems(_customAssets);
}

function subscribeToDocumentChanges(context: vscode.ExtensionContext): void {
  if (vscode.window.activeTextEditor) {
    refreshCustomAssets(vscode.window.activeTextEditor.document);
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        refreshCustomAssets(editor.document);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(e => refreshCustomAssets(e.document))
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(doc => refreshCustomAssets(undefined))
  );

}

export function registerGuidUtilsProvider(context: vscode.ExtensionContext): vscode.Disposable[] {
  loadVanillaAssets(context);
  loadGuidRanges(context);
  loadKeywordHelp(context);
  subscribeToDocumentChanges(context);

	return [
    vscode.Disposable.from(vscode.languages.registerHoverProvider({ language: 'xml', pattern: '**/assets.xml' }, { provideHover })), 
    vscode.Disposable.from(vscode.languages.registerCompletionItemProvider({ language: 'xml', pattern: '**/assets.xml' }, { provideCompletionItems }, '\''))
  ];
}

function provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
  const keyword = findKeywordBeforePosition(document, position);
  if (!keyword) {
    return undefined;
  }

  if (_customCompletionItems) {
    const customItems = _customCompletionItems[keyword.name];
    if (customItems) {
      return [ ..._vanillaCompletionItems[keyword.name], ...customItems ];
    }
  }

  return _completionItems[keyword.name];
}

function provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
  const keyword = findKeywordAtPosition(document, position);
  if (keyword && _keywordHelp) {
    const keywordHelp = _keywordHelp[keyword.name];
    if (keywordHelp) {
      for (let help of keywordHelp) {
        if (!help.parent || keyword.parent?.endsWith(help.parent)) {
          return { contents: help.help };
        }
      }
    }
  }

  const value = getValueAt(document.lineAt(position).text, position.character);
  if (!value) {
    return undefined;
  }

  if (-1 !== Object.keys(_TAGS_TO_COMPLETE).indexOf(value.name)) {
    const guid = value.text;
    if (guid) {
      const namedGuid = resolveGUID(guid);
      let name = [ ];
      if (namedGuid) {
        if (namedGuid.english) {
          name = [ `${namedGuid.template}: ${namedGuid.english} (${namedGuid.name})` ];
        }
        else {
          name = [ `${namedGuid.template}: ${namedGuid.name}` ];
        }
      }
      else {
        name = [ `GUID ${guid} not found.` ];
      }
      const range = resolveGuidRange(guid);
      const safe = (namedGuid || range.length > 0) ? [] : resolveSafeRange(guid);

      return { 
        contents: [ ...name, ...range, ...safe ]
      };
    }
  }

  return undefined;
}