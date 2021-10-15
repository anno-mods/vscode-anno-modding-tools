import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as gltfPipeline from 'gltf-pipeline';
import * as child from 'child_process';
import * as url from 'url';

import * as channel from '../other/outputChannel';

export class GlbConverter {
  public getName() {
    return 'gltf';
  }

  public run(files: string[], sourceFolder: string, outFolder: string, options: { 
    context: vscode.ExtensionContext, 
    cache: string, 
    converterOptions: any }) {

    const fakePngPath = options.context.asAbsolutePath("./images/fake.png");
    const fakePngUrl = new url.URL(`file:///${fakePngPath}`);
    const rdmPath = options.context.asAbsolutePath("./external/rdm4-bin.exe");
    
    for (const file of files) {
      try {
        if (!fs.existsSync(path.dirname(path.join(outFolder, file)))) {
          fs.mkdirSync(path.dirname(path.join(outFolder, file)), { recursive: true });
        }
        if (!fs.existsSync(path.dirname(path.join(options.cache, file)))) {
          fs.mkdirSync(path.dirname(path.join(options.cache, file)), { recursive: true });
        }

        const dirname = path.dirname(file);
        const basename = path.basename(file, '.gltf');

        const lodLevels = Math.max(1, Math.min(9, options.converterOptions.lods || 4));

        for (let lodLevel = 0; lodLevel < lodLevels; lodLevel++) {
          const lodname = path.join(dirname, basename + '_lod' + lodLevel);

          const gltf = JSON.parse(fs.readFileSync(path.join(sourceFolder, file), 'utf8'));

          // replace images to avoid errors with missing ones (we don't need them anyways)
          this._replaceImages(gltf, fakePngUrl.href);

          // remove all nodes/meshes but this lod
          if (gltf.meshes.length > 1) {
            const found = this._reduceToMesh(gltf, (e) => !e.name.endsWith('_lod' + lodLevel));
            if (!found) {
              channel.log(file + ' does not include nodes/meshes ending with \'_lod' + lodLevel + '\'');
              if (lodLevel === 0) {
                // multiple meshes, no _lod0. Use rdm4 default behavior for this case (first mesh).
              }
              else {
                // skip converting
                continue;
              }
            }
          }

          const resourceDirectory = path.join(sourceFolder, dirname);
          const targetFile = path.join(outFolder, lodname + '.rdm');
          const tempFile = path.join(options.cache, lodname + '.glb');
          this._writeRdmFile(gltf, targetFile, tempFile, resourceDirectory, rdmPath).then(() => {
            // be happy
          }).catch((err: any) => {
            channel.log('error while converting: ' + path.join(options.cache, lodname + '.glb'));
            channel.log(err);
          });
        }
        channel.log(sourceFolder + file);
      }
      catch (exception: any)
      {
        channel.log('error while converting: ' + sourceFolder + file);
        channel.log(exception.message);
      }
    }
  }

  private _replaceImages(gltf: any, fakePngUrl: string) {
    if (gltf.images)
    {
      const images = gltf.images.length;
      for (let i = 0; i < images; i++) {
        gltf.images[i].uri = fakePngUrl;
      }
    }
  }

  private _reduceToMesh(gltf: any, match: (mesh: { name: string }) =>  boolean ) {
    let meshIdx = -1;
    for (let i = 0; i < gltf.meshes.length; i++) {
      if (gltf.meshes[i].name && !match(gltf.meshes[i])) {
        meshIdx = i;
        break;
      }
    }
    let nodeIdx = -1;
    for (let i = 0; i < gltf.nodes.length; i++) {
      if (gltf.nodes[i].mesh === meshIdx || (gltf.nodes[i].name && !match(gltf.nodes[i]))) {
        nodeIdx = i;
        meshIdx = gltf.nodes[i].mesh;
        break;
      }
    }

    if (meshIdx < 0 || nodeIdx < 0) {
      return false;
    }

    gltf.meshes = [ gltf.meshes[meshIdx] ];
    gltf.nodes = [ gltf.nodes[nodeIdx] ];
    gltf.nodes[0].mesh = 0;
    gltf.scenes = [ {
      name: "Scene",
      nodes: [ 0 ]
    }];

    // remove nodes from skins
    if (gltf.skins) {
      for (let skin of gltf.skins) {
        skin.joints = skin.joints.filter((e: string|number) => e.toString() === nodeIdx.toString());
      }
    }

    return true;
  }

  private _writeRdmFile(gltf: any, targetFile: string, tempFile: string, resourceDirectory: string, rdmPath: string) {
    return new Promise((resolve, reject) => {
      const gltfOptions = {
        resourceDirectory,
      };
      gltfPipeline.gltfToGlb(gltf, gltfOptions).then(function (results: any) {
        fs.writeFileSync(tempFile, results.glb);
      
        // rdm4-bin does not overwrite, so delete target. I'm not comfortable to use --force for that.
        if (fs.existsSync(targetFile)) {
          fs.rmSync(targetFile);
        }

        const res = child.execFileSync(rdmPath, [
          '-g',
          'P4h_N4b_G4b_B4b_T2h',
          '-n',
          '-o',
          path.dirname(targetFile),
          '-i', 
          tempFile,       
        ]);
        resolve(true);
      }).catch((err: any) => {
        reject(err);
      });
    });
  }
}