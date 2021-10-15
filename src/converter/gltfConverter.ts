import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as gltfPipeline from 'gltf-pipeline';
import * as child from 'child_process';
import * as url from 'url';

import * as channel from '../other/outputChannel';

interface IAnimation {
  name: string,
  bonesIdx: number,
  animIdx: number,
  children: { idx: number, name: string }[]
}

export class GltfConverter {
  public getName() {
    return 'gltf';
  }

  public async run(files: string[], sourceFolder: string, outFolder: string, options: { 
    context: vscode.ExtensionContext, 
    cache: string, 
    converterOptions: any }) {

    const fakePngPath = options.context.asAbsolutePath("./images/fake.png");
    const fakePngUrl = new url.URL(`file:///${fakePngPath}`);
    const rdmPath = options.context.asAbsolutePath("./external/rdm4-bin.exe");
    
    for (const file of files) {
      channel.log(`=> ${file}`);
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
          const gltf = JSON.parse(fs.readFileSync(path.join(sourceFolder, file), 'utf8'));

          // replace images to avoid errors with missing ones (we don't need them anyways)
          this._replaceImages(gltf, fakePngUrl.href);

          // remove all nodes/meshes but this lod
          let meshIdx = 0;
          if (gltf.meshes.length > 1) {
            meshIdx = this._findNodeOrMesh(gltf, (e) => !e.name.endsWith('_lod' + lodLevel));
            if (meshIdx < 0) {
              if (lodLevel === 0) {
                // multiple meshes, no _lod0. Use rdm4 default behavior for this case (first mesh).
                meshIdx = 0;
              }
              else {
                // skip converting
                channel.log(`     LOD ${lodLevel}: Skipped. No node/mesh ending with '_lod${lodLevel}'`);
                continue;
              }
            }
          }

          // all lods share the same animation
          const anims = this._findAnimations(gltf);
          const useSkeleton = /*gltf.animations.length > 0; */ anims.length > 0;
          const useAnimation = lodLevel === 0 && useSkeleton;

          const resourceDirectory = path.join(sourceFolder, dirname);

          let alreadyExportedModel;
          if (useAnimation) {
            for (let anim of anims) {
              const tempAnimFile = path.join(options.cache, dirname, `${basename}_${anim.name}_anim.rdm`);
              const tempRdmFile = path.join(options.cache, dirname, `${basename}_${anim.name}.rdm`);
              const tempGlbFile = path.join(options.cache, dirname, `${basename}_${anim.name}.glb`);
              const targetFile = path.join(outFolder, dirname, `${anim.name}.rdm`);

              // we need a separate copy of gltf because the gltf-pipeline is modifying it
              // reading is easier than to do a deep copy
              const gltfForAnim = JSON.parse(fs.readFileSync(path.join(sourceFolder, file), 'utf8'));
              this._replaceImages(gltfForAnim, fakePngUrl.href);

              this._makeUniqueBoneNames(gltfForAnim, anims, anim.name);
              await this._writeRdmFile(gltfForAnim, tempAnimFile, tempGlbFile, resourceDirectory, rdmPath, meshIdx, useAnimation, useSkeleton);
              // move only anim rdm to target location
              fs.rmSync(tempGlbFile);
              fs.rmSync(targetFile, { force: true });
              fs.renameSync(tempAnimFile, targetFile);
              channel.log(`  <= animation: ${path.join(dirname, anim.name)}.rdm`);
              // keep lod0 model for later
              if (alreadyExportedModel) {
                fs.rmSync(tempRdmFile);
              }
              else {
                alreadyExportedModel = tempRdmFile;
              }
            }
          }

          // convert
          const lodname = path.join(dirname, basename + '_lod' + lodLevel);
          const targetFile = path.join(outFolder, lodname + '.rdm');
          if (!alreadyExportedModel) {
            // Animations are matched against the vertex groups by name.
            // Names are duplicated in case of multiple animations.
            // Clear them all out, otherwise rdm4 will complain about them.
            this._makeUniqueBoneNames(gltf, anims);

            const tempGlbFile = path.join(options.cache, lodname + '.glb');
            await this._writeRdmFile(gltf, targetFile, tempGlbFile, resourceDirectory, rdmPath, meshIdx, useAnimation, useSkeleton);
            fs.rmSync(tempGlbFile);
          }
          else {
            fs.renameSync(alreadyExportedModel, targetFile);
          }
          channel.log(`  <= LOD ${lodLevel}: ${lodname}.rdm`);
        }
      }
      catch (exception: any)
      {
        channel.error(exception.message);
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

  private _findNodeOrMesh(gltf: any, match: (mesh: { name: string }) =>  boolean ) {
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
      return -1;
    }

    return meshIdx;
  }

  private _findAnimations(gltf: any) {
    const animations: IAnimation[] = [];

    if (!gltf.animations) {
      return animations;
    }

    const allParentNodes = gltf.nodes.map((node: any, idx: number) => ({ index: idx, ...node })).filter((e: any) => e.children !== undefined);
    for (let i = 0; i < gltf.animations.length; i++) {
      let anim = gltf.animations[i];
      // check only first target node, it's unlikely that the others are not there (at least for now)
      if (!anim.channels || anim.channels[0].target?.node === undefined) {
        channel.warn(`Animation channel targets are missing.`);
        continue;
      }
      const animParent = allParentNodes.find((e: any) => -1 !== e.children.indexOf(anim.channels[0].target.node) );
      if (!animParent) {
        channel.warn(`Matching nodes to animation channel targets are missing.`);
        channel.warn(`Node ${anim.channels[0].target.node} not found or not part of a bones group.`);
        continue;
      }

      const children = [];
      for (let child of animParent.children) {
        children.push({
          idx: child,
          name: gltf.nodes[child].name.slice()
        });
      }

      animations.push({
        name: animParent.name || animParent.idx.toString(),
        bonesIdx: animParent.idx,
        animIdx: i,
        children 
      });
    }

    return animations;
  }

  private _makeUniqueBoneNames(gltf: any, anims: IAnimation[], keepSame?: string) {
    if (!keepSame && anims.length > 0) {
      // It's important for other LODs to have at least one set of same bone names, so always keep first unchanged.
      keepSame = anims[0].name;
    }

    for (let anim of anims) {
      for (let child of anim.children) {
        gltf.nodes[child.idx].name = (keepSame && anim.name === keepSame) ? child.name.slice() : (anim.name + '_' + child.name);
      }
    }

    // limit animations to 1
    if (anims.length > 1) {
      gltf.animations = [ gltf.animations[anims[0].animIdx] ];
    }
  }

  private _writeRdmFile(gltf: any, targetFile: string, tempFile: string, resourceDirectory: string, rdmPath: string, meshIdx: number, useAnimation: boolean, useSkeleton: boolean) {
    return new Promise((resolve, reject) => {
      const gltfOptions = {
        resourceDirectory,
      };
      gltfPipeline.gltfToGlb(gltf, gltfOptions).then(function (results: any) {
        fs.writeFileSync(tempFile, results.glb);

        const res = child.execFileSync(rdmPath, [
          '--gltf-mesh-index', meshIdx.toString(),
          '-g', useSkeleton ? 'P4h_N4b_G4b_B4b_T2h_I4b' : 'P4h_N4b_G4b_B4b_T2h',
          '-n', '-o', path.dirname(targetFile),
          '-i', tempFile,
          ...(useSkeleton ? [ '--skeleton' ] : []),
          ...(useAnimation ? [ '--animation'] : []),
          '--force' // overwrite existing files
        ]);
        resolve(true);
      }).catch((err: any) => {
        reject(err);
      });
    });
  }
}