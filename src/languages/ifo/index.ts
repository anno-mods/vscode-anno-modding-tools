import * as vscode from 'vscode';

import * as cfg from '../cfg';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(cfg.registerCfgLanguageFeatures('anno-ifo'));
}
