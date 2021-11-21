import * as assert from 'assert';
import * as child_process from 'child_process';

suite('buildmod.js tests', () => {
  test('no annomod.json cases', async () => {
    assert.doesNotThrow(() => child_process.execSync('node ../../out/buildmod.js'));
    assert.throws(() => child_process.execSync('node ../../out/buildmod.js notavail'));
    assert.doesNotThrow(() => child_process.execSync('node ../../out/buildmod.js notavail*'));
  });
});
