import * as path from 'path';
import * as vscode from 'vscode';

import { SymbolRegistry } from '../data/symbols';

export namespace GuidCounter {
  let next_: number | undefined;
  let config_: vscode.WorkspaceConfiguration | undefined;
  let scope_: vscode.ConfigurationTarget | undefined;
  let name_: string | undefined;
  // let reset_: boolean = true;

  export function getCompletionItems(): vscode.CompletionItem[] {
    const newGuidItem = new vscode.CompletionItem({
      label: `<New GUID>`,
      description: nextName(),
    }, vscode.CompletionItemKind.Snippet);
    newGuidItem.kind = vscode.CompletionItemKind.Event;
    newGuidItem.sortText = '   __000'; // keep it the very first item

    if (isConfigured()) {
      newGuidItem.command = { command: 'anno-modding-tools.incrementAutoGuid', title: 'increment GUID...' };
      newGuidItem.insertText = `${next()}`;
    }
    else {
      newGuidItem.command = { command: 'workbench.action.openSettings', title: 'open settings' };
      newGuidItem.command.arguments = [ 'anno.autoGuid' ];
      newGuidItem.insertText = "";
    }

    return [ newGuidItem ];
  }

  function isConfigured(): boolean {
    return next_ !== undefined && config_ !== undefined && scope_ !== undefined;
  }

  function next() : number {
    return next_ ?? 0;
  }

  function nextName() : string {
    if (!isConfigured()) {
      return 'Open settings to configure `anno.autoGuid`';
    }

    if (scope_ === vscode.ConfigurationTarget.WorkspaceFolder) {
      return `Next in '${name_}' range: ${next_}`;
    }
    if (scope_ === vscode.ConfigurationTarget.Workspace) {
      return `Next in '${name_}' range: ${next_}`;
    }
    else {
      return `Next in user range: ${next_}`;
    }
  }

  function increase() {
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

    for (let i = 0; i < 10000 && SymbolRegistry.resolve(`${next_}`) !== undefined; i++) {
      next_++;
    }
  }

  export function use(uri: vscode.Uri) {
    // if (!reset_) {
    //   return;
    // }

		config_ = vscode.workspace.getConfiguration('anno', uri);
    const next = config_.inspect('autoGuid');

    if (next?.workspaceFolderValue as number > 0) {
      next_ = next?.workspaceFolderValue as number;
      scope_ = vscode.ConfigurationTarget.WorkspaceFolder;
      name_ = vscode.workspace.getWorkspaceFolder(uri)?.name;
    }
    else if (next?.workspaceValue as number > 0) {
      next_ = next?.workspaceValue as number;
      scope_ = vscode.ConfigurationTarget.Workspace;
      const folder = vscode.workspace.workspaceFile?.fsPath;
      name_ = folder ? path.basename(folder) : undefined;
    }
    else if (next?.globalValue as number > 0) {
      next_ = next?.globalValue as number;
      scope_ = vscode.ConfigurationTarget.Global;
    }
    else {
      next_ = undefined;
      scope_ = undefined;
      next_ = undefined;
    }

    skipUsedEntries();

    // if (vscode.workspace.workspaceFolders?.length ?? 0 > 1) {
    //   // always reset in case of multiple workspace folders, otherwise restrict to only settings/folder change events
    //   reset_ = true;
    // }
  }

  export function register(context: vscode.ExtensionContext) {
    const disposable = [
      vscode.commands.registerCommand('anno-modding-tools.incrementAutoGuid', async (fileUri) => {
        // Don't do use again, it could change the scope.
        // use(fileUri);
        increase();
      }),
      // vscode.workspace.onDidChangeConfiguration((event) => {
      //   if (event.affectsConfiguration('anno.autoGuid')) {
      //     reset_ = true;
      //   }
      // }),
      // vscode.workspace.onDidChangeWorkspaceFolders((event) => {
      //   if (event.added.length > 0) {
      //     reset_ = true;
      //   }
      // })
    ];

    return disposable;
	}
}