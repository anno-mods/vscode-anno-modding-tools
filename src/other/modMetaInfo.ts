import * as path from 'path';
import * as fs from 'fs';
import { Version } from './version';
import * as utils from './utils';

const MODINFO_JSON = 'modinfo.json'

export class ModMetaInfo {
  private modInfo_: any;

  readonly id: string;
  readonly version: Version;
  readonly path: string;

  /** filePath: modinfo.json or folder containing one */
  static read(filePath: string) : ModMetaInfo | undefined {
    let modPath: string | undefined;
    let id: string | undefined;
    let modInfo: any;

    const fileName = path.basename(filePath);
    if (fileName.toLowerCase().endsWith(MODINFO_JSON)) {
      modPath = path.dirname(filePath);
    }
    else {
      modPath = filePath;
    }

    if (!fs.existsSync(modPath)) {
      return;
    }

    const modinfoPath = path.join(modPath, MODINFO_JSON);

    if (fs.existsSync(modinfoPath))
    {
      try {
        modInfo = JSON.parse(fs.readFileSync(modinfoPath, 'utf8'));
        id = modInfo?.ModID;
      }
      catch {
        // silently ignore
      }
    }

    if (!id || id === "") {
      id = path.basename(modPath);
    }

    return new ModMetaInfo(id, modPath, modInfo);
  }

  private constructor(id: string, path: string, modInfo: any) {
    this.id = id;
    this.path = path;
    this.modInfo_ = modInfo;

    this.version = new Version(this.modInfo_?.Version);
  }

  public getAllDependencies() {
    let deps = new Set([
      ...utils.ensureArray(this.modInfo_?.ModDependencies),
      ...utils.ensureArray(this.modInfo_?.OptionalDependencies),
      ...utils.ensureArray(this.modInfo_?.LoadAfterIds)]);

    // remove duplicates
    return [...deps];
  }

  public readGuids() {
    
  }

  // public writeGuids() {
  //   if (this.modPath_ === undefined) {
  //     return;
  //   }

  //   const guidsFilePath = path.join(this.modPath_, "guids.json");
  //   const guidsContent = "{}";

  //   fs.writeFileSync(guidsFilePath, guidsContent);
  // }
}