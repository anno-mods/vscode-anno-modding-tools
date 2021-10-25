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
- FC GUID hover
- Details for feedback definition
- ConfigType LIGHT
- Enable XML formatter
- Cloth model/materials in outline (new world residence tier2)
- LOD 1-4 generated even if it's not in the model?
- UnevenBlocker in outline (and unkown elements on the same level)
- <Item>*.cfg</Item> in assets.xml as regex instead of individual entries
- better outline behavior when writing new tags
- .cfg.yaml should consider .cf7 as well
- import fc from gltf / RotationY
- empty line in .cf7 endless loop in annofcconverter
- no tangent warning in channel output

### Added

- Right-click `Convert to RDP XML` from `.rdp`
- Right-click `Convert to RDP` from `.rdp.xml`
- `rdpxml` converter for building from RDP XML
- Don't overwrite files with `Convert to ..` context menu commands
- Hover info for asset keywords like `UpgradeList` and `ResidenceUpgrade`
- Auto-complete after typing `GUID='`

## [0.2.0]

### Added

- Support animations in glTF conversion.
- Show model animation in .cfg outline
- Option to move files to `maps`, `rdm` and `anim`

### Changed

- Allow lods: 0 for gltf exporter to disable adding `_lod0` to the name.

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
