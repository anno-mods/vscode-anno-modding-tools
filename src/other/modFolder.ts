import { glob } from 'glob';
import * as path from 'path';
import * as fs from 'fs';

export namespace ModFolder {
  let modsFolder_: string;
  let modIdFolderMap: { [index: string]: string } = {};

  export function scan(modsFolder: string) {
    if (modsFolder === modsFolder_) {
      return;
    }
    modsFolder_ = modsFolder;

    const modinfos = glob.sync('{,*/,*/*/}modinfo.json', { cwd: modsFolder, nodir: true });
    
    for (const modinfoPath of modinfos) {
      const modinfo = JSON.parse(fs.readFileSync(path.join(modsFolder, modinfoPath), 'utf8'));
      const id = modinfo?.ModID;
      if (id) {
        modIdFolderMap[id] = path.join(modsFolder, path.dirname(modinfoPath));
      }

      // TODO versioning
    }
  }

  export function getModFolder(modsFolder: string, modId: string): string | undefined {
    scan(modsFolder);

    return modIdFolderMap[modId];
  }
}
