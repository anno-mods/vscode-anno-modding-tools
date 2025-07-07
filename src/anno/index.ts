// Anno specific classes without vscode dependencies

import { ModInfo } from './modInfo';
import { GameVersion, gameVersionName } from './gameVersion';

export { ModInfo, GameVersion, gameVersionName };


import * as fs from 'fs';
import * as path from 'path';
import * as utils from '../other/utils';

export function getAssetsXmlPath(modPath: string, version: GameVersion = GameVersion.Auto) {
  let filePath;

  if (version === undefined) {
    // fallback to Anno7 since those modinfos did not have a version yet
    version = GameVersion.Anno7;
  }

  if (version === GameVersion.Anno8 || version === GameVersion.Auto) {
    filePath = path.join(modPath, utils.ANNO8_ASSETS_PATH, 'assets');
    if (fs.existsSync(filePath + '_.xml')) {
      return filePath + '_.xml';
    }
    else if (version !== GameVersion.Auto || fs.existsSync(filePath + '.xml'))
    {
      return filePath + '.xml';
    }
  }

  if (version === GameVersion.Anno7 || version === GameVersion.Auto) {
    filePath = path.join(modPath, utils.ANNO7_ASSETS_PATH, 'assets');
    if (fs.existsSync(filePath + '_.xml')) {
      return filePath + '_.xml';
    }
    else if (version !== GameVersion.Auto || fs.existsSync(filePath + '.xml'))
    {
      return filePath + '.xml';
    }
  }

  return undefined;
}
