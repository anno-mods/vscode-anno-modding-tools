import * as child from 'child_process';
import * as fs from 'fs';
import glob = require('glob');
import * as path from 'path';

import * as anno from '../anno';
import { ModRegistry } from '../data/modRegistry';
import * as logger from '../other/logger';

export function ensureDir(path: string) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
}

export function dontOverwrite(filePath: string, extension: string) {
  if (fs.existsSync(filePath)) {
    if (!extension.startsWith('.')) {
      extension = '.' + extension;
    }
    const dirname = path.dirname(filePath);
    const basename = path.basename(filePath, extension);

    // try up to 100, then give up
    for (let i = 1; i < 100; i++) {
      const tryPath = path.join(dirname, `${basename}-${i}${extension}`);
      if (!fs.existsSync(tryPath)) {
        return tryPath;
      }
    }

    return path.join(dirname, `${basename}-99${extension}`);
  }

  return filePath;
}

/*
  Tools that only provide output folder options are a bit tricky to get -1, -2, ... file names.
  Basic idea: copy source to temporary, convert that and then rename to wanted file name.
  */
export function dontOverwriteFolder(sourceFile: string, targetExtension: string,
  command: (source: string, targetFolder: string) => void) {

  const targetFolder = path.dirname(sourceFile);

  const targetFile = swapExtension(sourceFile, targetExtension);
  const saveTargetFile = dontOverwrite(targetFile, targetExtension);
  if (targetFile !== saveTargetFile) {
    const tempFile = insertEnding(sourceFile, "-temporary");
    const targetTempFile = swapExtension(sourceFile, "-temporary" + targetExtension);;
    fs.copyFileSync(sourceFile, tempFile);
    command(tempFile, targetFolder);
    fs.rmSync(tempFile);
    fs.renameSync(targetTempFile, saveTargetFile);
    return;
  }

  command(sourceFile, targetFolder);
}

export function swapExtension(filePath: string, extension: string, firstDot?: boolean) {
  const base = path.basename(filePath);
  const dot = firstDot === true ? base.indexOf('.') : base.lastIndexOf('.');
  if (dot === -1) {
    return filePath + extension;
  }
  return path.join(path.dirname(filePath), base.substring(0, dot) + extension);
}

export function insertEnding(filePath: string, insert: string) {
  const base = path.basename(filePath);
  const dot = base.lastIndexOf('.');
  if (dot === -1) {
    return filePath + insert;
  }
  return path.join(path.dirname(filePath), base.substring(0, dot) + insert + base.substr(dot));
}

export function ensureArray(object: any) {
  if (Array.isArray(object)) {
    return object;
  }
  else {
    return [ object ];
  }
}

export function searchModPath(patchFilePath: string) {
  return findModRoot(patchFilePath);
}

// finds root path using modinfo.json, data/config/export folder and other indicators
export function findModRoot(modFilePath: string) {
  if (!fs.existsSync(modFilePath)) {
    return modFilePath;
  }
  const isFile = fs.statSync(modFilePath).isFile();
  let searchPath = isFile ? path.dirname(modFilePath) : modFilePath;

  for (let i = 0; i < 30 && searchPath && searchPath !== '/'; i++) {
    if (fs.existsSync(path.join(searchPath, "modinfo.json"))
      || fs.existsSync(path.join(searchPath, anno.ANNO7_ASSETS_PATH))
      || fs.existsSync(path.join(searchPath, anno.ANNO8_ASSETS_PATH))
      || fs.existsSync(path.join(searchPath, "data/config/gui"))) {
      return searchPath;
    }

    searchPath = path.dirname(searchPath);
  }

  return isFile ? path.dirname(modFilePath) : modFilePath;
}

export function findModRoots(modFilePath: string): string[] {
  const root = findModRoot(modFilePath);
  if (!root) {
    return [];
  }

  const modinfo = readModinfo(root);
  if (!modinfo || !modinfo?.src || modinfo.src.length === 0) {
    return [ root ];
  }

  let srcs = Array.isArray(modinfo.src) ? [ '.', ...modinfo.src.filter((e: string) => '.')] : [ modinfo.src ];
  return srcs.map((e: string) => path.normalize(path.join(root, e)));
}

export function isAssetsXml(path: string) {
  if (path.endsWith("export.bin.xml") || path.endsWith(".cfg.xml") || path.endsWith(".fc.xml") || path.endsWith("templates.xml")) {
    return false;
  }

  return true;
}

interface IModinfo {
  /** @deprecated use Development.DeployPath instead */
  out?: string
  /** @deprecated don't use at all */
  src: string | string[]
  /** @deprecated use Development.Bundle instead */
  bundle?: string[]
  modinfo: any
  converter?: any
  Development?: {
    DeployPath?: string
    Bundle?: string[]
  }
  getRequiredLoadAfterIds: (modinfo: any) => string[]
}

