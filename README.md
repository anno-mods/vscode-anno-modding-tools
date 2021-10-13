# Anno Modding Tools

Some tools to make your modding life easier.

This project is not affiliated in any way with Ubisoft.

Anno 1800 is a trademark of Ubisoft Entertainment in the US and/or other countries. Anno is a trademark of Ubisoft GmbH in the US and/or other countries.

## Features

- Anno-specific outlines: `.cfg`, `.ifo`, `.cf7`
- Anno-specific syntax highlighting: `.cfg`, `.ifo`, `.cf7`
- Right-click `Import from glTF` (targets: `.cfg`, `.ifo`)
- Right-click `Convert to Anno .cf7`, `Convert to Anno .fc`
- Right-click `Convert to glTF Binary` from `.rdm`
- Command `Build Anno Mod`: build project using `annomod.json` description.

![](./doc/quickintro.gif)

Read all the [Feature Details](#feature-details) below.

## Extension Settings

* `anno.modsFolder`: path to your `mods/` folder. Available as `${annoMods}` in `annomod.json`. Not required if you don't use the variable.

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
Native functions like outlines, highlighting work with WSL as well though.

## Known Issues

I'm currently in a trying out phase of development.
There are quite a few things that may be quirky or break easily.

## Credits

A big thanks goes to the external projects I'm using for this extension:

- AnnoFCConverter - https://github.com/taubenangriff/AnnoFCConverter/
- rdm4 - https://github.com/lukts30/rdm4
- texconv - https://github.com/microsoft/DirectXTex
- gltf-pipeline - https://github.com/CesiumGS/gltf-pipeline

## Release Notes

### 0.0.11

Initial (and buggy) release of the idea.

See [CHANGELOG](./CHANGELOG.md)

## Feature Details


### Import from glTF

Node names must start with `prop_` or `particle_`. New nodes will be added, existing ones updated and nodes in .cfg but not the model marked with `_removed`.

The following items will be imported then:
- Position, Rotation, Scale
- Props only: mesh name as `FileName` if it ends with `.prp`. Don't worry about Blender-style `.001`, `.002`, ... endings. They will be ignored.
  - Unfortunately the mesh name is limited in length. It will not some prop files.

Vertices from a mesh/node named `ground` are used to importer `BuildBlocker` and `DECAL` size.

### Build Anno Mod

Example: [Sources on GitHub](https://github.com/jakobharder/anno-1800-jakobs-mods/tree/devel/vscode-anno-modding-tools), [Result as zip download](https://github.com/jakobharder/anno-1800-jakobs-mods/releases)

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
      "action": "static",
      "pattern": "{data/config/**/*,**/icons/*.png,banner.png,README.md}"
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
  - `lods`: Number of LOD levels to generate, saved as `_0.dds` and so on. Set to 0 to disable LODs. Default is 3.
- `cf7`: converts .cf7 into .fc
- `glb`: converts .gltf (glb is WIP) to .rdm.
  - `lods`: Number of LOD levels to pull out of .gltf files. Meshes must end with `_lod0` and so on to be considered. Default is 4.
- `modinfo`: generate `modinfo.json`.
  - `content_en`: generate `content_en.txt` file with same content as `modinfo.Description.English`.

Out folder variables:

- Use `${modName}` to get `[Category] Name` created from `modinfo.Category.English` and `modinfo.ModName.English`. Works only with `out`.
- Use `${annoMods}` to get your local Anno `mods/` directory set in the Extension configuration. Works only with `out`.

Modinfo:

- Basically Anno Mod Manager modinfo.json content.
- `modinfo.Description` differs from what the Anno Mod Manager uses. Instead of text use a relative path to a Markdown file. Images will be excluded from the Markdown.
