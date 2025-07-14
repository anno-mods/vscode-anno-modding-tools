import * as vscode from 'vscode';

export function registerFolding(language: string): vscode.Disposable {
  return vscode.languages.registerFoldingRangeProvider({ language, scheme: 'file' }, { provideFoldingRanges });
}

function provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken) {
  const ranges: vscode.FoldingRange[] = [];
  const text = document.getText();
  const tagStack: { tag: string; line: number }[] = [];

  // XML tag folds, except ModOps
  const tagRegex = /<([a-zA-Z0-9:_-]+)([^\/>]*)?(?:[> ])|<\/([a-zA-Z0-9:_-]+)>|<([a-zA-Z0-9:_-]+)([^>]*)\/>/g;

  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchLine = document.positionAt(matchIndex).line;

    // Self-closing tag
    if (match[4]) continue;

    // Opening tag
    if (match[1] && match[1] !== "ModOps" && !text.substring(match.index, match[0].length - 1).endsWith("/>")) {
      tagStack.push({ tag: match[1], line: matchLine });
    }

    // Closing tag
    if (match[3]) {
      const tagName = match[3];
      for (let i = tagStack.length - 1; i >= 0; i--) {
        if (tagStack[i].tag === tagName) {
          const startLine = tagStack[i].line;
          const endLine = matchLine;
          if (endLine > startLine) {
            ranges.push(new vscode.FoldingRange(startLine, endLine));
          }
          tagStack.splice(i, 1);
          break;
        }
      }
    }
  }

  // <!-- # header folds, including ModOps as potential first header
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const text = line.text.trim();

    if (/^<!--\s*#/.test(text) || /^<ModOps>/.test(text)) {
      const start = i;
      let end = document.lineCount - 1;

      for (let j = i + 1; j < document.lineCount; j++) {
        const nextText = document.lineAt(j).text.trim();
        if (/^<!--\s*#/.test(nextText) || /^<\/ModOps>/.test(nextText)) {
          end = j - 1;
          break;
        }
      }

      if (end > start) {
        ranges.push(new vscode.FoldingRange(start, end));
      }
    }
  }

  return ranges;
}
