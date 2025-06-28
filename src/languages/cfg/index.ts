import * as vscode from 'vscode';

const xmlFormatter = require('xml-formatter') as (input: string, options?: any) => string;

import * as CfgActionProvider from './cfgActionProvider';
import * as cfgHoverProvider from './cfgHoverProvider';
import CfgDocumentSymbolProvider from './cfgSymbolProvider';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(registerCfgLanguageFeatures('anno-cfg'));
  context.subscriptions.push(registerCfgLanguageFeatures('anno-prp'));
  context.subscriptions.push(...cfgHoverProvider.registerHoverProvider(context));

  CfgActionProvider.activate(context);
}

export function registerCfgLanguageFeatures(language: string): vscode.Disposable {
  const selector: vscode.DocumentSelector = { language, scheme: '*' };
  const symbolProvider = new CfgDocumentSymbolProvider();
  return vscode.Disposable.from(
    vscode.languages.registerDocumentSymbolProvider(selector, symbolProvider),
    vscode.languages.registerDocumentFormattingEditProvider(language, { provideDocumentFormattingEdits })
  );
}

function provideDocumentFormattingEdits(document: vscode.TextDocument) {
  const originalText = document.getText();

  try {
    const formatted = xmlFormatter(originalText, {
      indentation: '  ',         // Two-space indentation
      collapseContent: true,     // Collapse text content when possible
      lineSeparator: '\n',
    });

    const range = new vscode.Range(
      document.positionAt(0),
      document.positionAt(originalText.length)
    );

    return [vscode.TextEdit.replace(range, formatted)];
  } catch (error) {
    vscode.window.showErrorMessage('XML formatting failed: ' + error);
    return [];
  }
}
