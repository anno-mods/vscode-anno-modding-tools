import * as vscode from 'vscode';

const xmlFormatter = require('xml-formatter') as (input: string, options?: any) => string;

export function registerFormatter(language: string): vscode.Disposable {
  return vscode.languages.registerDocumentFormattingEditProvider({ language, scheme: 'file' }, { provideDocumentFormattingEdits });
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
