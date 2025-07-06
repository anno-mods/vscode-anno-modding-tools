import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import * as rdaConsole from '../tools/rdaConsole';
import * as utils from '../other/utils';

let _storageFolder: string;
let _asAbsolutePath: (relative: string) => string

export function init(context: vscode.ExtensionContext) {
  _storageFolder = context.globalStorageUri.fsPath;
  _asAbsolutePath = context.asAbsolutePath;
}

export function get(relativePath: string, version: utils.GameVersion): string | undefined {
  if (version === utils.GameVersion.Anno8) {
    return extractFromRda(relativePath, version);
  }
  else if (version === utils.GameVersion.Anno7) {
    return selectFromFolder(relativePath, version);
  }

  // TODO error handling
  return undefined;
}

export function getPatchTarget(filePath: string, version: utils.GameVersion, modRoot?: string) {
  const anno8 = version === utils.GameVersion.Anno8;
  const basePath = anno8 ? utils.ANNO8_ASSETS_PATH : utils.ANNO7_ASSETS_PATH;
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

function extractFromRda(relativePath: string, version: utils.GameVersion) {

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

  const configRdaPath = path.join(gamePath, 'maindata\\config.rda');

  const _ = rdaConsole.extract(configRdaPath, rdaCachePath, relativePath, _asAbsolutePath)
  return absolutePath;
}

function selectFromFolder(relativePath: string, version: utils.GameVersion) {
  // TODO ensure

  const config = vscode.workspace.getConfiguration('anno'); // file context, vscode.Uri.file(filePath));
  const annoRda: string = config.get('rdaFolder') || "";

  return path.join(annoRda, relativePath);
}

function ensureGamePath(): string | undefined {
  // TODO checks
  return vscode.workspace.getConfiguration('anno').get<string>('117.gamePath');
}
