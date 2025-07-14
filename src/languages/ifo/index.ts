import * as vscode from 'vscode';

import * as cfg from '../cfg';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.Disposable.from(
    ...cfg.registerCfgLanguageFeatures('anno-ifo')
  ));
}
