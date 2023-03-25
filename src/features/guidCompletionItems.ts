import * as vscode from 'vscode';
import * as fs from 'fs';

interface ITagJson 
{
  templates: string[],
  paths: { [index: string]: string[] }
}

interface IAsset {
  guid: string;
  template?: string;
  name?: string;
  english?: string;
  modName?: string;
}

class PathCompletionItem {
  path: string;
  templates: string[];

  constructor(path: string, templates: string[]) {
    this.path = path;
    this.templates = templates;
  }

  hasMatchingPath(path: string) {
    if (path.length > this.path.length) {
      return false;
    }

    return this.path.endsWith(path);
  }
}

class TagCompletionItem {
  name: string;
  paths: PathCompletionItem[];

  constructor(name: string, paths: { [path: string]: string[] }) {
    this.name = name;
    this.paths = [];
    for (var path of Object.keys(paths)) {
      this.paths.push(new PathCompletionItem(path, paths[path]));
    }
  }
}

type CompletionItemMap = { [ guid: string]: vscode.CompletionItem };

export class GuidCompletionItems {
  tags: { [tag: string]: TagCompletionItem } | undefined;
  assets: { [index: string]: IAsset } | undefined = undefined;

  _items: { [ template: string]: CompletionItemMap } = {};
  _allItems: CompletionItemMap = {};

  load(context: vscode.ExtensionContext) {
    if (!this.assets) {
      const assetPath = context.asAbsolutePath('./generated/');
      this.assets = JSON.parse(fs.readFileSync(assetPath + 'assets.json', { encoding: 'utf8' }));
      const tagsData = JSON.parse(fs.readFileSync(assetPath + 'guids.json', { encoding: 'utf8' })) as { [index: string]: ITagJson };
    
      if (!this.assets) {
        return this.assets;
      }

      this.tags = {};
      for (var tagName of Object.keys(tagsData)) {
        this.tags[tagName] = new TagCompletionItem(tagName, tagsData[tagName].paths);
      }

      this.fromAssets(this.assets, this.tags);
    }
  
    return this.assets;
  }

  fromAssets(assets: { [guid: string]: IAsset}, tags?: { [tag: string]: TagCompletionItem }) {
    this.tags = tags;
    this.assets = assets;
    this._items = {};
    this._allItems = {};
    for (let guid of Object.keys(assets)) {
      const asset = assets[guid];
      if (asset.template) {
        this.push(asset.template, guid, asset);
      }
    }
  }

  addAssets(assets: { [guid: string]: IAsset}, tags?: { [tag: string]: TagCompletionItem }, modName?: string)
  {
    this.tags = tags;
    if (!this.assets) {
      this.assets = {};
    }

    for (let guid of Object.keys(assets)) {
      const asset = assets[guid];
      if (asset.template) {
        this.push(asset.template, guid, asset, this.assets[guid] != undefined);
      }
      if (modName) {
        asset.modName = modName ?? this.assets[guid]?.modName;
      }
      this.assets[guid] = asset;
    }
  }

  push(templateName: string, guid: string, asset: IAsset, remove: boolean = false) {
    const item = new vscode.CompletionItem({
      label: `${asset.english||asset.name}`,
      description: `${asset.template}: ${guid} (${asset.name})`
    }, vscode.CompletionItemKind.Snippet);
    item.insertText = guid;
    
    const items = this._items[templateName] ?? {};
    items[guid] = item;
    this._items[templateName] = items;

    if (!this._allItems) {
      this._allItems = {};
    }
    this._allItems[guid] = item;
  }

  get(tagName: string, path?: string) {
    if (!this.tags) {
      return undefined;
    }
    const tag = this.tags[tagName];
    if (!tag) {
      return undefined;
    }

    if (path && path.endsWith(tagName)) {
      path = path.substring(0, path.length - tagName.length - 1);
      if (path.endsWith('/')) {
        path = path.substring(0, path.length - 2);
      }
    }
    const paths = path ? tag.paths.filter(e => e.hasMatchingPath(path!)) : tag.paths;
    
    let templates = new Set<string>();
    for (var p of paths) {
      for (var t of p.templates) {
        templates.add(t);
      }
    }

    let items = [];
    for (var t of templates) {
      items.push(...(Object.values(this._items[t])??[]));
    }
    return items;
  }

  getAllItems() {
    return Object.values(this._allItems);
  }
}

export const AllGuidCompletionItems = new GuidCompletionItems();
