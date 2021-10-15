import * as fs from 'fs';
import * as path from 'path';
import * as child from 'child_process';

let _converterPath: string | undefined;
export function init(externalPath: string) {
  _converterPath = path.join(externalPath, 'texconv.exe');
}

export function convertToTexture(sourceFile: string, targetFolder: string) {
  if (!_converterPath) {
    return false;
  }
  try {
    const res = child.execFileSync(_converterPath, [
      sourceFile, 
      '-y', '-f', 'BC7_UNORM', '-srgbo', '-srgbi',
      '-o', targetFolder
    ]);
  }
  catch (exception) {
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
  catch (exception) {
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

  public static fromFile(filePath: string) {
    const buffer = fs.readFileSync(filePath);
    let position = 0;
    console.log(`total size: ${buffer.byteLength}`);

    const SIZE_OF_DDS_HEADER = 124;
    if (/* dwMagic "DDS " */ 0x20534444 !== _fourCCToInt32(buffer, position++) ||
        /* dwSize */ SIZE_OF_DDS_HEADER !== _fourCCToInt32(buffer, position++)) {
      console.error(`Invalid DDS format ${filePath}`);
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
      console.error(`No mipmaps to extract LODs`);
      return undefined;
    }
    /* unused */ position += 11;
    /* DDS_PIXELFORMAT dwSize */ position++;
    /* DDS_PIXELFORMAT dwFlags */ position++;
    if (/* DDS_PIXELFORMAT dwFourCC "DX10" */ 0x30315844 !== _fourCCToInt32(buffer, position++)) {
      console.error(`Not supported DDS format ${filePath}`);
      return undefined;
    }

    const DWORD_SIZE = 4;
    const SIZE_OF_MAGIC = DWORD_SIZE;
    const SIZE_OF_DDS_HEADER_DXT10 = 6 * DWORD_SIZE;
    let imagePosition = (SIZE_OF_DDS_HEADER + SIZE_OF_DDS_HEADER_DXT10);

    const images: Buffer[] = [];
    let levelPosition = imagePosition;
    for (let level = 0; level < dwMipMapCount; level++) {
      const levelSize = _bc7Size(dwWidth >> level, dwHeight >> level);
      if (levelPosition + levelSize > buffer.length) {
        console.error(`Something is off. ${levelSize + levelPosition - buffer.length} bytes of image data are missing.`);
      }
      images.push(buffer.subarray(levelPosition, levelPosition + levelSize));
      levelPosition += levelSize;
    }

    if (levelPosition < buffer.length) {
      console.error(`Something is off. ${buffer.length - levelPosition} bytes of image data are left untouched.`);
    }

    return new Texture(
      buffer.subarray(0, imagePosition), 
      images,
      dwWidth, dwHeight, dwMipMapCount);
  }

  public getModifiedHeader(width: number, height: number, mipmaps: number) {
    const pitch = _bc7Pitch(width);
    const modifiedHeader = Buffer.concat([ 
      this.header.subarray(0, 4 * 3),
      Buffer.from(_int32ToFourCC(height)),
      Buffer.from(_int32ToFourCC(width)),
      Buffer.from(_int32ToFourCC(pitch)),
      Buffer.from(_int32ToFourCC(1)),
      Buffer.from(_int32ToFourCC(mipmaps)),
      this.header.subarray(4 * 8)
    ]);
    console.log(`${width} ${height} ${mipmaps} ${pitch}`);

    return modifiedHeader;
  }

  private constructor(header: Buffer, images: Buffer[], width: number, height: number, mipmaps: number) {
    this.header = header;
    this.images = images;
    this.width = width;
    this.height = height;
    this.mipmaps = mipmaps;
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

function _bc7Pitch(width: number) {
  return Math.max(1, Math.floor((width + 3) / 4) ) * 16;
}

function _bc7Size(width: number, height: number) {
  return _bc7Pitch(width) * Math.floor((height + 3) / 4);
}