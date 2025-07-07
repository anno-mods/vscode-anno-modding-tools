
export enum GameVersion {
  Auto = 0,
  Anno7 = 7,
  Anno8
}

export function gameVersionName(version: GameVersion) {
  if (version === GameVersion.Anno7) {
    return "Anno 1800";
  } else if (version === GameVersion.Anno8) {
    return "Anno 117";
  } else {
    return "Anno";
  }
}
