import * as fs from 'fs';
import { glob } from 'glob';
import * as path from 'path';
import * as xmldoc from 'xmldoc';

import * as rda from './rda';
import * as anno from '../anno';
import * as modContext from '../editor/modContext';
import { AllGuidCompletionItems, GuidCompletionItems } from '../features/guidCompletionItems';
import { AssetsDocument, ASSETS_FILENAME_PATTERN_STRICT, IAsset } from '../other/assetsXml';
import * as logger from '../other/logger';

type GuidCache = Map<string, IAsset>;

export namespace SymbolRegistry {
  const _guidCache7: GuidCache = new Map<string, IAsset>();
  const _guidCache8: GuidCache = new Map<string, IAsset>();

  let _completionItems: GuidCompletionItems | undefined;

  const _parsedMods: Set<string> = new Set<string>();
  const _parsedFiles: Set<string> = new Set<string>();

  function getCache(version?: anno.GameVersion) {
    if (!version) {
      version = anno.GameVersion.Anno7;
    }

    return version === anno.GameVersion.Anno7 ? _guidCache7 : _guidCache8;
  }

  export function setCompletionItems(completion: GuidCompletionItems) {
    _completionItems = completion;
  }

  /** Scan GUIDs from folder excluding specified file.
   * Already scanned files will be skipped.
   */
  export function scanFolder(modinfo: anno.ModInfo, exceptFilePath?: string) {
    if (_parsedMods.has(modinfo.path)) {
      return;
    }
    _parsedMods.add(modinfo.path);

    logger.log(`read ${anno.gameVersionName(modinfo.game)} GUIDs from mod: '${modinfo.path}'`);
    const files = glob.sync(ASSETS_FILENAME_PATTERN_STRICT, { cwd: modinfo.path, nodir: true });
    for (let file of files) {
      const filePath = path.join(modinfo.path, file);
      if (filePath === exceptFilePath) {
        continue;
      }

      if (_parsedFiles.has(filePath)) {
        continue;
      }
      _parsedFiles.add(filePath);

      logger.log('read GUIDs from file: ' + file);
      _readGuidsFromFile(filePath, modinfo);
    }
  }

  /** Scan GUIDs from text.
   * Use this to update scanned files.
   */
  export function scanText(modinfo: anno.ModInfo, text: string, filePath: string) {
    // don't log. It would spam every few seconds on typing text
    // logger.log('read GUIDs from text: ' + filePath);
    _readGuidsFromText(text, filePath, modinfo);
  }

  function registerAll(assets: IAsset[], version: anno.GameVersion) {
    for (var asset of assets) {
      getCache(version).set(asset.guid, asset);
    }
  }

  export function resolve(guid: string, version?: anno.GameVersion) : IAsset | undefined {
    version ??= modContext.getVersion();

    _useVanillaSymbols(version);

    let entry = getCache(version).get(guid);

    if (!entry && AllGuidCompletionItems.assets) {
      entry = AllGuidCompletionItems.assets[guid];
    }

    return entry;
  }

  function _readGuidsFromFile(filePath: string, modinfo: anno.ModInfo) {
    const text = fs.readFileSync(filePath, 'utf8');
    _readGuidsFromText(text, filePath, modinfo);
  }

  function _readGuidsFromText(text: string, filePath: string, modinfo: anno.ModInfo)
  {
    let xmlContent;
    try {
      xmlContent = new xmldoc.XmlDocument(text);
    }
    catch {
      // be quiet, this happens a lot during typing
      return;
    }

    _readGuidsFromXmlContent(xmlContent, filePath, modinfo);
  }

  function _readGuidsFromXmlContent(xmlContent: xmldoc.XmlDocument, filePath: string, modinfo: anno.ModInfo)
  {
    let assetsDocument = new AssetsDocument(xmlContent, filePath);

    if (_completionItems) {
      _completionItems.addAssets(assetsDocument.assets, modinfo.id);
    }

    registerAll(Object.values(assetsDocument.assets), modinfo.game);
  }

  let vanillaSymbols_ = false;
  function _useVanillaSymbols(version?: anno.GameVersion) {
    version ??= modContext.getVersion();

    if (vanillaSymbols_ || version === anno.GameVersion.Anno7) {
      return;
    }

    const vanillaPath = rda.getAssetsXml(version);
    if (!vanillaPath) {
      return;
    }

    let xmlContent: xmldoc.XmlDocument;
    try {
      xmlContent = new xmldoc.XmlDocument(fs.readFileSync(vanillaPath, 'utf8'));
    }
    catch {
      // be quiet, this happens a lot during typing
      return;
    }

    let assetsDocument = new AssetsDocument(xmlContent, vanillaPath);

    for (var guid of Object.keys(assetsDocument.assets)) {
      assetsDocument.assets[guid].location = undefined;
    }

    registerAll(Object.values(assetsDocument.assets), version);

    vanillaSymbols_ = true;
  }
}