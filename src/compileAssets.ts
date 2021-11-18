import * as path from 'path';
import * as xmldoc from 'xmldoc';
import * as fs from 'fs';
import { exit } from 'process';

const OUTPUT_FILEPATH = './generated/assets.json';
const TEMPLATE = [ 
  'RewardPool', 
  'RewardItemPool', 
  'ItemEffectTargetPool', 
  'ForwardBuff', 
  'GuildhouseItem', 
  'HarborOfficeItem', 
  'TownhallItem', 
  'CultureItem', 
  'VehicleItem', 
  'Product',
  'ProductionChain',
  'ConstructionCategory',
  'RecipeList',
  'Recipe',
  'ProductStorageList',
  'ProductList',
  'PopulationLevel7',
  'AssetPool'
];

interface IAsset {
  template?: string;
  name?: string;
  english?: string;
}

const assetCounter: { [index: string]: number } = {};

function scanAssets(node: xmldoc.XmlElement, assets: { [index: string]: IAsset }) {
  const templateElement = node.childNamed('Template');
  const valuesElement = node.childNamed('Values');
  
  if (templateElement && valuesElement) {
    const standard = valuesElement.childNamed('Standard');
    const guid = standard?.childNamed('GUID')?.firstChild?.toString();
    if (guid) {
      let template = templateElement.firstChild?.toString();
      const name = standard?.childNamed('Name')?.firstChild?.toString();
      const english = valuesElement.childNamed('Text')?.childNamed('LocaText')?.childNamed('English')?.childNamed('Text')?.firstChild?.toString();

      if (!template) {
        template = '';
      }
      if (-1 !== TEMPLATE.indexOf(template) || valuesElement.childNamed('Building')) {
        if (assetCounter[template]) {
          assetCounter[template] ++;
        }
        else {
          assetCounter[template] = 1;
        }
        
        assets[guid] = {
          template,
          name,
          english
        };
      }
    }
  }
  else if (node.children) {
    for (let child of node.children) {
      if (child.type === 'element') {
        scanAssets(child, assets);
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

let assets: { [index: string]: IAsset } = {};

scanAssets(assetXml, assets);
console.log(`loaded ${Object.keys(assets).length} GUIDs`);

const assetNames = Object.keys(assetCounter);
assetNames.sort((a,b) => assetCounter[a] - assetCounter[b]);
for (let asset of assetNames) {
  console.log(`${assetCounter[asset]} of ${asset}`);
}

if (!fs.existsSync(path.dirname(OUTPUT_FILEPATH))) {
  fs.mkdirSync(path.dirname(OUTPUT_FILEPATH), { recursive: true });
}
fs.writeFileSync(OUTPUT_FILEPATH, JSON.stringify(assets, undefined, 2));

console.log(`written to ${OUTPUT_FILEPATH}`);


// write guidranges.json
const guidrangesMd = fs.readFileSync('./src/guidranges.md', 'utf8') || '';
const guidrangeLines = guidrangesMd.split('\n').filter((e: string) => e.trim().startsWith('|'));

const ranges: { name: string | null, start: number, end: number }[] = [];
for (let line of guidrangeLines) {
  const split = line.split('|');
  const name = split[1].trim();
  const start = parseInt((split[2]||'').replace(/\./g, ''));
  const end = parseInt((split[3]||'').replace(/\./g, ''));

  if (start && end) {
    ranges.push({ name, start, end });
  }
}

fs.writeFileSync('./generated/guidranges.json', JSON.stringify({
  safe: { 
    start: 1337471142,
    end: 2147483647
  },
  ranges
}, undefined, 2));
