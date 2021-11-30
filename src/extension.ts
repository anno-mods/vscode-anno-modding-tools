import * as vscode from 'vscode';
import CfgDocumentSymbolProvider from './features/outline/cfgSymbolProvider';
import { registerGuidUtilsProvider } from './features/guidUtilsProvider';
import { FcConverter } from './features/commands/fcConverter';
import { DdsConverter } from './features/commands/ddsConverter';
import { AnnomodCommands } from './features/commands/annomod';
import { PropImporter } from './features/commands/propImporter';
import { InfoImporter } from './features/commands/infoImporter';
import { RdmGlbConverter } from './features/commands/rdmGlbConverter';
import { RdpConverter } from './features/commands/rdpConverter';
import { FcImporter } from './features/commands/fcImporter';
import * as dds from './other/dds';
import * as rdp from './other/rdp';
import { CfgYamlCommands } from './features/commands/cfgyaml';
import { AssetsSymbolProvider } from './features/outline/assetsSymbolProvider';
import { AssetsActionProvider } from './features/assetsActionProvider';

import * as logger from './other/logger';
import * as channel from './features/channel';

export function activate(context: vscode.ExtensionContext) {
	logger.set(channel);

	rdp.init(context.asAbsolutePath('./external/'));
	dds.init(context.asAbsolutePath('./external/'));
	
	context.subscriptions.push(registerCfgLanguageFeatures('anno-cfg'));
	context.subscriptions.push(registerCfgLanguageFeatures('anno-cf7'));
	context.subscriptions.push(registerCfgLanguageFeatures('anno-ifo'));
	context.subscriptions.push(registerCfgLanguageFeatures('anno-prp'));
	context.subscriptions.push(...FcConverter.register(context));
	context.subscriptions.push(...DdsConverter.register(context));
	context.subscriptions.push(...AnnomodCommands.register(context));
	context.subscriptions.push(...PropImporter.register(context));
	context.subscriptions.push(...InfoImporter.register(context));
	context.subscriptions.push(...RdmGlbConverter.register(context));
	context.subscriptions.push(...RdpConverter.register(context));
	context.subscriptions.push(...FcImporter.register(context));
	context.subscriptions.push(...CfgYamlCommands.register(context));
	context.subscriptions.push(...AssetsSymbolProvider.register(context));
	context.subscriptions.push(...AssetsActionProvider.register(context));
	context.subscriptions.push(...registerGuidUtilsProvider(context));
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
