Feedback
- --gltf-mesh-index: works nicely together with --skeleton and --animation 👍
- gltf buffers: I recommend to prefix the buffer names with the .gltf file name. This is important as I export multiple .gltfs into one folder.
- gltfmin buffers: Blender names this same as the .gltf, which I like. Prefixing it like in "gltf" mode is also fine.
- Missing texture files should be a warning instead of an error. The converter can continue without problems. I use some vanilla textures in Blender but remove them from the exported files. I have to replace the URIs with a 1 pixel temporary fake.png to be able to still convert the glTF.
- gltfmin name: (super minor) reading the name I thought it's producing a minimized json file. Only after using gltf I figured it's probably about the merged buffers.
