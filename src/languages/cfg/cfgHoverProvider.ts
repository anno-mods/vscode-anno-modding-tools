import * as vscode from 'vscode';
import * as fs from 'fs';

function findKeywordAtPosition(document: vscode.TextDocument, position: vscode.Position) {
  const word = document.getWordRangeAtPosition(position);
  if (!word) {
    return undefined;
  }

  // let parent = undefined;
  // if (position.line > 0) {
  //   parent = new AssetsTocProvider(document).getParentPath(position.line, position.character);
  // }

  return {
    name: document.lineAt(word.start.line).text.substr(word.start.character, word.end.character - word.start.character),
    parent: undefined
  };
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

export function registerHoverProvider(context: vscode.ExtensionContext): vscode.Disposable[] {
  loadKeywordHelp(context);

	return [
    vscode.Disposable.from(vscode.languages.registerHoverProvider({ language: 'anno-ifo', scheme: 'file' }, { provideHover })), 
  ];
}

function provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
  const keyword = findKeywordAtPosition(document, position);
  if (keyword && _keywordHelp) {
    const keywordHelp = _keywordHelp[keyword.name];
    if (keywordHelp) {
      for (let help of keywordHelp) {
        if (!help.parent /*|| keyword.parent?.endsWith(help.parent)*/) {
          return { contents: help.help };
        }
      }
    }
  }

  return undefined;
}