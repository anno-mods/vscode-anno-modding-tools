import * as path from 'path';
import * as fs from 'fs';
import { exit } from 'process';
import * as glob from 'glob';
import { ModBuilder } from './builder';

async function main() {
  if (process.argv.length < 3) {
    console.warn('provide filepath to annomod.json');
    exit(0);
  }
  
  const packageRoot = path.normalize(path.join(path.dirname(process.argv[1]), '..'));
  const outPath = path.join(process.cwd(), 'out');
  if (!fs.existsSync(outPath)) {
    fs.mkdirSync(outPath, { recursive: true });
  }
  
  const modinfoPaths = glob.sync(process.argv[2]);
  if (!modinfoPaths || modinfoPaths.length === 0) {
    if (process.argv[2].indexOf('*') !== -1) {
      console.warn('no matching file found');
      exit(0);
    }
    else {
      console.error('input file/glob does not exist');
      exit(-1);
    }
  }
  
  for (let modinfoPath of modinfoPaths) {
    const annoRda = path.join(process.cwd(), path.dirname(modinfoPath), '.vanilla');
    const builder = new ModBuilder(console, (relative: string) => path.join(packageRoot, relative), { annoMods: outPath, annoRda });

    const result = await builder.build(path.join(process.cwd(), modinfoPath));
    if (!result) {
      console.error('building mods failed');
      exit(-1);
    }
  }
}

main();
