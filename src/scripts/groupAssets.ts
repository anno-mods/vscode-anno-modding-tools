import * as path from 'path';
import * as xmldoc from 'xmldoc';
import * as fs from 'fs';
import { exit } from 'process';

const OUTPUT_FILEPATH = 'c:/anno/all-rda/data/config/export/main/asset/notext/assets.xml';

interface IAsset {
  template?: string;
  name?: string;
  english?: string;
}

const assetCounter: { [index: string]: number } = {};

function isTextAsset(node: xmldoc.XmlElement) {
  if (node.childNamed('LocaText')) {
    return true;
  }
  const templateElement = node.childNamed('Template');
  const template = templateElement?.firstChild?.toString();
  return template === 'Text' || template === 'Audio' || template === 'AudioText' || template === 'NoLocaText' || template === 'TextPool' || (template?.indexOf('Quest')??-1) >= 0;
}

function removeTextAssets(node: xmldoc.XmlElement) {
  if (node.children) {
    node.children = node.children.filter((e: xmldoc.XmlNode) => e.type !== 'element' || !isTextAsset(e));
    for (let child of node.children) {
      if (child.type === 'element') {
        removeTextAssets(child);
      }
    }
  }
}

if (process.argv.length < 3) {
  console.error('provide filepath to assets.xml');
  exit(-1);
}

const assetPath = process.argv[2];
if (!fs.existsSync(assetPath)) {
  console.error('input file does not exist');
  console.error(assetPath);
  exit(-1);
}

console.log(`read ${assetPath}`);
const assetXml = new xmldoc.XmlDocument(fs.readFileSync(assetPath, { encoding: 'utf8' }));

 removeTextAssets(assetXml);

if (!fs.existsSync(path.dirname(OUTPUT_FILEPATH))) {
  fs.mkdirSync(path.dirname(OUTPUT_FILEPATH), { recursive: true });
}

let assetsString = assetXml.toString({ compressed: true, preserveWhitespace: true, html: true });
assetsString = assetsString.replace(/^(?:\s*(?:\r?\n|\r))+/gm, '');

fs.writeFileSync(OUTPUT_FILEPATH, assetsString);

console.log(`written to ${OUTPUT_FILEPATH}`);
