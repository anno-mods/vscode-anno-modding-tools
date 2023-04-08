import * as assert from 'assert';
import * as vscode from 'vscode';

import { AssetsTocProvider, SkinnyTextDocument } from '../../features/outline/assetsTocProvider';

const text = `<ModOps>
  <ModOp Type="add">
    <Asset>
      <Template>Template1</Template>
      <Values>
        <Standard>
          <GUID>123</GUID>
          <Name>Name2</Name>
        </Standard>
      </Values>
    </Asset>
  </ModOp>
<ModOps>`.split('\n');

suite('outline tests', () => {
  test('template names', async () => {

    let textDocument: SkinnyTextDocument = {
      uri: vscode.Uri.file('abc.xml'),
      version: 0,
      lineCount: text.length,
      getText: () => {
        return text.join('\n');
      },
      lineAt: (line: number) => {
        return { text: text[line] };
      }
    };

    const provider = new AssetsTocProvider(textDocument);
    const toc = provider.getToc();

    assert.strictEqual(toc[1].text, "add");
    assert.strictEqual(toc[2].text, "Template1");
    assert.strictEqual(toc[2].guid, "123");
  });

  test('section comments', async () => {
    const text = `<ModOps>
      <!-- # Section 1 -->
      <ModOp Type="add" />
      <!-- # Section 2 -->
      <Group />
      <!-- # Section 3 -->
      <Include />
    <ModOps>`.split('\n');

    let textDocument: SkinnyTextDocument = {
      uri: vscode.Uri.file('abc.xml'),
      version: 0,
      lineCount: text.length,
      getText: () => {
        return text.join('\n');
      },
      lineAt: (line: number) => {
        return { text: text[line] };
      }
    };

    const provider = new AssetsTocProvider(textDocument);
    const toc = provider.getToc();

    assert.strictEqual(toc[0].text, "Section 1");
    assert.strictEqual(toc[2].text, "Section 2");
    assert.strictEqual(toc[4].text, "Section 3");
  });
});
