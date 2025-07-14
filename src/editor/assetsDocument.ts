import * as vscode from 'vscode';
import * as xmldoc from 'xmldoc';

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

export class AssetsDocument {
  public readonly document: SkinnyTextDocument;
  public readonly uri: vscode.Uri;
  public readonly xml: xmldoc.XmlDocument | null;

  public constructor(document: SkinnyTextDocument) {
    this.document = document;
    this.uri = document.uri;
    try {
      this.xml = new xmldoc.XmlDocument(this.document.getText());
    }
    catch (exception) {
      this.xml = null;
    }
  }

  public analyze() {
  }
}