export function getRequiredLoadAfterIds(modinfo: any): string[] {
  if (!modinfo) {
    return [];
  }
  const dependencies: string[] = modinfo.ModDependencies ?? [];
  const loadAfterIds: string[] = modinfo.LoadAfterIds ?? [];

  return dependencies.filter(dep => loadAfterIds.includes(dep));
}

export function readModinfo(modPath: string): IModinfo | undefined {
  let result: IModinfo;
  try {
    if (fs.existsSync(path.join(modPath, 'modinfo.json'))) {
      result = {
        ...JSON.parse(fs.readFileSync(path.join(modPath, 'modinfo.json'), 'utf8')),
        'modinfo': JSON.parse(fs.readFileSync(path.join(modPath, 'modinfo.json'), 'utf8')),
        getRequiredLoadAfterIds
      };
    }
    else if (fs.existsSync(path.join(modPath, 'annomod.json'))) {
      result = {
        ...JSON.parse(fs.readFileSync(path.join(modPath, 'annomod.json'), 'utf8')),
        'modinfo': JSON.parse(fs.readFileSync(path.join(modPath, 'annomod.json'), 'utf8')),
        getRequiredLoadAfterIds
      };
    }
    else {
      return undefined;
    }
  }
  catch {
    // mod jsons can be invalid pretty fast
    return undefined;
  }

  result.Development ??= {};
  result.Development.DeployPath ??= result.out ?? "${annoMods}/${modName}";
  result.Development.Bundle ??= result.bundle ?? [];
  result.src ??= ".";

  // convert url ModDependencies to bundle
  if (!Array.isArray(result.Development.Bundle)) {
    result.Development.Bundle = Object.values(result.Development.Bundle);
  }
  if (result.modinfo.ModDependencies && Array.isArray(result.modinfo.ModDependencies)) {
    for (let i = 0; i < result.modinfo?.ModDependencies.length; i++) {
      const dep = result.modinfo.ModDependencies[i];
      if (dep.startsWith("http") || dep.startsWith(".")) {
        result.Development.Bundle.push(dep);
        result.modinfo.ModDependencies[i] = path.basename(dep, '.zip');
      }
    }
  }

  return result;
}

/** Return path of the mod containing the asset file, and it's ModDependencies, OptionalDependencies and LoadAfterIds mod paths */
export function searchModPaths(patchFilePath: string, modsFolder?: string) {
  if (!fs.existsSync(patchFilePath)) {
    return [];
  }

  ModRegistry.use(modsFolder);

  const modPath = searchModPath(patchFilePath);
  const modinfo = readModinfo(modPath);

  const sources = modinfo?.src ? ensureArray(modinfo.src).map((e: string) => path.join(modPath, e)) : [ modPath ];
  let deps: string[] = [];
  if (modsFolder && modinfo?.modinfo) {
    deps = [
        ...ensureArray(modinfo.modinfo?.ModDependencies),
        ...ensureArray(modinfo.modinfo?.OptionalDependencies),
        ...ensureArray(modinfo.modinfo?.Development?.OptionalDependencies),
        ...ensureArray(modinfo.modinfo?.LoadAfterIds)
      ]
      .map((e: string) => ModRegistry.getPath(e) ?? "")
      .filter((e: string) => e !== "");
  }

  // remove duplicates
  return [...new Set([...sources, ...deps])];
}

/**
 * Check if graphics file exists or at least matches standard patterns.
 * @returns Empty list when found. Otherwise checked file path patterns.
 */
