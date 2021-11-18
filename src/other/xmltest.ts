import * as fs from 'fs';
import * as path from 'path';
import * as child from 'child_process';
import * as glob from 'glob';
import * as logger from './logger';

export function test(testFolder: string, patchFile: string, asAbsolutePath: (relative: string) => string, tempFolder: string) {
  const tester = asAbsolutePath("./external/xmltest.exe");

  const inputFiles = glob.sync('**/*-input.xml', { cwd: testFolder, nodir: true });
  for (let inputFile of inputFiles) {

    const absoluteInputFile = path.join(testFolder, inputFile);
    let testerOutput;
    try {
      testerOutput = child.execFileSync(tester, [absoluteInputFile, patchFile], { cwd: tempFolder });
    }
    catch (exception: any) {
      logger.error(`Test ${path.basename(inputFile)} failed with exception`);
      logger.error(exception.message);
      continue;
    }

    const logFile = path.join(tempFolder, path.basename(inputFile, '-input.xml') + '-patched.log');
    const logXmlFile = path.join(tempFolder, path.basename(inputFile, '-input.xml') + '-patched.xml');

    const absoluteExpectationFile = path.join(path.dirname(absoluteInputFile), path.basename(absoluteInputFile, '-input.xml') + '-expectation.xml');
    if (_sameWhenMinimized(absoluteExpectationFile, path.join(tempFolder, 'patched.xml'))) {
      logger.log(`Test ${path.basename(inputFile)} OK`);
    }
    else {
      fs.renameSync(path.join(tempFolder, 'patched.xml'), logXmlFile);
      logger.warn(`Test ${path.basename(inputFile)} failed`);
      if (testerOutput) {
        fs.writeFileSync(logFile, testerOutput.toString());
      }
      logger.warn(`Check ${logFile}`);
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
      logger.warn(`Issue at line ${line + 1}`);
      logger.warn(`${expectedContent[line]} != ${patchedContent[patchedLine]}`);
      if (expectedContent[line].indexOf('--') !== -1) {
        logger.warn('It looks like you have comments in the *-expectation.xml file. The XML patcher removes them unfortunately. It\'s OK to keep them in the *-input.xml');
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
    logger.warn(`${patchedLeft > 0 ? 'Expectation' : 'Result'} is missing ${missingLines} lines`);
    for (let missingLine = 0; missingLine < Math.min(5, missingLines); missingLine++) {
      logger.warn(`${content[startMissing + missingLine]}`);
    }
    return false;
  }

  return true;
}
