import * as vscode from 'vscode';

import * as CfgActionProvider from './cfgActionProvider';
import * as cfgHoverProvider from './cfgHoverProvider';
import CfgDocumentSymbolProvider from './cfgSymbolProvider';

import { registerFormatter } from '../xml/formatter';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.Disposable.from(
    ...registerCfgLanguageFeatures('anno-cfg'),
    ...registerCfgLanguageFeatures('anno-prp'),
    ...cfgHoverProvider.registerHoverProvider(context)
  ));

  CfgActionProvider.activate(context);
}

export function registerCfgLanguageFeatures(language: string): vscode.Disposable[] {
  const selector: vscode.DocumentSelector = { language, scheme: 'file' };
  const symbolProvider = new CfgDocumentSymbolProvider();
  return [
    vscode.languages.registerDocumentSymbolProvider(selector, symbolProvider),
    registerFormatter(language)
  ];
}

