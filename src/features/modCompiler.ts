import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

import { StaticConverter } from '../converter/staticConverter';
import { Cf7Converter } from '../converter/cf7Converter';
import { TextureConverter } from '../converter/textureConverter';
import { GltfConverter } from '../converter/gltfConverter';
import { ModinfoConverter } from '../converter/modinfoConverter';

import * as channel from '../other/outputChannel';

export interface IConverter {
  getName(): string;
  run(files: string[], sourceFolder: string, outFolder: string, options: { 
    context: vscode.ExtensionContext, 
    cache: string,
    modJson: any,
    converterOptions: any
  }): Promise<void>;
}

export class ModCompiler {
  converters: { [index: string]: IConverter } = {};
  context: vscode.ExtensionContext;

	public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.buildMod', async (fileUri) => {
        await ModCompiler._commandCompileMod(fileUri?.fsPath, context);
      }),
    ];

    return disposable;
	}

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private static async _commandCompileMod(filePath: string | undefined, context: vscode.ExtensionContext) {
    let mods;
    if (filePath) {
      mods = [ { label: path.basename(filePath), detail: filePath } ];
    }
    else {
      mods = ModCompiler._findMods();
      if (mods.length === 0) {
        vscode.window.showWarningMessage('No annomod.json found in workspace to build.');
        return;
      }
    }

    const selectedMods = [];
    if (mods.length > 1) {
      const result = await vscode.window.showQuickPick([{ label: 'All' }, ...mods], {
          title: 'Which project?',
          placeHolder: 'Pick a project'
        });
      if (!result) {
        return;
      }
      if (!result.detail) { // item 'All' has no detail
        selectedMods.push(...mods);
      }
      else {
        selectedMods.push(result);
      }
    }
    else {
      selectedMods.push(mods[0]);
    }

    const compiler = new ModCompiler(context);
    compiler.addConverter(new StaticConverter());
    compiler.addConverter(new Cf7Converter());
    compiler.addConverter(new TextureConverter());
    compiler.addConverter(new GltfConverter());
    compiler.addConverter(new ModinfoConverter());

    channel.show();
    for (const mod of selectedMods) {
      await compiler.compile(mod.detail as string);
    }
  }

  private static _findMods() {
    const mods: vscode.QuickPickItem[] = [];
    const workspaces = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath) || [];
    for (const folder of workspaces) {
      mods.push(...(glob.sync('**/annomod.json', { cwd: folder, nodir: true }).map((e) => ({
        detail: path.join(folder, e),
        label: path.dirname(e)
      }))));
    }
    return mods;
  }

  public addConverter(converter: IConverter) {
    this.converters[converter.getName()] = converter;
  }

  public async compile(filePath: string) {
    channel.log('build ' + filePath);
    const modJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let sourceFolder = path.dirname(filePath) + '/' + modJson.src;
    if (!sourceFolder.endsWith('/')) {
      sourceFolder += '/';
    }
    const outFolder = this._getOutFolder(filePath, modJson);
    const cacheFolder = path.join(path.dirname(filePath), '.modcache');
    
    channel.log('source: ' + sourceFolder);
    channel.log('out: ' + outFolder);

    if (!fs.existsSync(sourceFolder)) {
      vscode.window.showErrorMessage('Incorrect source folder: ' + sourceFolder);
      return;
    }

    if (!fs.existsSync(outFolder)) {
      fs.mkdirSync(outFolder, { recursive: true });
    }
    for (const entry of modJson.converter) {
      const allFiles = entry.pattern ? glob.sync(entry.pattern, { cwd: sourceFolder, nodir: true }) : [];
      const converter = this.converters[entry.action];
      if (converter) {
        channel.log(`Run ${entry.action} converter` + (entry.pattern?`: ${entry.pattern}`:''));
        await converter.run(allFiles, sourceFolder, outFolder, { context: this.context, cache: cacheFolder, modJson, converterOptions: entry });
      }
      else {
        channel.log('Error: no converter with name: ' + entry.action);
      }
    }
    channel.log('done');
  }

  private _getOutFolder(filePath: string, modJson: any) {
    let outFolder = modJson.out;
    outFolder = outFolder.replace('${modName}', '[' + modJson.modinfo?.Category?.English + '] ' + modJson.modinfo?.ModName?.English);
    const uri = vscode.window.activeTextEditor?.document?.uri;
    const config = vscode.workspace.getConfiguration('anno', uri);
    outFolder = path.normalize(outFolder.replace('${annoMods}', config.get('modsFolder') || ""));
    if (!path.isAbsolute(outFolder)) {
      outFolder = path.join(path.dirname(filePath), outFolder);
    }
    return outFolder;
  }
}