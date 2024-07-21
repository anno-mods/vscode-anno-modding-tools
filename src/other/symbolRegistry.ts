import * as fs from 'fs';
import { glob } from 'glob';
import * as path from 'path';
import * as xmldoc from 'xmldoc';
import { AssetsDocument, ASSETS_FILENAME_PATTERN_STRICT, IAsset } from '../other/assetsXml';
import * as logger from '../other/logger';
import { GuidCompletionItems } from '../features/guidCompletionItems';

export namespace SymbolRegistry {
  let guidCache_: { [index: string]: IAsset } = {};
  let completionItems_: GuidCompletionItems | undefined;

  let parsedMods_: Set<string> = new Set<string>();
  let parsedFiles_: Set<string> = new Set<string>();

  export function setCompletionItems(completion: GuidCompletionItems) {
    completionItems_ = completion;
  }

  /** Scan GUIDs from folder excluding specified file.
   * Already scanned files will be skipped.
   */
  export function scanFolder(modId: string, modPath: string, exceptFilePath?: string) {
    if (parsedMods_.has(modPath)) {
      return;
    }
    parsedMods_.add(modPath);

    logger.log('read GUIDs from mod: ' + modPath);
    const files = glob.sync(ASSETS_FILENAME_PATTERN_STRICT, { cwd: modPath, nodir: true });
    for (let file of files) {
      const filePath = path.join(modPath, file);
      if (filePath === exceptFilePath) {
        continue;
      }

      if (parsedFiles_.has(filePath)) {
        continue;
      }
      parsedFiles_.add(filePath);

      logger.log('read GUIDs from file: ' + file);
      readGuidsFromFile_(filePath, modId);
    }
  }

  /** Scan GUIDs from text.
   * Use this to update scanned files.
   */
  export function scanText(modId: string, text: string, filePath: string) {
    // don't log. It would spam every few seconds on typing text
    // logger.log('read GUIDs from text: ' + filePath);
    readGuidsFromText_(text, filePath, modId);
  }

  function registerAll(assets: IAsset[]) {
    for (var asset of assets) {
      guidCache_[asset.guid] = asset;
    }
  }

  function register(asset: IAsset) {
    guidCache_[asset.guid] = asset;
  }

  export function resolve(guid: string) : IAsset | undefined {
    return guidCache_[guid];
  }

  function readGuidsFromFile_(filePath: string, modId: string) {
    const text = fs.readFileSync(filePath, 'utf8');
    readGuidsFromText_(text, filePath, modId);
  }

  function readGuidsFromText_(text: string, filePath: string, modId: string)
  {
    let xmlContent;
    try {
      xmlContent = new xmldoc.XmlDocument(text);
    }
    catch {
      // be quiet, this happens a lot during typing
      return;
    }

    readGuidsFromXmlContent_(xmlContent, filePath, modId);
  }

  function readGuidsFromXmlContent_(xmlContent: xmldoc.XmlDocument, filePath: string, modId: string)
  {
    let assetsDocument = new AssetsDocument(xmlContent, filePath);

    if (completionItems_) {
      completionItems_.addAssets(assetsDocument.assets, modId);
    }

    registerAll(Object.values(assetsDocument.assets));
  }
}