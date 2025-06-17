import * as path from 'path';
import * as fs from 'fs';
import { Version } from '../other/version';
import * as utils from '../other/utils';

const MODINFO_JSON = 'modinfo.json'

export class ModInfo {
  private modInfo_: any;

  readonly id: string;
  readonly version: Version;
  readonly path: string;
  readonly game: utils.GameVersion;

  /** filePath: modinfo.json or folder containing one */
  static read(filePath: string) : ModInfo | undefined {
    let modPath: string | undefined;
    let id: string | undefined;
    let modInfo: any;
    let game: utils.GameVersion = utils.GameVersion.Anno7;

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
        if (modInfo && modInfo.Anno === undefined && fs.existsSync(path.join(modPath, "data/base/config"))) {
          // try to detect Anno8 if the file is valid but doesn't contain a version yet
          game = utils.GameVersion.Anno8;
        }
        else {
          game = (modInfo?.Anno === "8" || modInfo?.Anno === 8) ? utils.GameVersion.Anno8 : utils.GameVersion.Anno7;
        }
      }
      catch {
        // silently ignore
      }
    }

    if (!id || id === "") {
      id = path.basename(modPath);
    }

    return new ModInfo(id, modPath, modInfo, game);
  }

  private constructor(id: string, path: string, modInfo: any, game: utils.GameVersion) {
    this.id = id;
    this.path = path;
    this.modInfo_ = modInfo;
    this.game = game;

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