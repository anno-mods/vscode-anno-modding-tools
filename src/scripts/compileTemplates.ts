import * as path from 'path';
import * as xmldoc from 'xmldoc';
import * as fs from 'fs';
import { exit } from 'process';

const OUTPUT_FILEPATH = './generated/assets.json';

interface ITemplate {
  properties: string[];
  name: string;
}


const templates: { [index: string]: Template } = {};
class Template {
  public readonly name: string;
  public usageCount: number = 0;
  public readonly isFiltered: boolean;
  public readonly isNoCompletion: boolean;
  scheme: SchemeType = new SchemeType('Values');

  constructor(name: string, parseNode?: xmldoc.XmlElement) {
    this.name = name;
    this.isFiltered = -1 !== EXCLUDE_TEMPLATES.findIndex(t => name.startsWith(t));
    this.isNoCompletion = -1 !== EXCLUDE_NAME.findIndex(t => name.startsWith(t));
    if (parseNode) {
      this.parseNode(parseNode);
    }
  }

  parseNode(node: xmldoc.XmlElement, firstLevelOnly: boolean = false) {
    const valuesElement = node.childNamed('Values');
    if (!valuesElement) return;

    this.usageCount++;
    // this.scheme.parseNode(valuesElement);
  }

  toXsd(subTypes: 'include' | 'simple' = 'include') {
    return this.scheme.toXsd(subTypes);
  }
}

function scanAssets(node: xmldoc.XmlElement) {
  if (node.name === 'Template') {
    parseNode(node.childNamed('Properties'));
  }
}

function parseNode(node?: xmldoc.XmlElement) {
  if (!node) return;
  if (node.name === 'Test234') return;

  const keyOccurrence: { [index: string]: number } = {};
  for (const val of Object.keys(this.keys)) {
    keyOccurrence[val] = 0;
  }

  let noChildren = true;
  for (const val of node.children) {
    if (val.type !== 'element') continue;
    noChildren = false;

    const scheme = this.keys[val.name] ?? new SchemeType(val.name);
    scheme.parseNode(val, template, specialSchemes);
    this.keys[val.name] = scheme;
    keyOccurrence[val.name] = (keyOccurrence[val.name] ?? 0) + 1;
  }

  if (noChildren && Object.keys(this.possibleValues).length < MAX_POSSIBLE && node.val !== '') {
    this.possibleValues[node.val] = true;
  }

  for (const val of Object.keys(keyOccurrence)) {
    const count = keyOccurrence[val];
    this.keys[val].optional ||= count == 0;
    this.keys[val].multiple ||= count > 1;// || (val === 'Item' && (Object.keys(this.keys[val].keys).length !== 0));
  }
}

if (process.argv.length < 3) {
  console.error('provide filepath to templates.xml');
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
scanAssets(assetXml);

// stats
{
  console.log(`loaded ${Object.keys(assets).length} assets and ${Object.keys(templates).length} templates`);

  let templateNames = Object.keys(templates).filter(e => !templates[e].isFiltered);
  templateNames = templateNames.sort((a,b) => templates[a].usageCount - templates[b].usageCount).slice(-5);
  for (let template of templateNames) {
    console.log(`${templates[template].usageCount} of ${template}`);
  }
}

/*
TODO
- <SocketAllocation>RadiusBuilding</SocketAllocation> allow single usage of ";"
- merge quest sub trees
*/

overallScheme.finalizeTypes(specialSchemes);
for (var scheme of Object.values(specialSchemes.schemeTypes)) {
  scheme.finalizeTypes(specialSchemes);
}

// insert special cases
const ignore = new SchemeType('ignore');
ignore.simple = false;
ignore.optional = true;
ignore.typeName = 'Empty';
overallScheme.keys['ignore'] = ignore;

const guids: { [index: string]: GuidDefinition } = {};
overallScheme.getGuidDefinitions(guids);
fs.writeFileSync('./generated/guids.json', JSON.stringify(guids, undefined, 2));

// write assets.json
{
  if (!fs.existsSync(path.dirname(OUTPUT_FILEPATH))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILEPATH), { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILEPATH, JSON.stringify(assets, undefined, 2));

  console.log(`written to ${OUTPUT_FILEPATH}`);
}
