import * as vscode from 'vscode';
import CfgDocumentSymbolProvider from './features/outline/cfgSymbolProvider';
import { registerGuidUtilsProvider } from './features/guidUtilsProvider';
import * as dds from './other/dds';
import * as rdp from './other/rdp';
import { AssetsSymbolProvider } from './features/outline/assetsSymbolProvider';
import { AssetsActionProvider } from './features/assetsActionProvider';
import * as AssetsDecorator from './features/assetsDecorator';
import * as AssetsWorkspaceSymbolProvider from './features/assetsSymbolProvider';
import * as CfgActionProvider from './features/cfgActionProvider';
import * as commands from './features/commands';

import * as logger from './other/logger';
import * as channel from './features/channel';
import * as cfgHoverProvider from './features/cfgHoverProvider';

export function activate(context: vscode.ExtensionContext) {
	logger.set(channel);

	rdp.init(context.asAbsolutePath('./external/'));
	dds.init(context.asAbsolutePath('./external/'));
	
	context.subscriptions.push(registerCfgLanguageFeatures('anno-cfg'));
	context.subscriptions.push(registerCfgLanguageFeatures('anno-cf7'));
	context.subscriptions.push(registerCfgLanguageFeatures('anno-ifo'));
	context.subscriptions.push(registerCfgLanguageFeatures('anno-prp'));
	context.subscriptions.push(...AssetsSymbolProvider.register(context));
	context.subscriptions.push(...AssetsActionProvider.register(context));
	context.subscriptions.push(...registerGuidUtilsProvider(context));
	context.subscriptions.push(...cfgHoverProvider.registerHoverProvider(context));
	AssetsDecorator.activate(context);
	CfgActionProvider.activate(context);
	AssetsWorkspaceSymbolProvider.activate(context);

	commands.registerCommands(context);
}

function registerCfgLanguageFeatures(language: string): vscode.Disposable {
	const selector: vscode.DocumentSelector = { language, scheme: '*' };
	const symbolProvider = new CfgDocumentSymbolProvider();
	return vscode.Disposable.from(
		vscode.languages.registerDocumentSymbolProvider(selector, symbolProvider)
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
