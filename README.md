# Modding Tools for Anno

Some tools to make your modding life easier.

This project is not affiliated in any way with Ubisoft.

Anno 1800 is a trademark of Ubisoft Entertainment in the US and/or other countries. Anno is a trademark of Ubisoft GmbH in the US and/or other countries.

## Features

- Command `F1` > `Build Anno Mod`: automatically build project using `annomod.json` description.
  - PNG to DDS conversion with LOD generation
  - Animated glTF to RDM conversion with LODs (see [working with animation](https://github.com/anno-mods/vscode-anno-modding-tools/blob/main/doc/working-with-models.md))
  - Particle RDP XML to RDP conversion (see [working with particles](https://github.com/anno-mods/vscode-anno-modding-tools/blob/main/doc/working-with-particles.md))
  - Generate variants of IFO, CFG and FC using templates
- Hover info and auto-conversion for Anno GUIDs.
- Anno-specific outlines, highlights and auto-complete: `.cfg`, `.ifo`, `.cf7`
- Right-click `Import from glTF` (targets: `.cfg`, `.ifo`, `.cf7`)
- Right-click `Convert to` menus
  - AnnoFCConverter `.cf7` to/from `.fc`
  - rdm4 `.rdm` to glTF Binary
  - FileDBReader `.rdp` to/from `.rdp.xml` CDATA as is and simplified
  - texconv `.dds` to `.png`

Read all the [Feature Details](#feature-details) below.

### GUID Hover and Auto-conversion Preview

![](./doc/guid-utils.gif)

### Outline and glTF PROP Import Preview

![](./doc/quickintro.gif)

## Extension Settings

* `anno.modsFolder`: path to your `mods/` folder. Available as `${annoMods}` in `annomod.json`. Not required if you don't use the variable.
* `anno.outlineFolderDepth`: folder depth of props, materials and alike shown .cfg outline.

## Best Practices

### Use Git repository for imported files

- It's easier to see which lines have changed when you use `Import from glTF`, and you don't need to fear you loose work.
- Btw, as long as the file is open in editor Undo should also work.

### Use VS Code to browse through RDA data

- Browse and use right-click `Convert to ..` to convert all your .rdm and .dds assets.
- Use right-click `Copy Relative Path` to easily copy asset pathes like `data/graphics/.../gas_bottle_01.prp` for `.cfg`s.
- Preparation: Extract all data with the [RDAExplorer](https://github.com/lysannschlegel/RDAExplorer) in proper order into one folder. Open that folder with VS Code.

### Use Blender copy&paste source

- Have a Blender file with all your favorite `prop_` objects with `.prp` path set.

## Requirements

Some features like .fc conversion rely on external applications that run only on Windows.
Native functions like outlines, highlighting work with Linux/WSL as well though.

## Credits

A big thanks goes to the external projects I'm using for this extension:

- AnnoFCConverter - https://github.com/taubenangriff/AnnoFCConverter/
- rdm4 - https://github.com/lukts30/rdm4
- FileDBReader - https://github.com/anno-mods/FileDBReader
- texconv - https://github.com/microsoft/DirectXTex
- gltf-pipeline - https://github.com/CesiumGS/gltf-pipeline

## Release Notes / Known Issues

### 0.3.0

Particle animations and stuff!

See changes and known issues in [CHANGELOG](./CHANGELOG.md)

## Feature Details

* [Import from glTF](#import-from-gltf)
* [Create variants from templates](#create-variants-from-templates)
* [GUID hover and auto-correct](#guid-hover-and-auto-correct)
* [Build Anno mod](#build-anno-mod)
* [Working with models](https://github.com/anno-mods/vscode-anno-modding-tools/blob/main/doc/working-with-models.md) (separate pag)
* [Working with particles](https://github.com/anno-mods/vscode-anno-modding-tools/blob/main/doc/working-with-particles.md) (separate page)

### Import from glTF

Put objects and name them as described in your glTF file to import.
Examples: [Sources on GitHub](https://github.com/jakobharder/anno-1800-jakobs-mods/)

CFG file imports:

- `PROP`s with prefix `prop_`
  - Position, Rotation, Scale
  - mesh name as `FileName` if it ends with `.prp`.
    Don't worry about Blender-style `.001`, `.002`, ... endings. They will be ignored.
  - Will be added if they don't exist.
- `PARTICLE`s with prefix `particle_`
  - Position, Rotation, Scale
- `FILE`s with prefix `file_`
  - Position, Rotation, Scale
  - mesh name as `FileName` if it ends with `.cfg`.
  - Will be added if they don't exist.
- `DECAL` with name `ground`
  - Extents is calculated from the first 4 vertices of that object (use a plane).

Entries not existing in the model will be marked as `_removed`.

CF7 file imports:

- `Dummies/i` with prefix `fc_`
  - Position, Orientation, RotationY
  - ⚠ Note: Matches will happen without the prefix.
    E.g. `fc_Dummy0` from the model will be matched with `Dummy0` in the CF7 file.
    This is to avoid the need to rename items in the CF7 file.

IFO file imports:

- BuildBlocker with name `ground`
  - Extents is calculated from the first 4 vertices of that object (use a plane).
    Rounded to .5

### Create Variants from Templates

Write a yaml file like below and name it `.cfg.yaml`.
IFO, FC/CF7 and CFG files will be generated accordingly.
Files are copied if they have the same name as the source.
Modifications are currently only supported in IFO and CFG files.

If you have `townhall.cfg`, `townhall.cf7` and `townhall.ifo`, then a `townhall_1.cfg.yaml` leads to generated `townhall_1.cfg`, `townhall_1.fc` and `townhall_1.ifo`. 

Examples: TBD

```yaml
variant: 
  source: townhall.cfg
  modifications:
    - xpath: //Config/Models/Config/Materials/Config[Name="building"]
      cModelDiffTex: data/jakob/buildings/townhall/maps/townhall_bluish_diff.psd
    - xpath: //Config/Models/Config/Materials/Config[Name="roof"]
      cModelDiffTex: data/jakob/buildings/townhall/maps/townhall_bluish_diff.psd
    - xpath: //Config/Models/Config[Name="top"]
      FileName: data/jakob/buildings/townhall/rdm/townhall_2_lod0.rdm
    # disable smoke
    - xpath-remove: //Config/Particles/Config[Name="particle_smoke1"]
    # move flag 1
    - xpath: //Config/Files/Config[Name="file_flag1"]/Transformer/Config
      Position.y: 6.97816
  ifo:
    # adjust hitbox to new height
    - xpath: //Info/IntersectBox[Name="Hitbox2"]
      Position:
        yf: 4.34346
```

### GUID Hover and Auto-conversion

Hover works on GUIDs in XPath strings and in the tags `Ingredient`, `Product`, `ItemLink`, `Good` or `GUID`. Hover is mostly limited to products, buildings, production chains, items and effect pools.

Auto-conversion works when in the same tags as above in editing mode.
Conversion is limited to products (including residents) and items at the moment.

Including all GUIDs is too much for many reasons. New GUID types will be added if there's a need (meaning: ping me with a request).

### Build Anno Mod

Press `F1` or right-click on `annomod.json` files to run `Build Anno Mod`.

Example: [Sources on GitHub](https://github.com/jakobharder/anno-1800-jakobs-mods/), [Result as zip download](https://github.com/jakobharder/anno-1800-jakobs-mods/releases)

#### `annomod.json` Format

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
      "pattern": "**/*.{glb,gltf}"
    },
    {
      "action": "modinfo",
      "content_en": true
    }
  ],
  "modinfo": {}
} 
```

Converter actions:

- `static`: copies files according to glob `pattern`.
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
- `rdpxml`: convert .rdp.xml into .rdp. [More on a separate page](https://github.com/anno-mods/vscode-anno-modding-tools/blob/main/doc/working-with-particles.md)
- `cfgyaml`: generate CFG, IFO and FC files. [More in a separate chapter](#create-variants-from-templates).

Out folder variables:

- Use `${modName}` to get `[Category] Name` created from `modinfo.Category.English` and `modinfo.ModName.English`. Works only with `out`.
- Use `${annoMods}` to get your local Anno `mods/` directory set in the Extension configuration. Works only with `out`.

Modinfo:

- Basically Anno Mod Manager [modinfo.json](https://github.com/anno-mods/Modinfo) content.
- `modinfo.Description` differs from what the Anno Mod Manager uses. Instead of text use a relative path to a Markdown file. Images will be excluded from the Markdown.
