# Build and Deploy Mods

Requirement: you need to configure your `modsFolder` as described in [Setup](../README.md#setup).

Automatically convert and copy mod files using a json description.

Features:
- automatically convert files like `.png` or `.gltf` to their Anno formats
- copy only wanted files into a separate mod folder (keeps mod output clean)
- create skins of `.cfg` files without duplicating them

Examples: [Sources on GitHub](https://github.com/jakobharder/anno-1800-jakobs-mods/), [Compiled Mods](https://github.com/jakobharder/anno-1800-jakobs-mods/releases)

## How to call

### From Visual Studio Code

Press `F1` or right-click on `modinfo.json` files to build and deploy your mod.

### From Terminal or GitHub actions

You can use the build command also in command line.

Have a look at [Jakob's Collection's GitHub publish pipeline](https://github.com/jakobharder/anno-1800-jakobs-mods/blob/main/.github/workflows/publish.yml) to get some hints how to do it.

## Conversions

The following are the default conversion if you use a normal `modinfo.json` file:

Type | Pattern | Action
---|---|---
Texture | `_diff.png`, `_metal.png`, `_norm.png`, `_height.png`, `_rga.png` | Create DDS textures with 3 LODs.
Icon | `icon*.png` | Copy PNG and create DDS textures LODs as needed.
Feedback | `.cf7` | Convert to `.fc`.
Models | `.gltf` | Extract and convert models with the name `_lod0` etc. to individual `.rdm` files.
Skin | `.cfg.yaml` | Generate `.cfg`, `.ifo`, `.fc`.
Other | `.cfg`, `.ifo`, `.prp`, `.fc`, `.rdm`, `.dds`, `.rdp` | Copy.
Config | `data/config/*` | Copy.
Readme | `README.md` | Insert text into `Description.English` in the modinfo.json.
Banner | `banner.png`, `banner.jpg` | Copy.

## Download Sub-Mods

You can automatically bundle sub-mods and shared files using the `bundle` configuration. E.g.:

```json
"bundle": {
  "jakob_shared_base": "https://github.com/anno-mods/shared-resources/releases/download/v2/Shared-Pools-and-Definitions-1.1.zip",
  "jakob_ground_industry": "https://github.com/anno-mods/shared-resources/releases/download/v2/Shared-Ground-Textures-Industry-1.0.zip"
}
```

This will download the file and extract it's content into your mod.

## Custom conversions

### `modinfo.json` Format

```jsonc
{
  "src": ".",
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
  /* ... and the usual modinfo content */
}
```

- `src`

  One or multiple folders to read the input data from.
  Use an array in case of multiple folders.

- `out`

  Folder to write the output mod to.

  Use `${modName}` to get `[Category] Name` created from `modinfo.Category.English` and `modinfo.ModName.English`. Works only with `out`.

  Use `${annoMods}` to get your local Anno `mods/` directory set in the Extension configuration. Works only with `out`.

- `converter`

  Custom converter actions. See below.

- The remainder

  Basically [modinfo.json](https://github.com/anno-mods/Modinfo) content as you know it.

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

