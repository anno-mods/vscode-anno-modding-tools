import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import * as channel from '../other/outputChannel';

export class ModinfoConverter {
  public getName() {
    return 'modinfo';
  }

  public run(files: string[], sourceFolder: string, outFolder: string, options: { 
    context: vscode.ExtensionContext, 
    modJson: any, 
    converterOptions: any }) {

    const targetFile = path.join(outFolder, "modinfo.json");
    
    try {
      if (!fs.existsSync(path.dirname(targetFile))) {
        fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      }

      // deep copy since we modify it
      const modinfo = JSON.parse(JSON.stringify(options.modJson.modinfo));
      
      // Category/ModName, fill other languages based on English
      const languages = [ "Chinese", "French", "German", "Italian", "Japanese", "Korean", "Polish", "Russian", "Spanish", "Taiwanese" ];
      for (let lang of languages) {
        if (!modinfo.Category[lang]) {
          modinfo.Category[lang] = modinfo.Category.English;
        }
        if (!modinfo.ModName[lang]) {
          modinfo.ModName[lang] = modinfo.ModName.English;
        }
      }

      // Description from MDs, no fallbacks here. AMM doesn't support languages properly anyway.
      for (let lang of [...languages, 'English']) {
        modinfo.Description[lang] = this._readMarkdownWithoutImages(sourceFolder, modinfo.Description[lang]);
      }
      // content_en.txt
      if (options.converterOptions.content_en && modinfo.Description.English) {
        fs.writeFileSync(path.join(path.dirname(targetFile), 'content_en.txt'), modinfo.Description.English);
      }
      // remove \r (after writing content_en.txt)
      for (let lang of [...languages, 'English']) {
        if (modinfo.Description[lang]) {
          modinfo.Description[lang] = modinfo.Description[lang].replace(/\r/g, '');
        }
      }

      fs.writeFileSync(targetFile, JSON.stringify(modinfo, null, 2));
      console.info(targetFile);
    }
    catch (exception: any)
    {
      channel.log('error while generating: ' + targetFile);
      channel.log(exception.message);
    }
  }

  private _readMarkdownWithoutImages(sourceFolder: string, filePath: string) {
    if (!filePath) {
      return null;
    }
    const descFile = path.join(sourceFolder, filePath);
    let content = null;
    if (fs.existsSync(descFile)) {
      content = fs.readFileSync(descFile).toString();
      content = content.replace(/!\[\]\([^)]+\)\r?\n?\r?\n?/g, '');
    }
    return content;
  }
}