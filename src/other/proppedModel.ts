import * as fs from 'fs';
import * as gltfPipeline from 'gltf-pipeline';
import * as path from 'path';
import * as vscode from 'vscode';
import * as url from 'url';
import { getBuffer } from 'gltf-import-export';

interface IProp {
  /* eslint-disable @typescript-eslint/naming-convention */
  // keep naming same as Anno
  Name: string,
  FileName: string,
  Position: [number, number, number],
  Rotation: [number, number, number, number],
  Scale: [number, number, number]
  /* eslint-enable @typescript-eslint/naming-convention */
}
export const PROP_DEFAULTS = {
  /* eslint-disable @typescript-eslint/naming-convention */
  ConfigType: 'PROP',
  Name: '',
  Position: [0, 0, 0],
  Rotation: [0, 0, 0, 1],
  Scale: [1, 1, 1],
  Flags: 1
  /* eslint-enable @typescript-eslint/naming-convention */
};
interface IParticle {
  /* eslint-disable @typescript-eslint/naming-convention */
  Transformer: {
    Config: {
      Position: [number, number, number],
      Rotation: [number, number, number, number],
      Scale: number
    }
  },
  Name: string
  /* eslint-enable @typescript-eslint/naming-convention */
}
export const PROPCONTAINER_DEFAULTS = {
  /* eslint-disable @typescript-eslint/naming-convention */
  ConfigType: 'PROPCONTAINER',
  Name: '',
  VariationEnabled: 0,
  VariationProbability: 100
  /* eslint-enable @typescript-eslint/naming-convention */
};
interface IFeedback {
  /* eslint-disable @typescript-eslint/naming-convention */
  Position: { x: number, y: number, z: number },
  Orientation: { x: number, y: number, z: number, w: number },
  RotationY: string,
  Name: string
  /* eslint-enable @typescript-eslint/naming-convention */
}

type IPropMap = { [index: string]: IProp };
type IParticleMap = { [index: string]: IParticle };
type IFeedbackMap = { [index: string]: IFeedback };

function dataUriToBuffer(dataUri: any) {
  const data = dataUri.slice(dataUri.indexOf(",") + 1);
  if (dataUri.indexOf("base64") >= 0) {
    return Buffer.from(data, "base64");
  }
  return Buffer.from(data, "utf8");
}

function roundVertices(vertices: number[], digitsAfter?: number) {
  const digits = Math.pow(10, (digitsAfter || 0));
  for (let i = 0; i < vertices.length; i++) {
    vertices[i] = Math.round(vertices[i] * digits) / digits;
  }
  return vertices;
}

function buildArrayBuffer<T extends ArrayLike<number>>(typedArray: any, data: ArrayBufferView, byteOffset: number, count: number, numComponents: number, byteStride?: number): T {
  byteOffset += data.byteOffset;

  const targetLength = count * numComponents;

  if (byteStride === undefined || byteStride === numComponents * typedArray.BYTES_PER_ELEMENT) {
      return new typedArray(data.buffer, byteOffset, targetLength);
  }

  const elementStride = byteStride / typedArray.BYTES_PER_ELEMENT;
  const sourceBuffer = new typedArray(data.buffer, byteOffset, elementStride * count);
  const targetBuffer = new typedArray(targetLength);
  let sourceIndex = 0;
  let targetIndex = 0;

  while (targetIndex < targetLength) {
      for (let componentIndex = 0; componentIndex < numComponents; componentIndex++) {
          targetBuffer[targetIndex] = sourceBuffer[sourceIndex + componentIndex];
          targetIndex++;
      }

      sourceIndex += elementStride;
  }

  return targetBuffer;
}

export default class ProppedModel {
  private readonly props: IPropMap;
  private readonly particles: IParticleMap;
  private readonly feedbacks: IFeedbackMap;
  private readonly gltf: any;
  private readonly resourceFolder: string;

  private groundVertices: { xf: number, zf: number }[] | undefined;

  public static fromFile(filePath: string) {
    const gltf = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const props: IPropMap = { };
    const particles: IParticleMap = { };
    const feedbacks: IFeedbackMap = { };
    for (let node of gltf.nodes) {
      if (node.name.startsWith('prop_')) {
        const meshName = gltf.meshes[node.mesh].name.replace(/\.\d\d\d$/, '');

        props[node.name] = {
          /* eslint-disable @typescript-eslint/naming-convention */
          Name: node.name,
          FileName: meshName.endsWith('.prp') ? meshName : undefined, // don't overwrite FileName if it doesn't fit
          Position: node.translation,
          Rotation: node.rotation || [0, 0, 0, 1],
          Scale: node.scale || [1, 1, 1],
          /* eslint-enable @typescript-eslint/naming-convention */
        };
      }
      if (node.name.startsWith('particle_')) {
        particles[node.name] = {
          /* eslint-disable @typescript-eslint/naming-convention */
          Transformer: {
            Config: {
              Position: node.translation,
              Rotation: node.rotation || [0, 0, 0, 1],
              Scale: node.scale?.z
            }
          },
          Name: node.name
          /* eslint-enable @typescript-eslint/naming-convention */
        };
      }
      if (node.name.startsWith('fc_')) {
        const rotation = node.rotation || [0, 0, 0, 1];
        const quart = {
          x: rotation[0].toFixed(6), 
          y: rotation[1].toFixed(6), 
          z: rotation[2].toFixed(6),
          w: rotation[3].toFixed(6)
        };
        feedbacks[node.name] = {
          /* eslint-disable @typescript-eslint/naming-convention */
          Position: {
            x: node.translation[0].toFixed(6),
            y: node.translation[1].toFixed(6),
            z: node.translation[2].toFixed(6),
          },
          Orientation: quart,
          RotationY: _toRotation(quart).toFixed(6),
          Name: node.name
          /* eslint-enable @typescript-eslint/naming-convention */
        };
      }
    }

    const resourceFolder = path.dirname(filePath);
    return new ProppedModel(gltf, props, particles, feedbacks, resourceFolder);
  }

