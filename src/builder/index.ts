import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

import { Converter, ILogger } from './Converter';
import { StaticConverter } from './converter/static';
import { Cf7Converter } from './converter/cf7';
import { TextureConverter } from './converter/texture';
import { GltfConverter } from './converter/gltf';
import { ModinfoConverter } from './converter/modinfo';
import { RdpxmlConverter } from './converter/rdpxml';
import { CfgYamlConverter } from './converter/cfgyaml';

import * as rdp from '../other/rdp';
import * as dds from '../other/dds';

import * as xmltest from '../other/xmltest';
import { ModCache } from './ModCache';
import * as utils from '../other/utils';

export class ModBuilder {
  _converters: { [index: string]: Converter } = {};
  _logger;
  _asAbsolutePath;
  _variables;

  public constructor(logger: ILogger, asAbsolutePath: (relative: string) => string, variables: { [index: string]: string }) {
    rdp.init(asAbsolutePath('./external/'));
    dds.init(asAbsolutePath('./external/'));

    this._logger = logger;
    this._asAbsolutePath = asAbsolutePath;
    this._variables = variables;

    this._addConverter(new StaticConverter());
    this._addConverter(new Cf7Converter());
    this._addConverter(new TextureConverter());
    this._addConverter(new GltfConverter());
    this._addConverter(new ModinfoConverter());
    this._addConverter(new RdpxmlConverter());
    this._addConverter(new CfgYamlConverter());
  }

  private _addConverter(converter: Converter) {
    this._converters[converter.getName()] = converter;
    converter.init(this._logger, this._asAbsolutePath);
  }

  public async build(filePath: string) {
    this._logger.log('Build ' + filePath);
    const modJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let sourceFolder = path.dirname(filePath) + '/' + modJson.src;
    if (!sourceFolder.endsWith('/')) {
      sourceFolder += '/';
    }
    const outFolder = this._getOutFolder(filePath, modJson);
    const cache = path.join(path.dirname(filePath), '.modcache');
    
    this._logger.log('Target folder: ' + outFolder);

    if (!fs.existsSync(sourceFolder)) {
      this._logger.error('Incorrect source folder: ' + sourceFolder);
      return;
    }

    utils.ensureDir(outFolder);
    const modCache = new ModCache(path.dirname(filePath), this._variables['annoRda']);
    modCache.load();

    for (const entry of modJson.converter) {
      const allFiles = entry.pattern ? glob.sync(entry.pattern, { cwd: sourceFolder, nodir: true }) : [];
      const converter = this._converters[entry.action];
      if (converter) {
        this._logger.log(`${entry.action}` + (entry.pattern?`: ${entry.pattern}`:''));
        const result = await converter.run(allFiles, sourceFolder, outFolder, {
          cache,
          modJson,
          converterOptions: entry,
          variables: this._variables,
          modCache
        });
        if (!result) {
          return false;
        }
      }
      else {
        this._logger.error('Error: no converter with name: ' + entry.action);
        return false;
      }
    }

    if (!modCache.isCiRun()) {
      modCache.saveVanilla();
    }
    modCache.save();

    const testFolder = path.join(sourceFolder, 'tests');
    if (fs.existsSync(sourceFolder)) {
      this._logger.log(`Run tests from ${testFolder}`);
      if (!xmltest.test(testFolder, path.join(sourceFolder, 'data/config/export/main/asset/assets.xml'), this._asAbsolutePath, cache)) {
        return false;
      }
    }
    else {
      this._logger.log(`No test folder available: ${testFolder}`);
    }

    this._logger.log(`${this._getModName(filePath, modJson)} done`);
    return true;
  }

  private _getOutFolder(filePath: string, modJson: any) {
    let outFolder = modJson.out;
    outFolder = outFolder.replace('${modName}', this._getModName(filePath, modJson));
    if (this._variables['annoMods']) {
      outFolder = path.normalize(outFolder.replace('${annoMods}', this._variables['annoMods']));
    }
    if (!path.isAbsolute(outFolder)) {
      outFolder = path.join(path.dirname(filePath), outFolder);
    }
    return outFolder;
  }

  private _getModName(filePath: string, modJson: any) {
    if (!modJson.modinfo?.ModName?.English) {
      return path.dirname(path.dirname(filePath));
    }
    return `[${modJson.modinfo?.Category?.English}] ${modJson.modinfo?.ModName?.English}`;
  }
}
