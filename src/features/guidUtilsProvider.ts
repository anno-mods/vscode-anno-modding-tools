import path = require('path');
import * as vscode from 'vscode';
import * as fs from 'fs';
import { type } from 'os';

const _TAGS_TO_COMPLETE: { [index: string]: string[] } = {
  /* eslint-disable @typescript-eslint/naming-convention */
  'Ingredient': [ 'Product' ],
  'Product': [ 'Product' ],
  'ItemLink': [ 'GuildhouseItem', 'HarborOfficeItem', 'TownhallItem', 'CultureItem', 'VehicleItem' ],
  'Good': [ 'Product' ], // TODO and items?
  'GUID': [ '*' ],
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
  const vanilla = _vanillaAssets || {};

  let entry = undefined;
  if (vanilla) {
    entry = vanilla[guid];
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
    parent = _findLastKeywordInLine(document.lineAt(position.line - 1).text + document.lineAt(position).text.substring(0, position.character));
  }
  else {
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
let _keywordHelp: { [index: string]: IKeywordHelp } | undefined = undefined;
async function loadKeywordHelp(context: vscode.ExtensionContext) {
  if (!_keywordHelp) {
    const assetPath = context.asAbsolutePath('./languages/keywords.json');
    const parsed = JSON.parse(fs.readFileSync(assetPath, { encoding: 'utf8' }));
    _keywordHelp = {};
    for (let entryKey of Object.keys(parsed)) {
      const entryValue = parsed[entryKey];
      _keywordHelp[entryKey] = Array.isArray(entryValue) ? { help: entryValue } : entryValue;
    }
  }

  return _keywordHelp;
}

export function registerGuidUtilsProvider(context: vscode.ExtensionContext): vscode.Disposable[] {
  loadVanillaAssets(context);
  loadGuidRanges(context);
  loadKeywordHelp(context);

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
  // TODO scan open file for GUIDs
  return _completionItems[keyword.name];
}

function provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
  const word = findKeywordAtPosition(document, position);
  if (word && _keywordHelp) {
    console.log(word);
    const text = word.name;
    const keywordHelp = _keywordHelp[text];
    if (keywordHelp) {
      return { contents: keywordHelp.help };
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
        name = [ `${namedGuid.template}: ${namedGuid.english} (${namedGuid.name})` ];
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