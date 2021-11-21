# Change Log

All notable changes to the "anno-modding-tools" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- glTF
  - support glTF binary in `gltf` converter
  - add `Convert to glTF JSON`
  - one-click preview of RDM using glTF Tools extension
- Import
  - Right-click `Import Materials`. Reorders material list and fills some gaps.
  - `<Materials>` and `<MaterialLODInfos>` import
- Outline
  - ConfigType LIGHT
  - Cloth model/materials in outline (new world residence tier2)
  - UnevenBlocker in outline (and unkown elements on the same level)
  - better outline behavior when writing new tags
- Editing
  - support and strip comments from `.cfg`, `.ifo`
  - FC GUID hover
  - Include XML formatter / declare as xml format?
- Details for feedback definition
- Issues
  - issue with yellow metal texture from Blender export
  - Show strong warning when there's no tangent information on the mesh
  - error handling for invalid xml files
  - empty annomod project breaks the extension (tradepatent-fish)
- Internal
  - replace all texconv usage to reduce number of tools

## [0.5.2]

### Changed

- Fixed issue with buildmod failing with files.json when no .modcache is needed

## [0.5.1]

### Changed

- Improved outline name detection for .cf7 feedback definitions
- Support `${annoRda}` in command line mode
- Fixed issue with some features not loading properly

## [0.5.0]

### Added

- Build mod command as script in NPM package for standalone execution
- First unit tests

### Changed

- Fixed GUID hover in XPath strings
- Added Clothes/CLOTH to outlines
- Internal optimizations
- Replaced texconv with annotex/bc7enc for better non-GPU build performance

## [0.4.1]

### Changed

- Fixed outline issues with self-closing or unkown tags in .cfg files

## [0.4.0]

### Added

- assets.xml outline
- GUID hover and auto-complete now also consider GUIDs from the open assets.xml
- Path variable `${annoRda}` to derive from vanilla .cfg files in .cfg.yaml
- Automatic `xmltest.exe` execution for builds on assets.xml.

## [0.3.2]

### Changed

- Use BC1_UNORM for `_mask.png` textures.
- cfgyaml source can now be in a different folder.

## [0.3.1]

### Changed

- Renamed to Modding Tools for Anno to be less trademark offensive.

## [0.3.0]

### Added

- `.rdp.xml` <> `.rdp` conversion for annomod.json and right-click menus.
- `.cfg.yaml` > `.cfg`, `.ifo`, `.fc` generation for annomod.json and right-click menus.
- Import CFG `FILE` sections with `Import PROPs from glTF`.
- Import FC `Dummy` position and orientation with `Import from glTF`.
- Don't overwrite files with `Convert to ..` context menu commands
- Hover info for asset keywords like `UpgradeList` and `ResidenceUpgrade`
- Auto-complete after typing `GUID='`

### Changed

- Included AnnoFCConverter fix to deal with ending empty lines in .cf7

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
