import * as vscode from 'vscode';
import * as xmldoc from 'xmldoc';
import * as guidUtils from '../guidUtilsProvider';

export interface TocEntry {
  text: string;
  children?: string[];
  detail: string;
  readonly level: number;
  readonly line: number;
  readonly location: vscode.Location;
  readonly symbol: vscode.SymbolKind;
}

export interface SkinnyTextLine {
  text: string;
}

export interface SkinnyTextDocument {
  readonly uri: vscode.Uri;
  readonly version: number;
  readonly lineCount: number;

  lineAt(line: number): SkinnyTextLine;
  getText(): string;
}

export class AssetsTocProvider {
  private toc?: TocEntry[];

  public constructor(
    private document: SkinnyTextDocument
  ) { }

  public getToc(): TocEntry[] {
    if (!this.toc) {
      try {
        this.toc = this._buildToc(this.document);
      } catch (e) {
        this.toc = [];
      }
    }
    return this.toc;
  }

  public getParentPath(line: number, position: number): string {
    try {
      return this._getParentPath(this.document, line, position);
    } catch (e) {
      return '';
    }
  }

  private _getName(element: xmldoc.XmlElement) {
    if (element.name === 'ModOp') {
      return element.attr['Type'] || 'ModOp';
    }
    if (element.name === 'Asset') {
      const template = element.valueWithPath('Template');
      if (template) {
        return template;
      }
      const base = element.valueWithPath('BaseAssetGUID');
      if (base) {
        const resolvedGuid = guidUtils.resolveGUID(base);
        if (resolvedGuid) {
          return `${resolvedGuid.template}: ${resolvedGuid.name}`;
        }
        else {
          return `${base}`;
        }
      }
    }
    return element.name;
  }

  private _getDetail(element: xmldoc.XmlElement) {
    if (element.name === 'ModOp') {
      const guid = element.attr['GUID'];
      let namedGuid = undefined;
      if (guid) {
        const resolvedGuid = guidUtils.resolveGUID(guid);
        if (resolvedGuid) {
          namedGuid = `${resolvedGuid.name}`;
        }
      }
      return namedGuid || [ guid, element.attr['Path']].filter((e) => e).join(', ');
    }
    else if (element.name === 'Asset') {
      const name = element.valueWithPath('Values.Standard.Name');
      const guid = element.valueWithPath('Values.Standard.GUID');
      return [ name, guid ].filter((e) => e).join(', ');
    }
    return '';
  }

  private _buildToc(document: SkinnyTextDocument): TocEntry[] {
    const toc: TocEntry[] = [];

    const relevantSections: { [index: string]: any } = {
      /* eslint-disable @typescript-eslint/naming-convention */
      'ModOp': {},
      'Asset': {}
      /* eslint-enable @typescript-eslint/naming-convention */
    };

    const symbolMap: { [index: string]: vscode.SymbolKind } = {
      /* eslint-disable @typescript-eslint/naming-convention */
      'ModOp': vscode.SymbolKind.Property,
      'Asset': vscode.SymbolKind.Class
      /* eslint-enable @typescript-eslint/naming-convention */
    };

    let sectionComment: string | undefined = 'ModOps';

    let xmlContent;
    try {
      xmlContent = new xmldoc.XmlDocument(document.getText());
    }
    catch (exception) {
      return [];
    }

    const nodeStack: { depth: number, element: xmldoc.XmlNode }[] = [{ depth: 0, element: xmlContent }];
    for (let top = nodeStack.pop(); top; top = nodeStack.pop()) {

      if (top.element.type === 'comment' && top.depth === 1) {
        let comment = top.element.comment.trim();
        if (comment.startsWith('#')) {
          comment = comment.replace(/#/g, '').trim();
          if (comment) {
            sectionComment = comment;
          }
        }
      }
      else if (top.element.type === 'element') {
        // open ModOp section
        if (sectionComment && top.element.name === 'ModOp') {
          const line = Math.max(0, top?.element.line - 1);
          toc.push({
            text: sectionComment,
            detail: '',
            level: 0,
            line,
            location: new vscode.Location(document.uri,
              new vscode.Range(line, 0, line, 1)),
            symbol: vscode.SymbolKind.Package
          });
          sectionComment = undefined;
        }

        const depth = top.depth;
        const children = (top.element.children ? top.element.children.filter((e) => e.type === 'element' || e.type === 'comment') : []).map((e) => (
          { depth: depth + 1, element: e }
        ));
        if (children.length > 0) {
          // has tag children
          nodeStack.push(...children.reverse());
        }

        // check if relevant, also ignore simple items
        const tocRelevant = relevantSections[top.element.name];
        if (tocRelevant && children.length > 0) {
          toc.push({
            text: this._getName(top.element),
            detail: this._getDetail(top.element),
            level: top.depth,
            line: top.element.line,
            location: new vscode.Location(document.uri,
              new vscode.Range(top.element.line, top.element.column - top.element.position + top.element.startTagPosition - 1, top.element.line, top.element.column)),
            symbol: symbolMap[top.element.name] || vscode.SymbolKind.String
          });
        }
        else if (!tocRelevant && top.depth === 2) {
          // ModOps that are not Assets
          if (!toc[toc.length - 1].children) {
            toc[toc.length - 1].children = [];
          }

          let name: string | undefined = top.element.name;
          if (name === 'Item') {
            name = top.element.valueWithPath('Product') || top.element.valueWithPath('Building') || top.element.valueWithPath('GUID');
            if (name) {
              const resolved = guidUtils.resolveGUID(name);
              name = resolved?.name;
            }
          }

          toc[toc.length - 1].children?.push(name || 'Item');
        }
      }
      else {
        // ignore
      }
    }

    // preview children in detail
    for (let entry of toc) {
      if (entry.children) {
        let prefix = entry.children[0];
        if (entry.children.length > 1) {
          if (entry.children.join('') === entry.children[0].repeat(entry.children.length)) {
            prefix += '[]';
          }
          else {
            prefix += ', ...';
          }
        }

        // ignore Item, they are the most common e.g. in build menues and just too obvious to justify the clutter
        if (prefix !== 'Item' && prefix !== 'Item[]') {
          prefix += ' → ';
          entry.detail = prefix + entry.detail;
        }
      }
    }

    // Get full range of section
    return toc.map((entry, startIndex): TocEntry => {
      let end: number | undefined = undefined;
      for (let i = startIndex + 1; i < toc.length; ++i) {
        if (toc[i].level <= entry.level) {
          end = toc[i].line - 1;
          break;
        }
      }
      const endLine = end ?? document.lineCount - 1;
      return {
        ...entry,
        location: new vscode.Location(document.uri,
          new vscode.Range(
            entry.location.range.start,
            new vscode.Position(endLine, document.lineAt(endLine).text.length)))
      };
    });
  }

  private _getParentPath(document: SkinnyTextDocument, line: number, position: number): string {
    const xmlContent = new xmldoc.XmlDocument(document.getText());
    const nodeStack: { history: string[], element: xmldoc.XmlNode }[] = [{ history: [], element: xmlContent }];
    while (nodeStack.length > 0) {
      const top = nodeStack.pop();
      if (top?.element.type === 'element') {
        const name = top.element.name;
        const elementLength = (top.element.position - top.element.startTagPosition);
        if (top.element.line === line && top.element.column > position && top.element.column < position + elementLength) {
          return top.history.join('/');
        }
        if (top.element.line > line) {
          // should not happen
          return '';
        }

        const children = (top.element.children ? top.element.children.filter((e) => e.type === 'element') : []).map((e) => (
          { history: [...top.history, name], element: e }
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

    return '';
  }
}