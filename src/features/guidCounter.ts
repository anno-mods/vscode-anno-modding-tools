import * as vscode from 'vscode';
import { SymbolRegistry } from '../data/symbols';

export namespace GuidCounter {
  let next_: number | undefined;
  let config_: vscode.WorkspaceConfiguration | undefined;
  let scope_: vscode.ConfigurationTarget | undefined;

  export function next() : number {
    return next_ ?? 0;
  }

  export function nextName() : string {
    if (next_ === undefined || config_ === undefined || scope_ === undefined) {
      return 'please configure `autoGuid`';
    }

    if (scope_ === vscode.ConfigurationTarget.WorkspaceFolder) {
      return `WorkspaceFolder: ${next_}`;
    }
    if (scope_ === vscode.ConfigurationTarget.Workspace) {
      return `Workspace: ${next_}`;
    }
    else {
      return `User: ${next_}`;
    }
  }

  export function increase() {
    if (next_ === undefined || next_ <= 0 || config_ === undefined || scope_ === undefined) {
      return;
    }

    next_++;
    skipUsedEntries();

    config_.update('autoGuid', next_, scope_);
  }

  function skipUsedEntries() {
    if (next_ === undefined || next_ === 0) {
      return;
    }

    for (let i = 0; i < 10000 && SymbolRegistry.resolve(`${next_}`) !== undefined; i++)
      next_++;
  }

  export function use(uri: vscode.Uri) {
    if (next_ !== undefined) {
      return;
    }

		config_ = vscode.workspace.getConfiguration('anno', uri);
    const next = config_.inspect('autoGuid');

    if (next?.workspaceFolderValue as number > 0) {
      next_ = next?.workspaceFolderValue as number;
      scope_ = vscode.ConfigurationTarget.WorkspaceFolder;
    }
    else if (next?.workspaceValue as number > 0) {
      next_ = next?.workspaceValue as number;
      scope_ = vscode.ConfigurationTarget.Workspace;
    }
    else if (next?.globalValue as number > 0) {
      next_ = next?.globalValue as number;
      scope_ = vscode.ConfigurationTarget.Global;
    }

    skipUsedEntries();
  }

  export function register(context: vscode.ExtensionContext) {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.incrementAutoGuid', async (fileUri) => {
        // use(fileUri);
        increase();
      })
    ];

    return disposable;
	}
}