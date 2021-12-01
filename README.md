# Modding Tools for Anno

This project is not affiliated in any way with Ubisoft.

Anno 1800 is a trademark of Ubisoft Entertainment in the US and/or other countries. Anno is a trademark of Ubisoft GmbH in the US and/or other countries.

## Features

- Outlines, coloring, GUID auto-conversion and hover tips: `assets.xml`, `.cfg`, `.ifo`, `.cf7`
- Blender/glTF export to `.cfg`: `PROP`, feedback location, BuildBlocker, hitboxes, ...
- Quickly reskin models without touching `.cfg`, ...
- Batch create DDS (with LODs), RDM (with LODs and animation) using `F1` > `Build Anno Mod` and `annomod.json` description.
- Various right-click utilities to convert between Anno and editable formats (glTF, PNG, ...)

Read all the [Feature Details](#feature-details) below.

---

### GUID Hover and Auto-conversion Preview

![](./doc/guid-utils.gif)

### Outline

![](./doc/images/assets-outline.png)

### Blender/glTF to .cfg Preview

![](./doc/quickintro.gif)

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

### glTF Tools VS Code extension

- There's an extension to preview glTF files.

---

## Feature Details

* [Assets Outline](#assets-outline)
* [Import from Blender or glTF](#import-from-blender-or-gltf)
* [Quickly Reskin Existing Models](#quickly-reskin-existing-models)
* [GUID hover and auto-correct](#guid-hover-and-auto-correct)
* [Build Anno mod](#build-anno-mod)
* [Working with models](https://github.com/anno-mods/vscode-anno-modding-tools/blob/main/doc/working-with-models.md) (separate page)
* [Working with particles](https://github.com/anno-mods/vscode-anno-modding-tools/blob/main/doc/working-with-particles.md) (separate page)

### Assets Outline

The assets.xml outline shows `ModOp`s, `Assets` and where possible names instead of GUIDs.

You have the ability to group by writing `<!-- # your text -->` comments in your code.

![](./doc/images/assets-outline.png)

### Import from Blender or glTF

Steps:

1. Follow naming conventions below
2. Export to glTF
3. Right-click on target `.cfg` and select `Import from glTF`.

Import an glTF file from one of the below examples into Blender to see how a project should look like:

- [New Town Hall](https://github.com/jakobharder/anno-1800-jakobs-mods/tree/main/new-town-hall-buildings) (multiple models in one .cfg)
- [Small Gas Power Plant](https://github.com/jakobharder/anno-1800-jakobs-mods/tree/main/small-gas-power-plant) (with animations)

⚠ Make sure to not edit the mesh of the objects, but the object position, scale and rotation only.

CFG file imports:

- `PROP`s with prefix `prop_` *(e.g. boxes, barrels)*
  - Position, Rotation, Scale
  - mesh name as `FileName` if it ends with `.prp`.
    Don't worry about Blender-style `.001`, `.002`, ... endings. They will be ignored.
  - Will be added if they don't exist.
- `PARTICLE`s with prefix `particle_` *(e.g. smoke)*
  - Position, Rotation, Scale
- `FILE`s with prefix `file_` *(included external cfg files)*
  - Position, Rotation, Scale
  - mesh name as `FileName` if it ends with `.cfg`.
  - Will be added if they don't exist.
- `DECAL` with name `ground` *(ground texture)*
  - Extents is calculated from all vertices of that object (e.g. plane).
    This modifies the ground texture. The building tile size is `<BuildBlocker>` in the IFO file.

Entries not existing in the model will be marked as `_removed` and not removed automatically.

CF7 file imports:

- `<Dummies><i>` with prefix `fc_` *(walking & talking people)*
  - Position, Orientation, RotationY
  - ⚠ Note: Matches will happen without the prefix.
    E.g. `fc_Dummy0` from the model will be matched with `Dummy0` in the CF7 file.
    This is to avoid the need to rename items in the CF7 file.

IFO file imports:

- `<IntersectBox>`: clickable 3D area (aka hitbox) of the building
  - Imported from multiple mesh object (e.g. cube) with prefix `hitbox`
  - Boxes are calculated from the boundaries of the objects.
    1 box per object.
- `<Dummy>`: transporter spawn, fire locations, ...
  - Imported from multiple objects with prefix `dummy_`.
  - Position, rotation and extends are taken from the object.
  - `<Name>` of the entry will be matched against what comes after `dummy_`.
    E.g. `dummy_transporter_spawn` will be matched against `<Name>transporter_spawn</Name>`.
  - Entries not existing in the model will not be removed.
- `<FeedbackBlocker>`: area people can walk through
  - Imported from multiple mesh objects (i.e. plane) with prefix `FeedbackBlocker`
  - Positions are taken from mesh vertices.
    The first 4 vertices will be sorted to correct order.
- `<BuildBlocker>`: tile size of the building
  - Imported from one mesh object (i.e. plane) with name `ground`
  - Positions are taken from mesh vertices.
    The first 4 vertices will be sorted to correct order.
    Rounded to .5
- `<UnevenBlocker>`: area to always keep above ground
  - Imported from one mesh object (i.e. plane) with name `UnevenBlocker`
  - Positions are taken from mesh vertices.
    The first 4 vertices will be sorted to correct order.

### Quickly Reskin Existing Models

Write a yaml file like below and name it `.cfg.yaml`.
IFO, FC/CF7 and CFG files will be generated accordingly.
Files are copied if they have the same name as the source.
Modifications are currently only supported in IFO and CFG files.

If you have `townhall.cfg`, `townhall.cf7` and `townhall.ifo`, then a `townhall_1.cfg.yaml` leads to generated `townhall_1.cfg`, `townhall_1.fc` and `townhall_1.ifo`. 

Examples: [New Town Hall](https://github.com/jakobharder/anno-1800-jakobs-mods/tree/main/new-town-hall-buildings)

```yaml
variant: 
  source: townhall.cfg
  modifications:
    - xpath: //Config/Models/Config/Materials/Config[Name="building"]
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

Example: [Sources on GitHub](https://github.com/jakobharder/anno-1800-jakobs-mods/), [Compiled Mods](https://github.com/jakobharder/anno-1800-jakobs-mods/releases)

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
- `rdpxml`: convert .rdp.xml into .rdp. [More on a separate page](https://github.com/anno-mods/vscode-anno-modding-tools/blob/main/doc/working-with-particles.md)
- `cfgyaml`: generate CFG, IFO and FC files. [More in a separate chapter](#create-variants-from-templates).

Out folder variables:

- Use `${modName}` to get `[Category] Name` created from `modinfo.Category.English` and `modinfo.ModName.English`. Works only with `out`.
- Use `${annoMods}` to get your local Anno `mods/` directory set in the Extension configuration. Works only with `out`.

Modinfo:

- Basically Anno Mod Manager [modinfo.json](https://github.com/anno-mods/Modinfo) content.
- `modinfo.Description` differs from what the Anno Mod Manager uses. Instead of text use a relative path to a Markdown file. Images will be excluded from the Markdown.

---

## Extension Settings

* `anno.modsFolder`: (optional) path to your `mods/` folder. Available as `${annoMods}` in `annomod.json`. Not required if you don't use the variable.
* `anno.rdaFolder`: (optional) path with RDA data extracted. Available as `${annoRda}` in `*.cfg.yaml` files. You only need the data extracted your mods need. The extension itself does not use this.
* `anno.outlineFolderDepth`: folder depth of props, materials and alike shown .cfg outline.

## Requirements

Some features like .fc conversion rely on external applications that run only on Windows.
Native functions like outlines, highlighting work with Linux/WSL as well though.

## Credits

A big thanks goes to the external projects I'm using for this extension:

- AnnoFCConverter - https://github.com/taubenangriff/AnnoFCConverter/
- rdm4 - https://github.com/lukts30/rdm4
- FileDBReader - https://github.com/anno-mods/FileDBReader
- texconv - https://github.com/microsoft/DirectXTex
- gltf-import-export - https://github.com/najadojo/gltf-import-export
- xmltest - https://github.com/xforce/anno1800-mod-loader

## Release Notes / Known Issues

See changes and known issues in [CHANGELOG](./CHANGELOG.md)