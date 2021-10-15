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

          const gltfToGlb = gltfPipeline.gltfToGlb;
          const gltf = JSON.parse(fs.readFileSync(path.join(sourceFolder, file), 'utf8'));

          // replace image URIs
          if (gltf.images)
          {
            const images = gltf.images.length;
            for (let i = 0; i < images; i++) {
              // if (!fs.existsSync(path.join(sourceFolder, dirname, gltf.images[i].uri))) {
                gltf.images[i].uri = fakePngUrl.href;
              // }
            }
          }
          // remove all nodes/meshes but this lod
          {
            let meshIdx = -1;
            for (let i = 0; i < gltf.meshes.length; i++) {
              if (gltf.meshes[i].name.endsWith('_lod' + lodLevel)) {
                meshIdx = i;
                break;
              }
            }
            let nodeIdx = -1;
            for (let i = 0; i < gltf.nodes.length; i++) {
              if (gltf.nodes[i].mesh === meshIdx || gltf.nodes[i].name.endsWith('_lod' + lodLevel)) {
                nodeIdx = i;
                meshIdx = gltf.nodes[i].mesh;
                break;
              }
            }

            if (meshIdx < 0 || nodeIdx < 0) {
              channel.log(file + ' does not include nodes/meshes ending with \'_lod' + lodLevel + '\'');
              continue;
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
          }

          const gltfOptions = {
            resourceDirectory: path.join(sourceFolder, dirname),
            // separateTextures: true /* no need to store textures again, but rdm4-bin needs it */
          };
          gltfToGlb(gltf, gltfOptions).then(function (results: any) {
            fs.writeFileSync(path.join(options.cache, lodname + '.glb'), results.glb);
          
            // rdm4-bin does not overwrite, so delete target
            if (fs.existsSync(path.join(outFolder, lodname + '.rdm'))) {
              fs.rmSync(path.join(outFolder, lodname + '.rdm'));
            }
            // const cmd = rdmPath + " -g P4h_N4b_G4b_B4b_T2h -n -o \"" + path.join(outFolder, dirname) + "\" -i \"" + path.join(options.cache, lodname + '.glb') + "\"";
            // console.log(cmd);
            // channel.log(cmd);
            // const res = child.execFileSync(cmd);
            const res = child.execFileSync(rdmPath, [
              '-g',
              'P4h_N4b_G4b_B4b_T2h',
              '-n',
              '-o',
              path.join(outFolder, dirname),
              '-i', 
              path.join(options.cache, lodname + '.glb')        
            ]);
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
}