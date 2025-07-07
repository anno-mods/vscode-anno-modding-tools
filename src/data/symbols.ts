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
import * as utils from '../other/utils';

export namespace SymbolRegistry {
  const _guidCache: { [index: string]: IAsset } = {};
  let _completionItems: GuidCompletionItems | undefined;

  const _parsedMods: Set<string> = new Set<string>();
  const _parsedFiles: Set<string> = new Set<string>();

  export function setCompletionItems(completion: GuidCompletionItems) {
    _completionItems = completion;
  }

  /** Scan GUIDs from folder excluding specified file.
   * Already scanned files will be skipped.
   */
  export function scanFolder(modId: string, modPath: string, exceptFilePath?: string) {
    if (_parsedMods.has(modPath)) {
      return;
    }
    _parsedMods.add(modPath);

    logger.log('read GUIDs from mod: ' + modPath);
    const files = glob.sync(ASSETS_FILENAME_PATTERN_STRICT, { cwd: modPath, nodir: true });
    for (let file of files) {
      const filePath = path.join(modPath, file);
      if (filePath === exceptFilePath) {
        continue;
      }

      if (_parsedFiles.has(filePath)) {
        continue;
      }
      _parsedFiles.add(filePath);

      logger.log('read GUIDs from file: ' + file);
      _readGuidsFromFile(filePath, modId);
    }
  }

  /** Scan GUIDs from text.
   * Use this to update scanned files.
   */
  export function scanText(modId: string, text: string, filePath: string) {
    // don't log. It would spam every few seconds on typing text
    // logger.log('read GUIDs from text: ' + filePath);
    _readGuidsFromText(text, filePath, modId);
  }

  function registerAll(assets: IAsset[]) {
    for (var asset of assets) {
      _guidCache[asset.guid] = asset;
    }
  }

  export function resolve(guid: string) : IAsset | undefined {
    _requestVanillaSymbols();

    let entry = _guidCache[guid];

    if (!entry && AllGuidCompletionItems.assets) {
      entry = AllGuidCompletionItems.assets[guid];
    }

    return entry;
  }

  function _readGuidsFromFile(filePath: string, modId: string) {
    const text = fs.readFileSync(filePath, 'utf8');
    _readGuidsFromText(text, filePath, modId);
  }

  function _readGuidsFromText(text: string, filePath: string, modId: string)
  {
    let xmlContent;
    try {
      xmlContent = new xmldoc.XmlDocument(text);
    }
    catch {
      // be quiet, this happens a lot during typing
      return;
    }

    _readGuidsFromXmlContent(xmlContent, filePath, modId);
  }

  function _readGuidsFromXmlContent(xmlContent: xmldoc.XmlDocument, filePath: string, modId: string)
  {
    let assetsDocument = new AssetsDocument(xmlContent, filePath);

    if (_completionItems) {
      _completionItems.addAssets(assetsDocument.assets, modId);
    }

    registerAll(Object.values(assetsDocument.assets));
  }

  let vanillaSymbols_ = false;
  function _requestVanillaSymbols() {
    if (vanillaSymbols_ || modContext.getVersion() === anno.GameVersion.Anno7) {
      return;
    }

    const vanillaPath = rda.getAssetsXml(modContext.getVersion());
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

    registerAll(Object.values(assetsDocument.assets));

    vanillaSymbols_ = true;
  }
}