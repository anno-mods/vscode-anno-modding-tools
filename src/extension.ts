import * as vscode from 'vscode';
import CfgDocumentSymbolProvider from './features/cfgSymbolProvider';
import { registerGuidUtilsProvider } from './features/guidUtilsProvider';
import { FcConverter } from './features/fcConverter';
import { DdsConverter } from './features/ddsConverter';
import { ModCompiler } from './features/modCompiler';
import { PropImporter } from './features/propImporter';
import { InfoImporter } from './features/infoImporter';
import { RdmGlbConverter } from './features/rdmGlbConverter';
import { RdpConverter } from './features/rdpConverter';
import { FcImporter } from './features/fcImporter';
import * as dds from './other/dds';
import * as rdp from './other/rdp';
import { CfgYamlConverter } from './converter/cfgYamlConverter';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(registerCfgLanguageFeatures('anno-cfg'));
	context.subscriptions.push(registerCfgLanguageFeatures('anno-cf7'));
	context.subscriptions.push(registerCfgLanguageFeatures('anno-ifo'));
	context.subscriptions.push(...FcConverter.register(context));
	context.subscriptions.push(...DdsConverter.register(context));
	context.subscriptions.push(...ModCompiler.register(context));
	context.subscriptions.push(...PropImporter.register(context));
	context.subscriptions.push(...InfoImporter.register(context));
	context.subscriptions.push(...RdmGlbConverter.register(context));
	context.subscriptions.push(...registerGuidUtilsProvider(context));
	context.subscriptions.push(...RdpConverter.register(context));
	context.subscriptions.push(...FcImporter.register(context));
	context.subscriptions.push(...CfgYamlConverter.register(context));

	rdp.init(context.asAbsolutePath('./external/'));
	dds.init(context.asAbsolutePath('./external/'));
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
