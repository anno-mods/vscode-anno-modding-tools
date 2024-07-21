import { glob } from 'glob';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from './logger';
import { ModMetaInfo } from './modMetaInfo';
import * as utils from './utils';

export namespace ModRegistry {
  let mods_: { [index: string]: ModMetaInfo } = {};
  let folders_: Set<string> = new Set<string>();

  /** add mod folder to scan */
  export function use(folder?: string, prioritize: boolean = false) {
    if (folder === undefined) {
      return;
    }

    if (folders_.has(folder)) {
      // already scanned
      return;
    }

    logger.log('add to mod registry: ' + folder);
    folders_.add(folder);
    scan(folder, prioritize);
  }

  function scan(folder: string, prioritize: boolean) {
    const modinfos = glob.sync('{,*/,*/*/,*/*/*/}modinfo.json', { cwd: folder, nodir: true });

    for (const modinfoPath of modinfos) {
      const metaInfo = ModMetaInfo.read(path.join(folder, modinfoPath));
      if (metaInfo) {
        const existingEntry = mods_[metaInfo.id];
        if (!existingEntry
          || metaInfo.version.isGreaterThan(existingEntry.version)
          || (prioritize && metaInfo.version.isEqualTo(existingEntry.version))) {
          mods_[metaInfo.id] = metaInfo;
          logger.log('register ' + metaInfo.id + '@' + metaInfo.version.toString() + ' at ./' + path.dirname(modinfoPath));
        }
      }
    }
  }

  /** (re-)scan for GUIDs */
  export function getAllDependencies(modId: string) : ModMetaInfo[] {
    const mod = get(modId);
    if (!mod) {
      return [];
    }

    const dependencies = mod.getAllDependencies();
    return dependencies.map((e: string) => get(e)).filter((e: ModMetaInfo | undefined) => e !== undefined);
  }

  /** Deprecated. Use `use` and `get` instead. */
  export function getModFolder(modsFolder: string, modId: string): string | undefined {
    use(modsFolder);
    return mods_[modId].path;
  }

  /** get mod path */
  export function getPath(modId: string): string | undefined {
    return mods_[modId]?.path;
  }

  /** get mod meta info */
  function get(modId: string) : ModMetaInfo | undefined {
    return mods_[modId];
  }

  export function findMod(filePath: string) : ModMetaInfo | undefined {
    const modFolder = utils.searchModPath(filePath);
    const modMetaInfo = ModMetaInfo.read(modFolder);

    if (modMetaInfo === undefined) {
      return undefined;
    }

    if (mods_[modMetaInfo.id] === undefined) {
      mods_[modMetaInfo.id] = modMetaInfo;
      return modMetaInfo;
    }

    return mods_[modMetaInfo.id];
  }
}
