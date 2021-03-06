import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as utils from '../../other/utils';
import * as xml2js from 'xml2js';
import * as vscode from 'vscode';

suite('file conversion tests', () => {
  // clear to avoid old files leading to wrong results
  if (fs.existsSync('../../out/test/suite/data')) {
    fs.rmdirSync('../../out/test/suite/data', { recursive: true });
  }

  // temporarily disable, there are some problems running them in GitHub actions...
  // test('.cf7 commands', async () => {
  //   const simpleCf7 = path.resolve('../../out/test/suite/data/simple.cf7');
  //   utils.ensureDir(path.dirname(simpleCf7));
  //   fs.copyFileSync('../../src/test/suite/data/simple.cf7', simpleCf7);
  //   await vscode.commands.executeCommand('anno-modding-tools.convertCf7Fc', vscode.Uri.file(simpleCf7));
  //   const simpleFc_ = utils.swapExtension(simpleCf7, '_.fc');
  //   fs.renameSync(utils.swapExtension(simpleCf7, '.fc'), simpleFc_);
  //   await vscode.commands.executeCommand('anno-modding-tools.convertFcCf7', vscode.Uri.file(simpleFc_));

  //   const cf7Content = await xml2js.parseStringPromise(fs.readFileSync(utils.swapExtension(simpleCf7, '_.cf7'), 'utf8'));
  //   const cf7Content_ = await xml2js.parseStringPromise(fs.readFileSync(simpleCf7, 'utf8'));

  //   assert.deepStrictEqual(cf7Content, cf7Content_);
  // });

  test('.dds commands', async () => {
    const fakePng = path.resolve('../../out/test/suite/data/fake.png');
    utils.ensureDir(path.dirname(fakePng));
    fs.copyFileSync('../../src/test/suite/data/fake.png', fakePng);
    await vscode.commands.executeCommand('anno-modding-tools.pngToDds', vscode.Uri.file(fakePng));
    assert(fs.existsSync(fakePng));

    const fakePng_ = utils.swapExtension(fakePng, '_.dds');
    fs.renameSync(utils.swapExtension(fakePng, '.dds'), fakePng_);
    await vscode.commands.executeCommand('anno-modding-tools.ddsToPng', vscode.Uri.file(fakePng_));
    assert(fs.existsSync(utils.swapExtension(fakePng, '_.png')));
  });

  test('.cfg.yaml commands', async () => {
    const relTestPath = 'test/suite/data/reskin';
    const tempTestPath = path.resolve('../../out/' + relTestPath);

    const modifier = 'in-modified.cfg.yaml';

    utils.ensureDir(tempTestPath);
    fs.copyFileSync(path.join('../../src/', relTestPath, modifier), path.join(tempTestPath, modifier));
    fs.copyFileSync(path.join('../../src/', relTestPath, 'in-config.cfg'), path.join(tempTestPath, 'in-config.cfg'));

    const modifierPath = path.join(tempTestPath, modifier);
    const resultPath = path.join(tempTestPath, path.basename(modifier, '.yaml'));
    await vscode.commands.executeCommand('anno-modding-tools.cfgyamlToCfg', vscode.Uri.file(modifierPath));
    assert(fs.existsSync(resultPath));

    const resultContent = await xml2js.parseStringPromise(fs.readFileSync(resultPath, 'utf8'));
    const expectedContent = await xml2js.parseStringPromise(fs.readFileSync(path.join('../../src/', relTestPath, 'expected.cfg'), 'utf8'));

    assert.deepStrictEqual(resultContent, expectedContent);
  });
});
