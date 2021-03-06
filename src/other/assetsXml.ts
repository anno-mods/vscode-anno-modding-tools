import * as xmldoc from 'xmldoc';

export const ASSETS_FILENAME_PATTERN = '**/{assets*.xml,tests/*-input.xml,tests/*-expectation.xml}';

export interface IAsset {
  guid: string;
  template?: string;
  name?: string;
  english?: string;
}

export interface IPositionedElement {
  history: xmldoc.XmlElement[];
  element: xmldoc.XmlElement;
  position: number;
}

export class AssetsDocument {
  content: xmldoc.XmlDocument;
  assets: { [index: string]: IAsset };

  lines: IPositionedElement[][];

  constructor(content: xmldoc.XmlDocument) {
    const relevantNodes = new Set<string>(['ModOps', 'ModOp', 'Asset', 'Values', 'Standard', 'GUID']);

    this.content = content;
    this.assets = {};
    this.lines = [];

    const nodeStack: { history: xmldoc.XmlElement[], element: xmldoc.XmlNode }[] = [{ history: [], element: this.content }];
    while (nodeStack.length > 0) {
      const top = nodeStack.pop();
      if (top?.element.type === 'element' /*&& relevantNodes.has(top.element.name)*/) {
        if (top.element.name === 'ModOp') {
          // const xpath = top.element.attr['Path'];
        }
        
        const p = top.element.column - (top.element.position - top.element.startTagPosition + 1);
        this.getLine(top.element.line).push({ 
          history: top.history.slice(), 
          element: top.element, 
          position: p
        });

        if (top.element.name === 'GUID') {
          const guid = top.element.val;
          const parent = top.history.length >= 2 ? top.history[top.history.length - 2] : undefined;
          const name = parent?.valueWithPath('Name');
  
          if (parent?.name === 'Standard' && name) {
            this.assets[guid] = {
              guid,
              name,
              template: top.history.length >= 4 ? top.history[top.history.length - 4].valueWithPath('Template') : undefined
            };
          }
        }
  
        const children = (top.element.children ? top.element.children.filter((e) => e.type === 'element') : []).map((e) => (
          { history: [...top.history, e as xmldoc.XmlElement], element: e }
        ));
        if (children.length > 0) {
          // has tag children
          nodeStack.push(...children.reverse());
        }
      }
      else {
        // ignore
      }
    } 
  }

  hasLine(line: number) {
    return (line < this.lines.length);
  }

  getLine(line: number) {
    while (line >= this.lines.length) {
      this.lines.push([]);
    }
    return this.lines[line];
  }

  getClosestElementLeft(line: number, position: number) {
    if (line >= this.lines.length) return undefined;

    const thisLine = this.lines[line];
    if (thisLine.length === 0 || thisLine[0].position > position) {
      while (line > 0) {
        line--;
        if (this.lines[line].length > 0) {
          return this.lines[line].slice(-1)[0];
        }
      }
    }

    let i = 0;
    while (i < thisLine.length - 1 && (thisLine[i + 1].position <= position)) {
      i++
    }

    return thisLine[i];
  }

  getPath(line: number, position: number, removeLast: boolean = false) {
    let path = this.getClosestElementLeft(line, position)?.history;
    let prefix = undefined;
    while (path && path.length > 0 && (path[0].name === 'Asset' || path[0].name === 'ModOp' || path[0].name === 'Assets'))
    {
      if (path[0].name === 'ModOp' && path[0].attr['Path']) {
        // TODO replace brackets []
        prefix = path[0].attr['Path'];
        if (!prefix.endsWith('/')) {
          prefix += '/';
        }
        path = path.slice(1);
      }
      else {
        prefix = undefined;
        path = path.slice(1);
      }
    }
    if (path && path.length > 0 && removeLast) {
      path = path.slice(0, -1);
    }
    return path ? ((prefix ?? '/') + path.map(e => e.name).join('/')) : undefined;
  }
}