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
import { GamePaths } from '../../editor/gamePaths';

export function registerCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.Disposable.from(
		...FcConverter.register(context),
		...DdsConverter.register(context),
		...DeployCommand.register(context),
		...PropImporter.register(context),
		...InfoImporter.register(context),
		...RdmGlbConverter.register(context),
		...GltfRdmConverter.register(context),
		...RdpConverter.register(context),
		...FcImporter.register(context),
		...CfgYamlCommands.register(context),
		...ShowDiffCommand.register(context),
		...CheckLoca.register(context),
		...ImportLoca.register(context),
		...GuidCounter.register(context)
	));
}