  public getProps(): IProp[] {
    return Object.values(this.props);
  }

  public getProp(name: string): IProp {
    return this.props[name];
  }

  public getParticles(): IParticle[] {
    return Object.values(this.particles);
  }

  public getParticle(name: string): IParticle {
    return this.particles[name];
  }

  public getFeedbacks(): IFeedback[] {
    return Object.values(this.feedbacks);
  }

  public getFeedback(name: string): IFeedback {
    return this.feedbacks[name];
  }

  public getBuildBlocker() {
    const ground = this._findGround();
    if (!ground) {
      return;
    }

    const result = [];
    for (let vertex of ground) {
      // round to .5
      result.push({
        xf: Math.round(vertex.xf * 2) / 2,
        zf: Math.round(vertex.zf * 2) / 2
      });
    }

    return result;
  }

  public getDecalExtends() {
    const ground = this._findGround();
    if (!ground) {
      return;
    }

    const result = [];

    let minX = Math.round(ground[0].xf * 100) / 100;
    let minZ = Math.round(ground[0].zf * 100) / 100;
    let maxX = minX;
    let maxZ = minZ;

    for (let vertex of ground) {   
      // round to .5
      const xf = Math.round(vertex.xf * 100) / 100;
      const zf = Math.round(vertex.zf * 100) / 100;
      minX = Math.min(minX, xf);
      minZ = Math.min(minZ, zf);
      maxX = Math.max(maxX, xf);
      maxZ = Math.max(maxZ, zf);
    }

    // TODO if not centered set Transformer, but that's unusual

    return {
      /* eslint-disable-next-line @typescript-eslint/naming-convention */
      Extents: [ (maxX - minX) / 2, 0.25, (maxZ - minZ) / 2]
    };
  }

  private constructor(gltf: any, props: IPropMap, particles: IParticleMap, feedbacks: IFeedbackMap, resourceFolder: string) {
    this.gltf = gltf;
    this.props = props;
    this.particles = particles;
    this.feedbacks = feedbacks;
    this.resourceFolder = resourceFolder;
  }

  private _getBuffer(gltf: any, meshIdx: number, resourceFolder: string) {
    const accessorIdx = gltf.meshes[meshIdx].primitives[0].attributes.POSITION;
    const accessor = gltf.accessors[accessorIdx];
    const bufferView = gltf.bufferViews[accessor.bufferView];
    const bufferInfo = gltf.buffers[bufferView.buffer];

    const bufferFile = path.join(resourceFolder, bufferInfo.uri);
    const buffer = getBuffer(gltf, bufferView.buffer, bufferFile);
    if (buffer) {
      const bufferOffset = bufferView.byteOffset || 0;
      const bufferLength = bufferView.byteLength;
      const bufferStride = bufferView.byteStride;
      const bufferViewBuf = buffer.subarray(bufferOffset, bufferOffset + bufferLength);
      const accessorByteOffset = accessor.byteOffset || 0;

      const ACESSOR_TYPE_VEC3 = 3;
      return buildArrayBuffer(Float32Array, bufferViewBuf, accessorByteOffset, accessor.count, ACESSOR_TYPE_VEC3, bufferStride);
    }

    return undefined;
  }

  private _findGround() {
    if (!this.groundVertices) {
      let groundMeshIdx = -1;
      for (let node of this.gltf.nodes) {
        if (node.name === 'ground' || this.gltf.meshes[node.mesh]?.name === 'ground') {
          groundMeshIdx = node.mesh;
        }
      }

      if (groundMeshIdx < 0) {
        console.warn('Invalid glTF. Invalid mesh index.');
        return undefined;
      }

      const buffer = this._getBuffer(this.gltf, groundMeshIdx, this.resourceFolder);
      if (!buffer) {
        console.warn('Invalid glTF. Could not get buffer.');
        return undefined;
      }

      this.groundVertices = [];
      for (let i = 0; i < 4 && i < buffer.length / 3; i++) {
        // round to .5
        this.groundVertices[i] = {
          xf: buffer[i * 3],
          zf: buffer[i * 3 + 2]
        };
      }
    }

    return this.groundVertices;
  }
}

function _toRotation(q: { w: number, x: number, y: number, z: number }) {
  const acos = 2 * Math.acos(q.w);
  return q.y > 0 ? Math.PI * 2 - acos : acos;
}