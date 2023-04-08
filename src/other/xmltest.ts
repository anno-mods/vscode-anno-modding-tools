import * as fs from 'fs';
import * as path from 'path';
import * as child from 'child_process';
import * as glob from 'glob';
import * as vscode from 'vscode';
import * as logger from './logger';
import * as utils from '../other/utils';

export function test(testFolder: string, modFolder: string, patchFile: string, asAbsolutePath: (relative: string) => string, tempFolder: string) {
  const tester = asAbsolutePath("./external/xmltest.exe");
  let result = true;

  const inputFiles = glob.sync('**/*-input.xml', { cwd: testFolder, nodir: true });
  for (let inputFile of inputFiles) {

    const absoluteInputFile = path.join(testFolder, inputFile);
    let testerOutput;
    try {
      const roots = utils.findModRoots(patchFile).map(e => ['-m', e]);

      testerOutput = child.execFileSync(tester, [
        '-o', path.join(tempFolder, 'patched.xml'),
        '-v',
        ...roots.flat(),
        absoluteInputFile, 
        patchFile], { cwd: tempFolder });
    }
    catch (exception: any) {
      logger.error(`Test ${path.basename(inputFile)} failed with exception`);
      logger.error(exception.message);
      return false;
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
      result = false; // keep going on to produce full list of test results
    }
  }

  return result;
}

function getVanilla(filePath: string) {
  const config = vscode.workspace.getConfiguration('anno', vscode.Uri.file(filePath));
  const annoRda: string = config.get('rdaFolder') || "";
  let vanillaPath = path.join(annoRda, 'data/config/export/main/asset/assets.xml');

  if (!fs.existsSync(vanillaPath)) {
    return undefined;
  }

  const basename = path.basename(filePath, path.extname(filePath));
  if (basename.indexOf("templates") >= 0) {
    vanillaPath = path.join(annoRda, 'data/config/export/main/asset/templates.xml');
  }
  else if (basename.indexOf("texts_") >= 0) {
    vanillaPath = path.join(annoRda, 'data/config/gui/' + basename + '.xml');
  }

  return vanillaPath;
}

function parseIssue(line: string): IIssue | undefined {
  const regex = /\[[\d\s\-\.:]+\]\s\[(\w+)\]\s(.+)\s\(([^:]+):(\d+)\)/;
  const match = regex.exec(line);

  if (match) {
    return {
      error: match[1] === 'error',
      message: match[2],
      file: match[3],
      line: Math.max(0, parseInt(match[4]) - 1)
    }
  }

  return undefined;
}

export interface IIssue {
  error: boolean
  message: string
  file: string
  line: number
}

export function fetchIssues(modPath: string, patchFile: string, asAbsolutePath: (relative: string) => string): IIssue[] {
  const removeNulls = <S>(value: S | undefined): value is S => value != null;

  const tester = asAbsolutePath("./external/xmltest.exe");
  let result = true;

  const vanilaXml = getVanilla(patchFile);
  if (!vanilaXml) {
    logger.error('vanila XML not found');
    return [];
  }

  let testerOutput;
  try {
    const roots = utils.findModRoots(patchFile).map(e => ['-m', e]);
    testerOutput = child.execFileSync(tester, [
      "-s", 
      ...roots.flat(),
      vanilaXml, 
      patchFile], { cwd: modPath });
  }
  catch (exception: any) {
    logger.error(`Test ${path.basename(patchFile)} failed with exception`);
    logger.error(exception.message);
    return [];
  }

  const issues = testerOutput.toString().split('\n')
    .filter(e => e.indexOf('[warning]') >= 0 || e.indexOf('[error]') >= 0)
    .map(e => parseIssue(e))
    .filter(removeNulls);
  return issues;
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
