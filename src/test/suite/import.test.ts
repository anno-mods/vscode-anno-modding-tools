import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as utils from '../../other/utils';
import * as xml2js from 'xml2js';

import { PropImporter } from '../../features/commands/propImporter';
import { InfoImporter } from '../../features/commands/infoImporter';

suite('import tests', () => {
  // clear to avoid old files leading to wrong results
  if (fs.existsSync('../../out/test/suite/data')) {
    fs.rmdirSync('../../out/test/suite/data', { recursive: true });
  }

  test('simple prop import', async () => {
    const propsGltf = path.resolve('../../src/test/suite/data/props.gltf');
    const simpleCfg = path.resolve('../../out/test/suite/data/simple.cfg');
    utils.ensureDir(path.dirname(simpleCfg));
    fs.copyFileSync('../../src/test/suite/data/simple.cfg', simpleCfg);

    PropImporter.commandImportProps(simpleCfg, propsGltf);

    const imported = await xml2js.parseStringPromise(fs.readFileSync(simpleCfg, 'utf8'));
    const expected = await xml2js.parseStringPromise(fs.readFileSync('../../src/test/suite/data/simple-expected.cfg', 'utf8'));

    assert.deepStrictEqual(imported, expected);
  });

  test('hitbox import', async () => {
    const propsGltf = path.resolve('../../src/test/suite/data/props.gltf');
    const ifo = path.resolve('../../out/test/suite/data/hitbox.ifo');
    utils.ensureDir(path.dirname(ifo));
    fs.copyFileSync('../../src/test/suite/data/hitbox.ifo', ifo);

    InfoImporter.commandImportInfo(ifo, propsGltf);

    const imported = await xml2js.parseStringPromise(fs.readFileSync(ifo, 'utf8'));
    const expected = await xml2js.parseStringPromise(fs.readFileSync('../../src/test/suite/data/hitbox-expected.ifo', 'utf8'));

    assert.deepStrictEqual(imported, expected);
  });
});
