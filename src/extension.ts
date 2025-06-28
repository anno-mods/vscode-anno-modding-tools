import * as vscode from 'vscode';
import CfgDocumentSymbolProvider from './languages/cfg/cfgSymbolProvider';
import { registerGuidUtilsProvider } from './features/guidUtilsProvider';
import * as dds from './other/dds';
import * as rdp from './other/rdp';
import { AssetsSymbolProvider } from './features/outline/assetsOutlineProvider';
import { AssetsActionProvider } from './features/assetsActionProvider';
import * as AssetsDecorator from './features/assetsDecorator';
import * as AssetsWorkspaceSymbolProvider from './features/assetsSymbolProvider';
import * as commands from './features/commands';
import * as cfg from './languages/cfg';
import * as cf7 from './languages/cf7';
import * as ifo from './languages/ifo';

import * as logger from './other/logger';
import * as channel from './features/channel';


export function activate(context: vscode.ExtensionContext) {
	logger.set(channel);

	rdp.init(context.asAbsolutePath('./external/'));
	dds.init(context.asAbsolutePath('./external/'));

	context.subscriptions.push(...AssetsSymbolProvider.register(context));
	context.subscriptions.push(...AssetsActionProvider.register(context));
	context.subscriptions.push(...registerGuidUtilsProvider(context));

	AssetsDecorator.activate(context);
	cfg.activate(context);
	cf7.activate(context);
	ifo.activate(context);
	AssetsWorkspaceSymbolProvider.activate(context);

	commands.registerCommands(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}
