import * as vscode from 'vscode';
import * as fs from 'fs';
import * as xmldoc from 'xmldoc';
import * as minimatch from 'minimatch';
import { AssetsTocProvider } from './outline/assetsTocProvider';
import { AssetsDocument, ASSETS_FILENAME_PATTERN } from '../other/assetsXml';

let assetsDocument: AssetsDocument | undefined;

import { AllGuidCompletionItems, GuidCompletionItems } from './guidCompletionItems';

export function resolveGUID(guid: string) {
  let entry = undefined;
  if (AllGuidCompletionItems.assets) {
    entry = AllGuidCompletionItems.assets[guid];
  }
  if (assetsDocument?.assets && !entry) {
    entry = assetsDocument.assets[guid];
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
    result.push(`${entry.name}'s GUID range. See [github.com/anno-mods/GuidRanges](https://github.com/anno-mods/GuidRanges)`);
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
  
  let path = assetsDocument?.getPath(position.line, keyword.position);
  return { ...keyword, path };
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
  const match = linePrefix.match(/[\s'"<\[](\w+)\s*(=\s*['"](\s*\d+\s*,\s*)*|>\s*)$/);
  if (!match) {
    return undefined;
  }

  return {
    name: match[1],
    text: line.substr(valueBegin, valueEnd - valueBegin)
  };
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

let _customCompletionItems: GuidCompletionItems | undefined = undefined;
export function refreshCustomAssets(document: vscode.TextDocument | undefined): void {
  if (!document || !minimatch(document.fileName, ASSETS_FILENAME_PATTERN)) {
    // _customAssets = undefined;
    // _customCompletionItems = undefined;
    return;
  }

  if (fs.existsSync(document.fileName) && fs.statSync(document.fileName).size > 1024 * 1024 * 20) {
    // ignore files above 20MB
    return;
  }
  const text = document.getText();
  if (text.length > 1024 * 1024 * 20) {
    // ignore files above 20MB
    return;
  }

  let xmlContent;
  try {
    xmlContent = new xmldoc.XmlDocument(text);
  }
  catch {
    // be quiet, this happens a lot during typing
    return;
  }

  assetsDocument = new AssetsDocument(xmlContent);

  _customCompletionItems = new GuidCompletionItems();
  _customCompletionItems.fromAssets(assetsDocument.assets, AllGuidCompletionItems.tags);
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
  AllGuidCompletionItems.load(context);
  loadGuidRanges(context);
  loadKeywordHelp(context);
  subscribeToDocumentChanges(context);

	return [
    vscode.Disposable.from(vscode.languages.registerHoverProvider({ language: 'xml', pattern: ASSETS_FILENAME_PATTERN }, { provideHover })), 
    vscode.Disposable.from(vscode.languages.registerCompletionItemProvider({ language: 'xml', pattern: ASSETS_FILENAME_PATTERN }, { provideCompletionItems }, '\'', '"'))
  ];
}

function provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
  const keyword = findKeywordBeforePosition(document, position);
  if (!keyword) {
    return undefined;
  }

  const useAnyTemplate = (keyword.type === 'xpath');

  // ignore path in case of xpath checks and allow all templates instead
  const path = keyword.type !== 'xpath' ? keyword.path : undefined;

  const vanillaItems = (useAnyTemplate ? AllGuidCompletionItems.AllItems : AllGuidCompletionItems.get(keyword.name, path)) ?? [];
  if (_customCompletionItems) {
    const customItems = useAnyTemplate ? _customCompletionItems.AllItems : _customCompletionItems.get(keyword.name, path);
    if (customItems) {
      return [ ... vanillaItems, ...customItems ];
    }
  }

  return vanillaItems;
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

  const path = assetsDocument?.getPath(position.line, position.character, true);
  if (AllGuidCompletionItems.get(value.name, path)) {
    const guid = value.text;
    if (guid) {
      const namedGuid = resolveGUID(guid);
      const templateText = namedGuid?.template ? `${namedGuid.template}: ` : '';
      let name = [ ];
      if (namedGuid) {
        if (namedGuid.english) {
          name = [ `${templateText}${namedGuid.english} (${namedGuid.name})` ];
        }
        else {
          name = [ `${templateText}${namedGuid.name}` ];
        }
      }
      else {
        name = [ `GUID ${guid} not found. Some assets like Audio are omitted due to performance.` ];
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