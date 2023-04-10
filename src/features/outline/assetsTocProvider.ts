import * as vscode from 'vscode';
import * as xmldoc from 'xmldoc';
import * as guidUtils from '../guidUtilsProvider';

export interface TocEntry {
  text: string;
  children?: string[];
  detail: string;
  guid?: string;
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

  // returns 'ModOp' or template name
  private _getName(element: xmldoc.XmlElement, name?: string): string {
    if (element.name === 'ModOp') {
      return element.attr['Type'] || 'ModOp';
    }
    else if (element.name === 'Group' && name) {
      return name;
    }
    else if (element.name === 'Asset') {
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
    else if (element.name === 'Template') {
      return element.valueWithPath('Name') ?? element.name;
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
      return namedGuid || [guid, element.attr['Path']].filter((e) => e).join(', ');
    }
    else if (element.name === 'Asset') {
      const name = element.valueWithPath('Values.Standard.Name');
      const guid = element.valueWithPath('Values.Standard.GUID');
      return [name, guid].filter((e) => e).join(', ');
    }
    else if (element.name === 'Include') {
      return element.attr['File'];
    }
    return '';
  }

  private _getSymbol(element: xmldoc.XmlElement) {
    if (element.name === 'Asset') {
      const guid = element.valueWithPath('Values.Standard.GUID');
      return guid;
    }
    return undefined;
  }

  /// Return line number where the comment has occured. Max: 10 lines up.
  private _findCommentUp(document: SkinnyTextDocument, start: number, comment: string) {
    let line = start;
    let maxLineUp = Math.max(0, start - 9);
    for (; line >= maxLineUp; line--) {
      let text = document.lineAt(line);
      if (text.text.includes(comment)) {
        return line;
      }
    }

    // not found
    if (line == -1) {
      line = start;
    }
    return line;
  }

  private _buildToc(document: SkinnyTextDocument): TocEntry[] {
    const toc: TocEntry[] = [];

    const relevantSections: { [index: string]: any } = {
      /* eslint-disable @typescript-eslint/naming-convention */
      'ModOp': { minChildren: 0, symbol: vscode.SymbolKind.Property },
      'Group': { minChildren: 0, symbol: vscode.SymbolKind.Module },
      'Asset': { minChildren: 1, symbol: vscode.SymbolKind.Class },
      'Template': { minChildren: 1, symbol: vscode.SymbolKind.Class },
      'Include': { minChildren: 0, symbol: vscode.SymbolKind.Module }
      /* eslint-enable @typescript-eslint/naming-convention */
    };

    let sectionComment: string | undefined = 'ModOps';
    let groupComment: string | undefined;
    let groupCommentLine: number | undefined;

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
        else if (comment) {
          groupComment = comment;
        }
      }
      else if (top.element.type === 'element') {
        // open ModOp section
        if (sectionComment && relevantSections[top.element.name]) {
          const line = this._findCommentUp(document, top.element.line, sectionComment);
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
        if (tocRelevant && children.length >= tocRelevant.minChildren) {
          // TODO tagStartColumn is 0 for multiline tags, not correct but ...
          const tagStartColumn = Math.max(0, top.element.column - top.element.position + top.element.startTagPosition - 1);
          const line = (groupComment && top.element.name === 'Group') ? this._findCommentUp(document, top.element.line, groupComment) : top.element.line;
          toc.push({
            text: this._getName(top.element, groupComment),
            detail: this._getDetail(top.element),
            level: top.depth,
            line,
            guid: this._getSymbol(top.element),
            location: new vscode.Location(document.uri,
              new vscode.Range(line, tagStartColumn, line, top.element.column)),
            symbol: relevantSections[top.element.name]?.symbol ?? vscode.SymbolKind.String
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

        groupComment = undefined;
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