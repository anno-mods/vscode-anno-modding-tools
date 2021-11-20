import * as path from 'path';
import * as fs from 'fs';
import { exit } from 'process';
import * as glob from 'glob';
import { ModBuilder } from './builder';

async function main() {
  if (process.argv.length < 3) {
    console.error('provide filepath to annomod.json');
    exit(-1);
  }
  
  const packageRoot = path.normalize(path.join(path.dirname(process.argv[1]), '..'));
  const outPath = path.join(process.cwd(), 'out');
  if (!fs.existsSync(outPath)) {
    fs.mkdirSync(outPath, { recursive: true });
  }
  
  const modinfoPaths = glob.sync(process.argv[2]);
  if (!modinfoPaths || modinfoPaths.length === 0) {
    console.error('input file/glob does not exist');
    exit(-1);
  }
  
  const builder = new ModBuilder(console, (relative: string) => path.join(packageRoot, relative), outPath);
  
  for (let modinfoPath of modinfoPaths) {
    const result = await builder.build(path.join(process.cwd(), modinfoPath));
    if (!result) {
      console.error('building mods failed');
      exit(-1);
    }
  }
}

main();
