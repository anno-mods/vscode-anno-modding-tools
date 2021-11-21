
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as utils from '../other/utils';
import * as path from 'path';

export class ModCache {
  public data: {
    files: { 
      path: string,
      sha: string
    }[]
  } = { files: [] };

  private _cache: string;
  private _vanilla: string;
  private _rda: string;

  constructor (mod: string, rda: string) {
    this._cache = path.join(mod, '.modcache');
    this._vanilla = path.join(mod, '.vanilla');
    this._rda = rda;
  }

  public use(sourceFile: string) {
    const buffer = fs.readFileSync(sourceFile);
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    
    this.data.files.push({ path: sourceFile, sha: hash.digest('hex') });
  }

  public include(sourceFile: string) {
    const buffer = fs.readFileSync(sourceFile);
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    
    this.data.files.push({ path: sourceFile, sha: hash.digest('hex') });
  }

  public isCiRun() {
    return !this._rda || this._rda.endsWith('.vanilla');
  }

  public saveVanilla() {
    // .vanilla only includes files like .cfg, so always clearing it out is the safer way
    if (fs.existsSync(this._vanilla)) {
      fs.rmdirSync(this._vanilla, { recursive: true });
    }

    let firstVanilla = false;

    for (let file of this.data.files) {
      if (file.path.startsWith(this._rda)) {
        const relative = file.path.substr(this._rda.length + 1);
        if (!firstVanilla) {
          utils.ensureDir(this._vanilla);
          fs.writeFileSync(path.join(this._vanilla, 'readme.md'), 'This folder stores unmodified files included with ${annoRda} to be able to build the mod without them.');
          firstVanilla = true;
        }

        const target = path.join(this._vanilla, relative);
        utils.ensureDir(path.dirname(target));
        fs.copyFileSync(file.path, target);
      }
    }
  }

  public save() {
    utils.ensureDir(this._cache);
    fs.writeFileSync(path.join(this._cache, 'files.json'), JSON.stringify(this.data, undefined, "  "));
  }
}
