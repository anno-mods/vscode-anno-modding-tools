# Modding Tools for Anno

Tools to create mods for Anno 1800 and Anno 117: Pax Romana.

## Feature Overview

- [Annotations, Live Analysis, Syntax](#annotations-live-analysis-syntax)
  - Use Anno-specific table of contents to navigate asset XMLs
  - See asset names directly next to GUIDs
  - See errors and hints live in your `assets.xml`
- [Navigation](#navigation)
  - Navigate via Outline
  - Jump to asset from any GUID by right click or `Ctrl+T`
- Commands
  - [Compare](#command-compare): Apply mod and compare unpatched vs patched
  - [Build and Deploy](./doc/annomod.md): Copy your mod to the `mods/` folder and generate DDS (with LODs) and other files automatically.
  - [Import from Blender or glTF](#import-from-blender-or-gltf) to `.cfg`, `.ifo` and `.cf7`
  - Various right-click utilities to convert between Anno and editable formats (glTF, PNG, ...)
- Auto-completion
  - [GUID conversion](#guid-conversion)
  - [Assets XML auto completion](#auto-completion)
- Other
  - [Reskin existing models](#quickly-reskin-existing-models) without touching `.cfg`, ...

See [Feature Details](#feature-details) for more, or [CHANGELOG](./CHANGELOG.md) for recent changes.

---

## Setup

### 1. Extract assets.xml

For some features like auto completion and compare you need to extract `assets.xml` from the game.

- Get [RDAExplorer](https://github.com/lysannschlegel/RDAExplorer)
- Open the `.rda` file with the highest number from your Anno 1800 installation under `/Anno 1800/data/`.
- Extract the `data/config/export/main/asset/assets.xml` into a folder with the same structure, e.g. `c:\anno\rda\data\config\export\main\asset\assets.xml`.

### 2. Install XML plugin

Additionally, auto completion and other XML features work only in combination with a plugin that supports XSD validation.

- Install [XML Language Support by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml)

### 3. Check configuration

Go into `File` > `Preferences` > `Settings...` and search for `anno` and configure the following:

- `Anno: Rda Folder`: Path to extracted RDA data (mostly `assets.xml` is used).  
  It is used for compare and live error features.
  
  Use `c:\anno\all-rda` if you have `c:\anno\all-rda\data\config\export\main\asset\assets.xml` (Anno 1800) or `c:\anno\all-rda\data\base\config\export\assets.xml` (Anno 117).
- `Anno: Mods Folder`: Path to your `Anno 1800/mods/` folder to deploy and find dependencies.

### 4. Auto Complete

#### Modinfo.json Schema

Go to `Preferences > Settings` and search for `schemas`.

You will see `JSON: Schemas`. Choose `Edit in settings.json` and insert the following entry:

```json
"json.fileAssociations": [
  {
    "fileMatch": [
        "/modinfo.json"
    ],
    "url": "https://raw.githubusercontent.com/anno-mods/vscode-anno-modding-tools/main/languages/modinfo-schema.json"
  }
]
```

#### XML Patch Schema

This only applies if you have the Red Hat XML plugin installed.

Go to `Preferences > Settings` and search for `xml file associations`.

You will see `Xml: File Associations`. Choose `Edit in settings.json` and insert the following entry:

```json
"xml.fileAssociations": [
  {
      "pattern": "{assets,*.include}.xml",
      "systemId": "https://raw.githubusercontent.com/anno-mods/vscode-anno-modding-tools/main/generated/assets.xsd"
  }
]
```

Note: If you want to force updates for auto-completion delete `C:\Users\<user>\.lemminx` and re-open VSCode.

### 4. How to open files

Most features only activate if you open folders, via `File` > `Open Folder...`.
Best open the mod folder or even the complete `mods/` folder.

The plugin has difficulties understanding the mod structure if you simply open individual files.

### 5. Further Docs

- [Modding Guide](https://github.com/anno-mods/modding-guide#readme) (separate page)
- [glTF Tools](https://marketplace.visualstudio.com/items?itemName=cesium.gltf-vscode) VSCode Plugin

---

## Feature Details

### Annotations, Live Analysis, Syntax

![screenshot of vscode with basic overview](./doc/images/overview.png)

#### Outline

The outline shows `ModOp`s, `Assets` and where possible names instead of GUIDs.

Top-level sections can be created with `<!-- # your text -->` comments.
The `Group` keyword can also be used for further grouping.
Write normal XML comments above groups to name them.

#### GUID Annotation

Displays name and template name of GUIDs.

This feature will also consider Mod GUIDs, if they are either:
- part of your own mod
- part of a dependency mentioned in `modinfo.json` and installed into the game's `mods/` folder

#### Live Analysis

The live analysis applies your mod on save to the game and provides error and performance information.

#### Syntax Check

The plugin will scan you asset files for common problems like the use of outdated pools (e.g. `190611`).
The file must match the naming scheme `assets*.xml` to be considered.

### Navigation

![](./doc/images/navigation.gif)

#### Navigate via Outline

You can click on any outline entry to directly jump to that section in the code.

#### Go to Asset

Right click on any GUID and select `Go to Definition` or press `F12` to jump to the related Mod or vanilla asset.

You can press `Ctrl+T` and type the asset name to jump to assets as well.

### Command `Compare`

![](./doc/images/xmltest-compare.gif)

You can check th results of one or more `ModOp`s by selecting them and then right click > `Anno: Compare Results with Vanilla`.

Alternatively, you can compare full files and mods by right clicking on `assets.xml`, `templates.xml` and `*.include.xml`.

### GUID Conversion

![](./doc/guid-utils.gif)

You get a list of possible GUID matches to replace to.
The list is shown automatically in XML tags that expect a GUID, or after typing `GUID="` in ModOps. 

Otherwise, trigger the list manually with `Ctrl` + `Space`.

Not all GUIDs can be converted automatically due to performance. Most notable exclusions are `Test` and `Audio`.

### Auto Completion

![](./doc/images/autocompletion.gif)

Check [Setup](#setup) to activate this feature.

Now your code gets validated and you can press `Ctrl` + `Space` anywhere in the document and get a list of possible tags, enums or GUIDs.

Note: If you want to force updates for auto-completion delete `C:\Users\<user>\.lemminx` and re-open VSCode.

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

- `<Dummies><i>`: people, FireDummy, feedback_door, ...
  - Imported from multiple objects with prefix `fc_`.
  - `Position` and `Orientation` are taken from the object.
    `RotationY` is calculated from the orientation.
  - `<Name>` of the entry will be matched against what comes after `fc_`.
    E.g. `fc_Dummy0` will be matched against `<Name>Dummy0</Name>`.
  - Entries not existing in the model will not be removed.

IFO file imports:

- `<IntersectBox>`: clickable 3D area (aka hitbox) of the building
  - Imported from multiple mesh object (e.g. cube) with prefix `hitbox`
  - `Position`, `Rotation` and `Extents` are calculated from the boundaries of the objects.
    1 box per object.
- `<Dummy>`: transporter spawn, fire locations, ...
  - Imported from multiple objects with prefix `dummy_`.
  - `Position`, `Rotation` and `Extents` are taken from the object.
  - `<Name>` of the entry will be matched against what comes after `dummy_`.
    E.g. `dummy_transporter_spawn` will be matched against `<Name>transporter_spawn</Name>`.
  - Entries not existing in the model will not be removed.
- `<FeedbackBlocker>`: area people can walk through
  - Imported from multiple mesh objects (e.g. plane) with prefix `FeedbackBlocker`
  - `Position`s are taken from mesh vertices.
    Rounded to .25
- `<BuildBlocker>`: tile size of the building
  - Imported from one mesh object (e.g. plane) with name `ground`
  - `Position`s are taken from mesh vertices.
    Rounded to .5
- `<UnevenBlocker>`: area to always keep above ground
  - Imported from one mesh object (e.g. plane) with name `UnevenBlocker`
  - `Position`s are taken from mesh vertices.
    Rounded **up** in .25 steps

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

---

## Credits

Anno is a trademark of Ubisoft Entertainment in the US and/or other countries.

A big thanks goes to the external projects I'm using for this extension:

- AnnoFCConverter - https://github.com/taubenangriff/AnnoFCConverter/
- rdm4 - https://github.com/lukts30/rdm4
- FileDBReader - https://github.com/anno-mods/FileDBReader
- texconv - https://github.com/microsoft/DirectXTex
- gltf-import-export - https://github.com/najadojo/gltf-import-export
- xmltest - https://github.com/xforce/anno1800-mod-loader
