import * as vscode from 'vscode';
import { registerGuidUtilsProvider } from './features/guidUtilsProvider';
import * as dds from './other/dds';
import * as rdp from './other/rdp';
import * as AssetsDecorator from './languages/xml/assetsDecorator';
import * as AssetsWorkspaceSymbolProvider from './languages/xml/assetsSymbolProvider';
import * as commands from './features/commands';
import * as cfg from './languages/cfg';
import * as cf7 from './languages/cf7';
import * as ifo from './languages/ifo';
import * as schemas from './languages/schemas';
import * as xml from './languages/xml';

import * as logger from './other/logger';
import * as channel from './features/channel';


export function activate(context: vscode.ExtensionContext) {
	logger.set(channel);

	rdp.init(context.asAbsolutePath('./external/'));
	dds.init(context.asAbsolutePath('./external/'));

	context.subscriptions.push(...registerGuidUtilsProvider(context));

	AssetsDecorator.activate(context);
	cfg.activate(context);
	cf7.activate(context);
	ifo.activate(context);
	xml.activate(context);
	schemas.activate(context);
	AssetsWorkspaceSymbolProvider.activate(context);

	commands.registerCommands(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}
