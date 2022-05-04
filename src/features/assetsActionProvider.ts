import * as vscode from 'vscode';

const DEPRECATED_ALL = '190611';
const DEPRECATED_ALL2 = '193879';
const DEPRECATED_ALL_FIX = '368';
const DEPRECATED_ALL_CODE = 'all_buildings_with_maintenance_DONTUSE';

export class AssetsActionProvider {
  public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const diagnostics = vscode.languages.createDiagnosticCollection("assets-xml");
    subscribeToDocumentChanges(context, diagnostics);

    const selector: vscode.DocumentSelector = { language: 'xml', scheme: '*', pattern: '{**/assets.xml,**/tests/*-input.xml,**/tests/*-expectation.xml}' };
    return [
      diagnostics,
      vscode.languages.registerCodeActionsProvider(selector, new AssetsCodeActionProvider(), {
        providedCodeActionKinds: AssetsCodeActionProvider.providedCodeActionKinds
      })
    ];
  }
}

function includesAsWord(line: string, text: string)
{
  const pos = line.indexOf(text);
  if (pos <= 0) return false;

  const charBefore = line.charAt(pos - 1);
  const charAfter = line.charAt(pos + text.length);

  return (charBefore === '\'' || charAfter === '\'' ||
    charBefore === '"' || charAfter === '"' ||
    charBefore === ',' && charAfter === ',')
}

export function refreshDiagnostics(doc: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
  const diagnostics: vscode.Diagnostic[] = [];

  for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
    const lineOfText = doc.lineAt(lineIndex);
    if (includesAsWord(lineOfText.text, DEPRECATED_ALL)) {
      diagnostics.push(createDiagnostic(doc, lineOfText, lineIndex));
    }
    else if (includesAsWord(lineOfText.text, DEPRECATED_ALL2)) {
      diagnostics.push(createDiagnostic2(doc, lineOfText, lineIndex));
    }
  }

  collection.set(doc.uri, diagnostics);
}

function createDiagnostic(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number): vscode.Diagnostic {
  const index = lineOfText.text.indexOf(`${DEPRECATED_ALL}`);
  const range = new vscode.Range(lineIndex, index, lineIndex, index + DEPRECATED_ALL.length);

  const diagnostic = new vscode.Diagnostic(range,
    `\`${DEPRECATED_ALL}\` is deprecated and won't work with Captain of Industry properly. Use \`${DEPRECATED_ALL_FIX}\` instead.`,
    vscode.DiagnosticSeverity.Error);
  diagnostic.code = DEPRECATED_ALL_CODE;
  return diagnostic;
}

// TODO this is not how you do things 😆
function createDiagnostic2(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number): vscode.Diagnostic {
  const index = lineOfText.text.indexOf(`${DEPRECATED_ALL2}`);
  const range = new vscode.Range(lineIndex, index, lineIndex, index + DEPRECATED_ALL2.length);

  const diagnostic = new vscode.Diagnostic(range,
    `\`${DEPRECATED_ALL2}\` is deprecated and won't work with Captain of Industry properly. Use \`${DEPRECATED_ALL_FIX}\` instead.`,
    vscode.DiagnosticSeverity.Error);
  diagnostic.code = DEPRECATED_ALL_CODE;
  return diagnostic;
}

export function subscribeToDocumentChanges(context: vscode.ExtensionContext, diagnostics: vscode.DiagnosticCollection): void {
  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(vscode.window.activeTextEditor.document, diagnostics);
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        refreshDiagnostics(editor.document, diagnostics);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, diagnostics))
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(doc => diagnostics.delete(doc.uri))
  );

}

export class AssetsCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix
  ];

  provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[] {
    return context.diagnostics
      .filter(diagnostic => diagnostic.code === DEPRECATED_ALL_CODE)
      .map(diagnostic => this.createCommandCodeAction(diagnostic, document.uri));
  }

  private createCommandCodeAction(diagnostic: vscode.Diagnostic, uri: vscode.Uri): vscode.CodeAction {
    const action = new vscode.CodeAction('Fix it', vscode.CodeActionKind.QuickFix);
    action.edit = new vscode.WorkspaceEdit();
    action.edit.replace(uri, diagnostic.range, DEPRECATED_ALL_FIX);
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    return action;
  }
}