export function hasGraphicsFile(modPaths: string[], filePath: string, annoRda?: string) {
  let searchPaths = modPaths;

  // ignore some very common, but missing default textures
  if (filePath.endsWith('default_height.png') || filePath.endsWith('default_model_mask.png')) {
    return [];
  }

  filePath = filePath.replace(/\\/g, '/');

  const folderAfterData = filePath.startsWith('data/') ? filePath.substring(5, Math.max(5, filePath.indexOf('/', 5))) : filePath;

  if (folderAfterData === 'ui' || folderAfterData === 'graphics'
    || folderAfterData.startsWith('dlc') || folderAfterData.startsWith('cdlc')
    || folderAfterData === 'eoy21') {
    if (annoRda && annoRda !== '') {
      // check annoRda only if certain folders are there to ensure people actually extracted their RDAs
      if (folderAfterData === 'graphics' && fs.existsSync(path.join(annoRda, 'data/graphics'))) {
        searchPaths = [annoRda, ...modPaths];
      }
      else if (folderAfterData === 'ui' && fs.existsSync(path.join(annoRda, 'data/ui'))) {
        searchPaths = [annoRda, ...modPaths];
      }
      else if (folderAfterData.startsWith('dlc')
        && fs.existsSync(path.join(annoRda, 'data', folderAfterData))) {
          searchPaths = [annoRda, ...modPaths];
      }
      else if (folderAfterData.startsWith('cdlc')
        && fs.existsSync(path.join(annoRda, 'data', folderAfterData))) {
          searchPaths = [annoRda, ...modPaths];
      }
      else if (folderAfterData === 'eoy21' && fs.existsSync(path.join(annoRda, 'data/eoy21'))) {
        searchPaths = [annoRda, ...modPaths];
      }
      else {
        return [];
      }
    }
    else {
      // don't check vanilla, for now...
      return [];
    }
  }

  let checked: string[] = [];

  const fileExistsGlob = (pattern: string) => {
    const files = glob.sync(pattern);
    return files.length > 0;
  };

  for (const modPath of searchPaths) {
    checked = [];

    if (fs.existsSync(path.join(modPath, filePath))) {
      return [];
    }

    checked.push(filePath);

    // try .cfg.yaml
    if (filePath.endsWith('.cfg')) {
      if (fs.existsSync(path.join(modPath, filePath + '.yaml'))) {
        return [];
      }
      checked.push(filePath + '.yaml');
    }

    const folderPath = path.dirname(filePath);
    const fileName = path.basename(filePath);

    // try .dds
    if (fileName.endsWith('.psd')) {
      if (fs.existsSync(path.join(modPath, folderPath, path.basename(fileName, '.psd') + '_0.dds'))) {
        return [];
      }

      if (fs.existsSync(path.join(modPath, folderPath, path.basename(fileName, '.psd') + '.png'))) {
        return [];
      }

      if (fileName.endsWith('_norm.psd')) {
        if (fs.existsSync(path.join(modPath, folderPath, path.basename(fileName, '_norm.psd') + '_rga.png'))) {
          return [];
        }
        checked.push(path.join(folderPath, path.basename(fileName, '_norm.psd') + '_rga.png'));
      }
      checked.push(path.join(folderPath, path.basename(fileName, '.psd') + '_0.dds'));
      checked.push(path.join(folderPath, path.basename(fileName, '.psd') + '.png'));
    }

    // try .gltf
    if (fileName.endsWith('_lod0.rdm')) {
      const baseName = fileName.split('_')[0];
      if (folderPath.endsWith('rdm')) {
        if (fileExistsGlob(path.join(modPath, folderPath, '..', baseName + '*.gltf'))) {
          return [];
        }
        checked.push(path.join(folderPath, '..', baseName + '*.gltf'));
      }
      else {
        if (fileExistsGlob(path.join(modPath, folderPath, baseName + '*.gltf'))) {
          return [];
        }
        checked.push(path.join(folderPath, baseName + '*.gltf'));
      }
    }

    // try .png
    if (fileName.endsWith('.psd') && folderPath.endsWith('maps')) {
      if (fs.existsSync(path.join(modPath, folderPath, '..', path.basename(fileName, '.psd') + '.png'))) {
        return [];
      }
      if (fileName.endsWith('_norm.psd')) {
        if (fs.existsSync(path.join(modPath, folderPath, '..', path.basename(fileName, '_norm.psd') + '_rga.png'))) {
          return [];
        }
        checked.push(path.join(folderPath, '..', path.basename(fileName, '_norm.psd') + '_rga.png'));
      }
      checked.push(path.join(folderPath, '..', path.basename(fileName, '.psd') + '.png'));
    }

    // try .dds from .png
    if (fileName.endsWith('.png')) {
      if (fs.existsSync(path.join(modPath, folderPath, path.basename(fileName, '.png') + '_0.dds'))) {
        return [];
      }
      checked.push(path.join(folderPath, path.basename(fileName, '.png') + '_0.dds'));
    }

    // try .rdp.xml
    if (fileName.endsWith('.rdp')) {
      if (fs.existsSync(path.join(modPath, folderPath, fileName + '.xml'))) {
        return [];
      }
      checked.push(path.join(modPath, folderPath, fileName + '.xml'));
    }
  }

  return checked;
}

export interface ILogger {
  log: (text: string) => void;
  warn: (text: string) => void;
  error: (text: string) => void;
}

export function downloadFile(sourceUrl: string, targetPath: string, logger?: ILogger) {
  ensureDir(path.dirname(targetPath));
  try {
    child.execFileSync('curl', [
      '-L',
      '-o', targetPath,
      sourceUrl
    ]);
  }
  catch (e) {
    logger?.error((<Error>e).message);
    throw e;
  }
}

export function extractZip(sourceZipPath: string, targetPath: string, logger?: ILogger) {
  ensureDir(path.dirname(targetPath));
  try {
    child.execFileSync('tar', [
      '-xf', sourceZipPath,
      '-C', targetPath
    ]);
  }
  catch (e) {
    logger?.error((<Error>e).message);
    throw e;
  }
}

export function copyFolderNoOverwrite(src: string, dest: string): string[] {
  const copiedFiles: string[] = [];

  if (!fs.existsSync(src)) {
    return copiedFiles;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      const subCopiedFiles = copyFolderNoOverwrite(srcPath, destPath);
      copiedFiles.push(...subCopiedFiles);
    } else if (entry.isFile()) {
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
        copiedFiles.push(destPath);
      }
    }
  }

  return copiedFiles;
}