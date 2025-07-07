import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import * as anno from '../anno';
import * as rdaConsole from '../tools/rdaConsole';
import * as logger from '../other/logger';

let _storageFolder: string;
let _asAbsolutePath: (relative: string) => string

export function init(context: vscode.ExtensionContext) {
  _storageFolder = context.globalStorageUri.fsPath;
  _asAbsolutePath = context.asAbsolutePath;
}

export function get(relativePath: string, version: anno.GameVersion): string | undefined {
  if (version === anno.GameVersion.Anno8) {
    return extractFromRda(relativePath, version);
  }
  else if (version === anno.GameVersion.Anno7) {
    return selectFromFolder(relativePath, version);
  }

  logger.error(`Couldn't find '${relativePath}'`);
  return undefined;
}

export function getPatchTarget(filePath: string, version: anno.GameVersion, modRoot?: string) {
  const anno8 = version === anno.GameVersion.Anno8;
  const basePath = anno8 ? anno.ANNO8_ASSETS_PATH : anno.ANNO7_ASSETS_PATH;
  const basename = path.basename(filePath, path.extname(filePath));

  if (filePath.endsWith('export.bin.xml') || path.dirname(filePath).endsWith("infotips")) {
    return get('data/infotips/export.bin', version);
  }
  else if (basename.indexOf("templates") >= 0) {
    // TODO
    return get(path.join(basePath, 'templates.xml'), version);
  }
  else if (basename.indexOf("texts_") >= 0) {
    // TODO
    return get(path.join((anno8 ? 'data/base/config/gui/' : 'data/config/gui/') + basename + '.xml'), version);
  }
  else if (modRoot && (filePath.endsWith('.cfg.xml') || filePath.endsWith('.fc.xml'))) {
    // TODO
    const relative = path.relative(modRoot, filePath);
    return get(relative.substring(0, relative.length - 4), version);
  }

  return get(path.join(basePath, 'assets.xml'), version);
}

export function getAssetsXml(version: anno.GameVersion) {
  const anno8 = version === anno.GameVersion.Anno8;
  const basePath = anno8 ? anno.ANNO8_ASSETS_PATH : anno.ANNO7_ASSETS_PATH;
  return get(path.join(basePath, 'assets.xml'), version);
}

function extractFromRda(relativePath: string, version: anno.GameVersion) {

  const gamePath = ensureGamePath();
  if (!gamePath) {
    return undefined; // TODO error handling
  }

  const rdaCachePath = path.join(_storageFolder, 'rda' + version.toString());
  const absolutePath = path.join(rdaCachePath, relativePath);

  if (fs.existsSync(absolutePath)) {
    // TODO timestamp, need to refresh?
    // TODO delete if it needs refresh
    return absolutePath;
  }

  const rdaPath = path.join(gamePath, 'maindata\\config.rda');

  const success = rdaConsole.extract(rdaPath, rdaCachePath, relativePath, _asAbsolutePath)
  if (!success) {
    logger.error(`Couldn't extract '${relativePath}' from 'maindata/config.rda'`);
  }
  return absolutePath;
}

function selectFromFolder(relativePath: string, version: anno.GameVersion) {
  // TODO ensure

  const config = vscode.workspace.getConfiguration('anno'); // file context, vscode.Uri.file(filePath));
  const annoRda: string = config.get('rdaFolder') || "";

  return path.join(annoRda, relativePath);
}

function ensureGamePath(): string | undefined {
  // TODO checks
  return vscode.workspace.getConfiguration('anno').get<string>('117.gamePath');
}
