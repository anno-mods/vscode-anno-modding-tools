import * as path from 'path';
import * as fs from 'fs';
import { exit } from 'process';
import { ModBuilder } from './builder';

if (process.argv.length < 3) {
  console.error('provide filepath to assets.xml');
  exit(-1);
}

const modinfoPath = process.argv[2];
if (!fs.existsSync(modinfoPath)) {
  console.error('input file does not exist');
  console.error(modinfoPath);
  exit(-1);
}

const context: any = {
  asAbsolutePath: (relative: string) => { return relative; }
};

const builder = new ModBuilder(console, (relative: string) => { return relative; }, '');

builder.build(modinfoPath).then((v) => {
  console.log('done');
}).catch((v) => {
  console.error('error');
});
