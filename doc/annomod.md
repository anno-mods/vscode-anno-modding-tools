# Build Mods with annomod.json

Automatically convert and copy mod files using a json description.

Features:
- automatically convert files like `.png` or `.gltf` to their Anno formats
- copy only wanted files into a separate mod folder (keeps mod output clean)
- create skins of `.cfg` files without duplicating them

Examples: [Sources on GitHub](https://github.com/jakobharder/anno-1800-jakobs-mods/), [Compiled Mods](https://github.com/jakobharder/anno-1800-jakobs-mods/releases)

## How to call

### From Visual Studio Code

Press `F1` or right-click on `annomod.json` files to run `Build Anno Mod`.

### From Terminal or GitHub actions

You can use the build command also in command line.

Have a look at [Jakob's Collection's GitHub publish pipeline](https://github.com/jakobharder/anno-1800-jakobs-mods/blob/main/.github/workflows/publish.yml) to get some hints how to do it.

## How to create annomod.json

### `annomod.json` Format

```json
{
  "src": "src",
  "out": "${annoMods}/${modName}",  
  "converter": [
    {
      "action": "static",
      "pattern": "**/*.{cfg,ifo,prp,fc,rdm,dds}"
    },
    {
      "action": "cf7",
      "pattern": "**/*.cf7"
    },
    {
      "action": "texture",
      "pattern": "**/*_{diff,norm,height,metal}.png",
      "lods": 1
    },
    {
      "action": "gltf",
      "pattern": "**/*.gltf"
    },
    {
      "action": "modinfo",
      "content_en": true
    }
  ],
  "modinfo": {}
} 
```

### Converter Actions

- `static`: copies files according to [glob](https://github.com/isaacs/node-glob) `pattern`.
- `texture`: converts .pngs into .dds.
  - `lods`: number of LOD levels to generate, saved as `_0.dds` and so on. Set to 0 to disable LODs. Default is 3.
  - `changePath`: move texture to another folder, e.g. `maps`. Default is no change.
- `cf7`: converts .cf7 into .fc (using [AnnoFCConverter](https://github.com/taubenangriff/AnnoFCConverter/))
- `gltf`: converts .gltf to .rdm. (using [rdm4](https://github.com/lukts30/rdm4))
  - `lods`: number of LOD levels to pull out of .gltf files. Meshes must end with `_lod0` and so on to be considered. Set to 0 to disable LODs. Default is 4.
  - `changePath`: move model to another folder, e.g. `rdm`. Default is no change.
  - `animPath`: move anim to another folder, e.g. `anim`. Default is no change.
- `modinfo`: generate `modinfo.json`.
  - `content_en`: generate `content_en.txt` file with same content as `modinfo.Description.English`.
- `rdpxml`: convert .rdp.xml into .rdp. [More on a separate page](https://github.com/anno-mods/modding-guide/blob/main/guides/particles.md)
- `cfgyaml`: generate CFG, IFO and FC files. [More in a separate page](../README.md#create-variants-from-templates).

Out folder variables:

- Use `${modName}` to get `[Category] Name` created from `modinfo.Category.English` and `modinfo.ModName.English`. Works only with `out`.
- Use `${annoMods}` to get your local Anno `mods/` directory set in the Extension configuration. Works only with `out`.

Modinfo:

- Basically Anno Mod Manager [modinfo.json](https://github.com/anno-mods/Modinfo) content.
- `modinfo.Description` differs from what the Anno Mod Manager uses. Instead of text use a relative path to a Markdown file. Images will be excluded from the Markdown.
