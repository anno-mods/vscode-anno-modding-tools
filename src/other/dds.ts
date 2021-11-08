import * as fs from 'fs';
import * as path from 'path';
import * as child from 'child_process';

import * as channel from './outputChannel';

export enum TextureFormat {
  unknown = 0,
  bc1Unorm = 71,
  bc7Unorm = 98
}

let _converterPath: string | undefined;
export function init(externalPath: string) {
  _converterPath = path.join(externalPath, 'texconv.exe');
}

export function convertToTexture(sourceFile: string, targetFolder: string, format?: TextureFormat) {
  if (!_converterPath) {
    return false;
  }
  try {
    const res = child.execFileSync(_converterPath, [
      sourceFile, 
      '-y', '-f', (format && format === TextureFormat.bc7Unorm)?'BC7_UNORM':'BC1_UNORM', '-srgbo', '-srgbi',
      '-sepalpha',
      '-o', targetFolder
    ]);
  }
  catch (exception: any) {
    channel.error(exception.message);
    return false;
  }
}

export function convertToImage(sourceFile: string, targetFolder: string) {
  if (!_converterPath) {
    return false;
  }
  try {
    const res = child.execFileSync(_converterPath, [
      sourceFile,
      '-y', '-ft', 'png', 
      '-o', targetFolder
    ]);
  }
  catch (exception: any) {
    channel.error(exception.message);
    return false;
  }
}

export class Texture {
  /* https://docs.microsoft.com/en-us/windows/win32/direct3ddds/dx-graphics-dds-pguide */
  public readonly header: Buffer;
  public readonly images: Buffer[];
  public readonly width: number;
  public readonly height: number;
  public readonly mipmaps: number;
  public readonly format: TextureFormat;

  public static fromFile(filePath: string) {
    const buffer = fs.readFileSync(filePath);
    let position = 0;
    console.log(`total size: ${buffer.byteLength}`);

    const SIZE_OF_DDS_HEADER = 124;
    if (/* dwMagic "DDS " */ 0x20534444 !== _fourCCToInt32(buffer, position++) ||
        /* dwSize */ SIZE_OF_DDS_HEADER !== _fourCCToInt32(buffer, position++)) {
      channel.error(`Invalid DDS format ${filePath}`);
      return undefined;
    }

        /* dwFlags */ position++;
    const dwHeight = _fourCCToInt32(buffer, position++);
    const dwWidth = _fourCCToInt32(buffer, position++);
    const dwPitchOrLinearSize = _fourCCToInt32(buffer, position++);
    /* dwDepth */ position++;
    const dwMipMapCount = _fourCCToInt32(buffer, position++);
    console.log(`mipMapCount: ${dwMipMapCount}`);
    if (dwMipMapCount < 1) {
      channel.error(`No mipmaps to extract LODs`);
      return undefined;
    }
    /* unused */ position += 11;
    /* DDS_PIXELFORMAT dwSize */ position++;
    /* DDS_PIXELFORMAT dwFlags */ position++;
    const DX10 = 0x30315844;
    const DXT1 = 0x31545844;
    const dwFourCC = _fourCCToInt32(buffer, position++);
    if (dwFourCC !== DX10 && dwFourCC !== DXT1) {
      channel.error(`DDS dwFourCC is ${dwFourCC}. Must be DXT10 or DXT1: ${filePath}`);
      return undefined;
    }

    const DWORD_SIZE = 4;
    const SIZE_OF_MAGIC = 4;

    let format: TextureFormat = TextureFormat.unknown;
    if (dwFourCC === DX10) {
      // jump to DX10 header
      position = (SIZE_OF_DDS_HEADER + SIZE_OF_MAGIC) / DWORD_SIZE;
      const dxgiFormat = _fourCCToInt32(buffer, position);

      if (dxgiFormat !== TextureFormat.bc7Unorm && dxgiFormat !== TextureFormat.bc1Unorm) {
        channel.error(`DDS dxgiFormat is ${dxgiFormat}. Must be BC7_UNORM or BC1_UNORM: ${filePath}`);
        return undefined;
      }
      format = TextureFormat.bc7Unorm;
    }
    else {
      // assume BC1_UNORM. Should be fine since the extension and not the user creates the orignal DDS.
      format = TextureFormat.bc1Unorm;
    }
    
    // jump to image data
    const SIZE_OF_DDS_HEADER_DXT10 = 5 * DWORD_SIZE;
    let imagePosition = (SIZE_OF_MAGIC + SIZE_OF_DDS_HEADER + (dwFourCC === DX10 ? SIZE_OF_DDS_HEADER_DXT10 : 0));

    const images: Buffer[] = [];
    let levelPosition = imagePosition;
    for (let level = 0; level < dwMipMapCount; level++) {
      const levelSize = _bc17Size(dwWidth >> level, dwHeight >> level, format);
      if (levelPosition + levelSize > buffer.length) {
        channel.error(`Something is off. ${levelSize + levelPosition - buffer.length} bytes of image data are missing.`);
      }
      images.push(buffer.subarray(levelPosition, levelPosition + levelSize));
      levelPosition += levelSize;
    }

    if (levelPosition < buffer.length) {
      channel.error(`Something is off. ${buffer.length - levelPosition} bytes of image data are left untouched.`);
    }

    return new Texture(
      buffer.subarray(0, imagePosition), 
      images,
      dwWidth, dwHeight, dwMipMapCount,
      format);
  }

  public getModifiedHeader(width: number, height: number, mipmaps: number) {
    const pitch = _bc17Pitch(width, this.format);
    const modifiedHeader = Buffer.concat([ 
      this.header.subarray(0, 4 * 3),
      Buffer.from(_int32ToFourCC(height)),
      Buffer.from(_int32ToFourCC(width)),
      Buffer.from(_int32ToFourCC(pitch)),
      Buffer.from(_int32ToFourCC(1)),
      Buffer.from(_int32ToFourCC(mipmaps)),
      this.header.subarray(4 * 8)
    ]);

    return modifiedHeader;
  }

  private constructor(header: Buffer, images: Buffer[], width: number, height: number, mipmaps: number, format: TextureFormat) {
    this.header = header;
    this.images = images;
    this.width = width;
    this.height = height;
    this.mipmaps = mipmaps;
    this.format = format;
  }
}

function _int32ToFourCC(value: number) {
  return new Uint8Array([
    value & 0xff,
    ( value >> 8 ) & 0xff,
    ( value >> 16 ) & 0xff,
    ( value >> 24 ) & 0xff
  ]);
}

function _fourCCToInt32(buffer: Buffer, dwordPosition: number) {
  return buffer[dwordPosition * 4 + 0] + 
    (buffer[dwordPosition * 4 + 1] << 8) + 
    (buffer[dwordPosition * 4 + 2] << 16) + 
    (buffer[dwordPosition * 4 + 3] << 24 );
}

function _bc17Pitch(width: number, format: TextureFormat) {
  const blockSize = (format === TextureFormat.bc1Unorm) ? 8 : 16;
  return Math.max(1, Math.floor((width + 3) / 4) ) * blockSize;
}

function _bc17Size(width: number, height: number, format: TextureFormat) {
  return _bc17Pitch(width, format) * Math.floor((height + 3) / 4);
}