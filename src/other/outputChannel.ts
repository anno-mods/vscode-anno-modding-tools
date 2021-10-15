import * as vscode from 'vscode';

let _outputChannel: vscode.OutputChannel | undefined = undefined;

export function show() {
  _getOutputChannel(true);
}

export function log(line: string) {
  console.log(line);
  _getOutputChannel().appendLine(line);
}

export function warn(line: string) {
  console.warn(line);
  _getOutputChannel().appendLine(line);
}

export function error(line: string) {
  console.error(line);
  _getOutputChannel().appendLine(line);
}

function _getOutputChannel(show?: boolean) {
  if (!_outputChannel) {
    _outputChannel = vscode.window.createOutputChannel('Anno Modding Tools');
    _outputChannel.appendLine('Happy Modding!');
  }
  if (show) {
    _outputChannel.show(true);
  }
  return _outputChannel;
}
