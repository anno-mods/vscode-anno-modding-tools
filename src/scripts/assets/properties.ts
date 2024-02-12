import * as xmldoc from 'xmldoc';
import * as fs from 'fs';
import { AllDataSets, DataSet } from './datasets';

enum DataType {
  Choice,
  Flags,
  Unknown
}

class Definition {
  public readonly name: string;
  public readonly dataType: DataType;
  public dataSet: DataSet | undefined;

  constructor(name: string, dataType: DataType) {
    this.name = name;
    this.dataType = dataType;
  }
}

export const AllDefinitions: { [index: string]: Definition[] } = {};

class Property {
  public readonly name: string;
  public readonly definitions: { [name: string]: Definition };

  constructor(name: string) {
    this.name = name;
    this.definitions = {};
  }
}

export const AllProperties: { [index: string]: Property } = {};

function parseDefinition(node: xmldoc.XmlElement) : Definition | undefined {
  const name = node.valueWithPath('Name');
  const dataType = node.valueWithPath('DataType');
  if (!name) {
    return undefined;
  }

  if (dataType == 'Choice') {
    var definition = new Definition(name, DataType.Choice);
    const dataSetName = node.valueWithPath('DataSet');
    definition.dataSet = AllDataSets[dataSetName ?? ""];

    AllDefinitions[definition.name] ??= [];
    AllDefinitions[definition.name] = [ ...AllDefinitions[definition.name], definition ];
    return definition;
  }

  return undefined;
}

function parseProperty(node: xmldoc.XmlElement) : Property | undefined {
  const propertyName = node.valueWithPath('Name');
  if (!propertyName) {
    return undefined;
  }

  var property = new Property(propertyName);
  AllProperties[propertyName] = property;

  const definitions = node.childrenNamed('ValueDefinition');
  for (const definitionNode of definitions) {
    var definition = parseDefinition(definitionNode);
    if (definition) {
      property.definitions[definition.name] = definition;
    }
  }
}

function parseProperties(groupNode: xmldoc.XmlElement | undefined) {
  if (!groupNode) {
    return;
  }

  const properties = groupNode.childrenNamed('Property');
  for (const property of properties) {
    parseProperty(property);
  }

  const groups = groupNode.childNamed('Groups')?.childrenNamed('Group') ?? [];
  for (const group of groups) {
    parseProperties(group);
  }
}

export function readProperties(filePath: string) {
  console.log(`read ${filePath}`);

  const xmlDoc = new xmldoc.XmlDocument(fs.readFileSync(filePath, { encoding: 'utf8' }));

  parseProperties(xmlDoc);
}
