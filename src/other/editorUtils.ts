import * as vscode from 'vscode';

export function getTagCloseAt(doc: vscode.TextDocument, position: vscode.Position) {
  let lineNumber = position.line;
  let line = doc.lineAt(lineNumber);
  let index = -1;
  while (index === -1 && lineNumber < doc.lineCount - 1) {
    line = doc.lineAt(lineNumber++);
    index = line.text.search(/<(?=\w)/);
  }

  if (line && index !== -1 && line.text.length > index + 1) {
    if (line.text[index + 1] !== '/') {
      // we're in a tag. probably
      let end = line.text.substring(index + 1).search(/[ \/>]/);
      return { 
        name: line.text.substring(index + 1, end === -1 ? undefined : (end + index + 1)),
        line: lineNumber - 1,
        position: index
      };
    }
  }

  return undefined;
}

export function findTagUp(tag: string, doc: vscode.TextDocument, position: vscode.Position) {
  let lineNumber = position.line;
  let line = doc.lineAt(lineNumber);
  let index = -1;
  const exp = new RegExp('<' + tag + '(?=[ />])');
  while (index === -1 && lineNumber >= 0) {
    line = doc.lineAt(lineNumber--);
    index = line.text.search(exp);
  }

  if (index !== -1) {
    return new vscode.Position(lineNumber + 1, index);
  }

  return new vscode.Position(0, 0);
}

export function findTagBegin(tag: string, doc: vscode.TextDocument, position: vscode.Position) {
  let firstTag = getTagCloseAt(doc, position);
  if (firstTag === undefined) {
    return new vscode.Position(0, 0);
  }

  if (firstTag.name !== tag) {
    return findTagUp(tag, doc, position);
  }

  return new vscode.Position(firstTag.line, firstTag.position);
}

export function findTagEnd(tag: string, doc: vscode.TextDocument, position: vscode.Position) {
  let lineNumber = position.line;
  let line = doc.lineAt(lineNumber);
  let index = -1;
  while (index === -1 && lineNumber < doc.lineCount) {
    line = doc.lineAt(lineNumber++);
    index = line.text.indexOf('</' + tag + '>');
  }

  // TODO no opening tags!

  if (index !== -1) {
    return new vscode.Position(lineNumber - 1, index + 3 + tag.length);
  }

  return doc.lineAt(doc.lineCount - 1).range.end;
}

export function getSelectedModOps(doc: vscode.TextDocument, selection: vscode.Selection) {
  let content: string = doc.getText();

  const start = doc.offsetAt(selection.start);
  const end = doc.offsetAt(selection.end);

  const reduceRegexes = [
    /<ModOp [^>]*>([\s\S]*?)<\/ModOp>/g,
    /<(ModOp|Include) [^>]*\/>/g
  ];

  for (const regex of reduceRegexes) {
    content = content.replace(regex, (match, group, offset) => {
      if (offset + match.length <= start || offset >= end) {
        return "";
      } else {
        return match;
      }
    });
  }

  return content;
}
