import * as vscode from 'vscode';
import { FcConverter } from './fcConverter';
import { DdsConverter } from './ddsConverter';
import { DeployCommand } from './deploy';
import { PropImporter } from './/propImporter';
import { InfoImporter } from './infoImporter';
import { RdmGlbConverter } from './rdmGlbConverter';
import { GltfRdmConverter } from './gltfRdmConverter';
import { RdpConverter } from './rdpConverter';
import { FcImporter } from './fcImporter';
import { CfgYamlCommands } from './cfgyaml';
import { ShowDiffCommand } from './showDiff';
import { CheckLoca } from './checkLoca';
import { ImportLoca } from './importLoca';
import { GuidCounter } from '../guidCounter';

export function registerCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(...FcConverter.register(context));
	context.subscriptions.push(...DdsConverter.register(context));
	context.subscriptions.push(...DeployCommand.register(context));
	context.subscriptions.push(...PropImporter.register(context));
	context.subscriptions.push(...InfoImporter.register(context));
	context.subscriptions.push(...RdmGlbConverter.register(context));
	context.subscriptions.push(...GltfRdmConverter.register(context));
	context.subscriptions.push(...RdpConverter.register(context));
	context.subscriptions.push(...FcImporter.register(context));
	context.subscriptions.push(...CfgYamlCommands.register(context));
	context.subscriptions.push(...ShowDiffCommand.register(context));
  // context.subscriptions.push(...RunTests.register(context));
	context.subscriptions.push(...CheckLoca.register(context));
	context.subscriptions.push(...ImportLoca.register(context));

	context.subscriptions.push(...GuidCounter.register(context));
}
