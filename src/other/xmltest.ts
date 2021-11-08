import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as child from 'child_process';
import * as glob from 'glob';
import * as channel from './outputChannel';

export function test(testFolder: string, patchFile: string, context: vscode.ExtensionContext, tempFolder: string) {
  const tester = context.asAbsolutePath("./external/xmltest.exe");

  const inputFiles = glob.sync('**/*-input.xml', { cwd: testFolder, nodir: true });
  for (let inputFile of inputFiles) {

    const absoluteInputFile = path.join(testFolder, inputFile);
    let testerOutput;
    try {
      testerOutput = child.execFileSync(tester, [absoluteInputFile, patchFile], { cwd: tempFolder });
    }
    catch (exception: any) {
      channel.error(`Test ${path.basename(inputFile)} failed with exception`);
      channel.error(exception.message);
      continue;
    }

    const absoluteExpectationFile = path.join(path.dirname(absoluteInputFile), path.basename(absoluteInputFile, '-input.xml') + '-expectation.xml');
    if (_sameWhenMinimized(absoluteExpectationFile, path.join(tempFolder, 'patched.xml'))) {
      channel.log(`Test ${path.basename(inputFile)} OK`);
    }
    else {
      const logFile = path.join(tempFolder, path.basename(inputFile, '-input.xml') + '-patched.xml');
      fs.renameSync(path.join(tempFolder, 'patched.xml'), logFile);
      channel.warn(`Test ${path.basename(inputFile)} failed`);
      if (testerOutput) {
        channel.log(testerOutput.toString());
      }
      channel.warn(`Check ${logFile}`);
    }
  }
}

function _sameWhenMinimized(expectation: string, patched: string) {
  // remove empty lines from patched to simply checking
  const patchedContent = fs.readFileSync(patched, 'utf8').replace('\r', '').split('\n').map((e) => e.trim()).filter((e) => e);
  // keep empty lines to have correct line output for user
  const expectedContent = fs.readFileSync(expectation, 'utf8').replace('\r', '').split('\n').map((e) => e.trim());

  let patchedLine = -1;
  let line = -1;
  while (line < expectedContent.length && patchedLine < patchedContent.length) {
    patchedLine++;
    line++;
    // skip empty lines, patchedContent does not have empty lines
    while (expectedContent[line] === '' && line < expectedContent.length) {
      line++;
    }

    if (line >= expectedContent.length || patchedLine >= patchedContent.length) {
      break;
    }

    if (expectedContent[line].replace(/\s/, '') !== patchedContent[patchedLine].replace(/\s/, '')) {
      channel.warn(`Issue at line ${line + 1}`);
      channel.warn(`${expectedContent[line]} != ${patchedContent[patchedLine]}`);
      if (expectedContent[line].indexOf('--') !== -1) {
        channel.warn('It looks like you have comments in the *-expectation.xml file. The XML patcher removes them unfortunately. It\'s OK to keep them in the *-input.xml');
      }
      return false;
    }
  }

  // we may have ending empty lines
  while (expectedContent[line] === '' && line < expectedContent.length) {
    line++;
  }

  const expectedLeft = expectedContent.length - line;
  const patchedLeft = patchedContent.length - patchedLine;

  const missingLines = expectedLeft + patchedLeft;
  if (missingLines !== 0) {
    const content = patchedLeft > 0 ? patchedContent : expectedContent;
    const startMissing = patchedLeft > 0 ? patchedLine : line;
    channel.warn(`${patchedLeft > 0 ? 'Expectation' : 'Result'} is missing ${missingLines} lines`);
    for (let missingLine = 0; missingLine < Math.min(5, missingLines); missingLine++) {
      channel.warn(`${content[startMissing + missingLine]}`);
    }
    return false;
  }

  return true;
}
