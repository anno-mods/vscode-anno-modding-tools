import * as path from 'path';
import * as xmldoc from 'xmldoc';
import * as fs from 'fs';
import { exit } from 'process';

if (process.argv.length < 3) {
  console.error('provide filepath to assets.xml');
  exit(-1);
}

const assetPath = process.argv[2];
if (!fs.existsSync(assetPath)) {
  console.error('input file does not exist');
  console.error(assetPath);
  exit(-1);
}

function set(xml: xmldoc.XmlElement, path: string, value: string) {
  const t = xml.descendantWithPath(path)?.children[0];
  if (t?.type === 'text') {
    t.text = value;
  }
}


function xmlToPng() {
  console.log(`read ${assetPath}`);
  const xml = new xmldoc.XmlDocument(fs.readFileSync(assetPath, { encoding: 'utf8' }));

  // set(xml, 'StartPos.x', "-5");
  // set(xml, 'StartPos.y', "-5");
  // set(xml, 'Heightmap.Width', "81");
  // set(xml, 'Heightmap.Height', "81");

  // 7 * 16 + 1 = 113
  const width = parseInt(xml.valueWithPath('Heightmap.Width') ?? '1');
  const height = parseInt(xml.valueWithPath('Heightmap.Height') ?? '1');
  const items = xml.descendantWithPath('Heightmap.Map')?.childrenNamed('i')!;
  const minHeight = -5;
  const maxHeight = parseFloat(xml.valueWithPath('MaxHeight') ?? '1');
  const valueRange = maxHeight - minHeight;

  console.log(width * height + 15);

  const Jimp = require('jimp');
  let image = new Jimp(width, height, function (err: any, image: any) {
    if (err) throw err;

    for (var _y = 0; _y < height; _y++) {
      for (var _x = 0; _x < width; _x++) {
        const x = (_x) % width;
        const y = (_y) % height;
        var val = parseFloat((items[y * width + x] as xmldoc.XmlElement).val);
        if (val > maxHeight || val < minHeight) {
          console.log(val);
        }
        val -= minHeight;
        // val = Math.max(0, Math.min(valueRange, val));
        const intval = Math.round(val * 255 / valueRange);
        var color = (intval * 0x100) | 0xff;
        image.setPixelColor(color, _x, _y);
      }
    }
    // image.setPixelColor(0xffffffff, 0, 0);
    if (!fs.existsSync('./out/')) {
      fs.mkdirSync('./out/', { recursive: true });
    }
    image.write('./out/test.png', (err: any) => {
      if (err) throw err;
    });
  });

  
}

function pngToXml() {
  console.log(`read ${assetPath}`);
  const xml = new xmldoc.XmlDocument(fs.readFileSync(assetPath, { encoding: 'utf8' }));
  const width = parseInt(xml.valueWithPath('Heightmap.Width') ?? '1');
  const height = parseInt(xml.valueWithPath('Heightmap.Height') ?? '1');
  const items = xml.descendantWithPath('Heightmap.Map')?.childrenNamed('i')!;
  const minHeight = -5;
  const maxHeight = parseFloat(xml.valueWithPath('MaxHeight') ?? '1');
  const valueRange = maxHeight - minHeight;

  console.log(width * height + 15);

  const Jimp = require('jimp');
  Jimp.read("./out/height.png", function (err: any, image: any) {
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        const item = items[y * width + x] as xmldoc.XmlElement;
        var color = (image.getPixelColor(x, y) >> 8) % 0x100;
        color = Math.round(10000 * (color * valueRange / 255 + minHeight)) / 10000;
        color = Math.max(minHeight, Math.min(maxHeight, color));
        (item.children[0] as xmldoc.XmlTextNode).text = `${color}`;
      }
    }

    xml.descendantWithPath('Heightmap.Map')!.children = items.slice(0, width * height);

    if (!fs.existsSync('./out/')) {
      fs.mkdirSync('./out/', { recursive: true });
    }

    fs.writeFileSync('./out/height.xml', xml.toString({ compressed: true, preserveWhitespace: true, html: true }));
  });
}

// xmlToPng();
pngToXml();
