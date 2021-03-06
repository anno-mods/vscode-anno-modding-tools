import * as path from 'path';
import * as fs from 'fs';

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

export function swapExtension(filePath: string, extension: string) {
  const base = path.basename(filePath);
  const dot = base.lastIndexOf('.');
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
