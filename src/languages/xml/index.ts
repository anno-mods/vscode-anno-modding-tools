import * as vscode from 'vscode';

import { AssetsSymbolProvider } from './assetsOutlineProvider';
import { AssetsActionProvider } from './assetsActionProvider';
import { registerFolding } from './folding';
import { registerFormatter } from './formatter';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.Disposable.from(
      ...AssetsSymbolProvider.register(context),
      ...AssetsActionProvider.register(context),
      registerFolding('anno-xml'),
      registerFormatter('anno-xml'))
  );
}
