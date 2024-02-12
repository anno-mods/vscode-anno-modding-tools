import * as xmldoc from 'xmldoc';
import * as fs from 'fs';

export class DataSet {
  public readonly name: string;
  public readonly set: string[];

  constructor(name: string, set: string[]) {
    this.name = name;
    this.set = set;
  }
}

export const AllDataSets: { [index: string]: DataSet } = {};

function parseDataSet(node: xmldoc.XmlElement) : DataSet | undefined {
  const name = node.valueWithPath('Name');
  if (!name) {
    return undefined;
  }

  const items = node.childNamed('Items')?.childrenNamed('Item') ?? [];
  var dataSet = new DataSet(name, items.map(x => x.valueWithPath('Name') ?? ""));
  AllDataSets[name] = dataSet;
}

function parseDataSets(groupNode: xmldoc.XmlElement | undefined) {
  if (!groupNode) {
    return;
  }

  const dataSets = groupNode.childrenNamed('DataSet');
  for (const dataSet of dataSets) {
    parseDataSet(dataSet);
  }

  const groups = groupNode.childrenNamed('Group') ?? [];
  for (const group of groups) {
    parseDataSets(group);
  }
}

export function dataSetToXsd() : string {
  var xsd = '';

  for (const dataSet of Object.values(AllDataSets)) {
      xsd += `<xs:simpleType name="${dataSet.name}Type">\n`;
      xsd += `  <xs:restriction base="xs:string">\n`;
      for (const entry of dataSet.set) {
        xsd += `    <xs:enumeration value="${entry}" />\n`;
      }
      xsd += `  </xs:restriction>\n`;
      xsd += `</xs:simpleType>\n`;
  }

  return xsd;
}

export function readDataSets(filePath: string) {
  console.log(`read ${filePath}`);

  const xmlDoc = new xmldoc.XmlDocument(fs.readFileSync(filePath, { encoding: 'utf8' }));
  parseDataSets(xmlDoc);
}
