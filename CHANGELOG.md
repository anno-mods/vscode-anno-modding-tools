# Change Log

All notable changes to the "anno-modding-tools" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- `<Materials>` and `<MaterialLODInfos>` import
- issue with yellow metal texture from Blender export
- support and strip comments from `.cfg`, `.ifo`
- replace Cesium glb/gltf conversion with much simpler https://github.com/najadojo/gltf-import-export
- Right-click `Import Materials`. Reorders material list and fills some gaps.
- support glTF binary in `gltf` converter
- Option to move files to `maps`, `rdm` and `anim`

### Added

- Show model animation in .cfg outline
- Support animations in glTF conversion.

## [0.1.1]

### Changed

- Activate on .xml. This fixes an issue when opening single assets.xml files.
  Activation on assets.xml is unfortunately only possible when opening folders and workspaces.

## [0.1.0]

### Added

- LOD generation for `texture` converter
- Asset name on hover over GUIDs in XPath strings and in tags `Ingredient`, `Product`, `ItemLink` or `GUID`.
  Supported assets are limited to products, items, buildings, pools (to maintain speed and usability).
- Asset name to GUID conversion when in tags (same as hover).
  Supported assets are limited to products and items.
- Setting to control folder depth shown in .cfg outline
- Right-click `Build Anno Mod` on `annomod.json`

## [0.0.11]

### Added

- Better license information

## [0.0.10]

- Initial prototyping release
- Anno-specific outlines: `.cfg`, `.ifo`, `.cf7`
- Anno-specific syntax highlighting: `.cfg`, `.ifo`, `.cf7`
- Right-click `Import from glTF` (targets: `.cfg`, `.ifo`)
- Right-click `Convert to Anno .cf7`, `Convert to Anno .fc`
- Right-click `Convert to glTF Binary` from `.rdm`
- Right-click `Convert to DDS`, `Convert to PNG`
- Command `Build Anno Mod` to build project using `annomod.json` description.
