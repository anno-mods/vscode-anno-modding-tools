import * as path from 'path';
import * as fs from 'fs';
import glob = require('glob');
import { ModFolder } from './modFolder';

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
  let searchPath = path.dirname(patchFilePath);

  for (let i = 0; i < 100 && searchPath && searchPath !== '/'; i++) {
    if (fs.existsSync(path.join(searchPath, "modinfo.json"))
      || fs.existsSync(path.join(searchPath, "buildmod.json"))
      || fs.existsSync(path.join(searchPath, "data/config/export/main/asset"))
      || fs.existsSync(path.join(searchPath, "data/config/gui"))) {
      return searchPath;
    }

    searchPath = path.dirname(searchPath);
  }

  return path.dirname(patchFilePath);
}

export function readModinfo(modPath: string): any {
  if (fs.existsSync(path.join(modPath, 'modinfo.json'))) {
    return JSON.parse(fs.readFileSync(path.join(modPath, 'modinfo.json'), 'utf8'));
  }
  else if (fs.existsSync(path.join(modPath, 'annomod.json'))) {
    return JSON.parse(fs.readFileSync(path.join(modPath, 'annomod.json'), 'utf8'))?.modinfo;
  }
  return undefined;
}

export function searchModPaths(patchFilePath: string, modsFolder?: string) {
  if (!fs.existsSync(patchFilePath)) {
    return [];
  }

  const modPath = searchModPath(patchFilePath);
  const modinfo = readModinfo(modPath);

  const sources = modinfo.src ? ensureArray(modinfo.src).map((e: string) => path.join(modPath, e)) : [ modPath ];
  let deps: string[] = [];
  if (modsFolder) {
    deps = [...ensureArray(modinfo.ModDependencies), ...ensureArray(modinfo.OptionalDependencies), ...ensureArray(modinfo.LoadAfterIds)]
      .map((e: string) => ModFolder.getModFolder(modsFolder, e) ?? "")
      .filter((e: string) => e !== "");
  }
  return [...sources, ...deps];
}

export function hasGraphicsFile(modPaths: string[], filePath: string, annoRda?: string) {
  let searchPaths = modPaths;

  // ignore some very common, but missing default textures
  if (filePath.endsWith('default_height.png') || filePath.endsWith('default_model_mask.png')) {
    return [];
  }

  filePath = filePath.replace(/\\/g, '/');

  const folderAfterData = filePath.startsWith('data/') ? filePath.substring(5, Math.max(5, filePath.indexOf('/', 5))) : filePath;

  if (folderAfterData == 'ui' || folderAfterData == 'graphics'
    || folderAfterData.startsWith('dlc') || folderAfterData.startsWith('cdlc') 
    || folderAfterData == 'eoy21/') {
    if (annoRda && annoRda !== '') {
      // check annoRda only if certain folders are there to ensure people actually extracted their RDAs
      if (folderAfterData == 'graphics' && fs.existsSync(path.join(annoRda, 'data/graphics'))) {
        searchPaths = [annoRda, ...modPaths];
      }
      else if (folderAfterData == 'ui' && fs.existsSync(path.join(annoRda, 'data/ui'))) {
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
      else if (folderAfterData == 'eoy21' && fs.existsSync(path.join(annoRda, 'data/eoy21'))) {
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
  }
  
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
      
      checked.push(path.join(folderPath, path.basename(fileName, '.psd') + '_0.dds'));
    }

    // try .gltf
    if (fileName.endsWith('_lod0.rdm') && folderPath.endsWith('rdm')) {
      const baseName = fileName.split('_')[0];
      if (fileExistsGlob(path.join(modPath, folderPath, '..', baseName + '*.gltf'))) {
        return [];
      }
      checked.push(path.join(folderPath, '..', baseName + '*.gltf'));
    }

    // try .png
    if (fileName.endsWith('.psd') && folderPath.endsWith('maps')) {
      if (fs.existsSync(path.join(modPath, folderPath, '..', path.basename(fileName, '.psd') + '.png'))) {
        return [];
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
  }

  return checked;
}
