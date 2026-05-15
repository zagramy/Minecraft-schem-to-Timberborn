# Minecraft schem to Timberborn
Convert Minecraft worlds into fully playable Timberborn maps using WorldEdit schematics. The app preserves terrain, trees, and individual water sources to recreate your world with impressive accuracy. Explore familiar landscapes and build your beaver civilization on maps generated from your own creations.


## Tested on

This version has been tested with the following setup:

* [Minecraft **26.1.2**](https://www.minecraft.net/pl-pl/download)
* [Fabric API **0.148.2+26.1.2**](https://mediafilez.forgecdn.net/files/8073/357/fabric-api-0.148.2%2B26.1.2.jar)
* [Fabric Installer **1.1.1**](https://maven.fabricmc.net/net/fabricmc/fabric-installer/1.1.1/fabric-installer-1.1.1.exe)
* [WorldEdit Mod **7.4.3**](https://mediafilez.forgecdn.net/files/8037/379/worldedit-mod-7.4.3.jar)

## Notes

Other versions may work, but compatibility is not guaranteed. For best results, use the exact setup listed above.

# How it works

## Exporting terrain from Minecraft

1. Launch Minecraft with the WorldEdit mod installed.
2. Select the area you want to export using the wooden axe:

   * Left click one corner
   * Right click the opposite corner of the selection cube

You can also use WorldEdit commands to make the selection.

3. Copy the selected terrain:

```txt
//copy
```

4. Save the structure as a schematic:

```txt
//schem save structure
```

5. Move the generated `structure.schem` file into the folder containing the script or executable.

---

# Required files

## Script version

Make sure these files are in the same folder:

```txt
index.js
config.json
map_thumbnail.jpg
package.json
structure.schem
```

Install [Node.js](https://nodejs.org/en/download) first. 

During the first launch:

1. Open CMD in the project folder
2. Run:

```txt
npm install
```

3. After installing dependencies run:

```txt
node index.js
```

---

## Executable version

Required files:

```txt
config.json
map_thumbnail.jpg
structure.schem
Minecraft schem to Timberborn.exe
```
[Releases exe](https://github.com/zagramy/Minecraft-schem-to-Timberborn/releases/tag/v0.0.1)

If all required files are in the same folder, simply run:

```txt
Minecraft schem to Timberborn.exe
```

---
# config.json documentation

This file controls how Minecraft terrain is converted into Timberborn maps.

---

## Creating a log file 

```json
"logFileCreate": false,
```

Disable or enable log file creation, `true` or `false`

---

## Map size limit

```json
"mapMaxSize": {
  "x": 256,
  "y": 256
}
```

Defines the maximum size of the generated map.

* `x` → width of the map
* `y` → length of the map

⚠️ Important:
256×256 is the maximum supported size for vanilla Timberborn (without mods). Larger maps may require mod support or custom adjustments.

Anything above this limit will be clipped or reduced during processing.

---

## Settings (vegetation behavior)

```json
"settings": {
  "oak": {
    "chanceNew": 0.5,
    "chanceGrow": 0.5
  }
}
```

Each plant type controls how it behaves after conversion.

### Parameters:

* `chanceNew` → probability of new instances appearing
* `chanceGrow` → probability of generating a growth stage instead of a static object (young or mature form depending on context)

Value range:

Both parameters must be within:

minimum: 0
maximum: 1

Examples:

0 → disabled (no effect)
0.5 → balanced chance
1 → always applied

### Supported groups:

* oak
* birch
* pine
* blueberry

Each group has independent growth and spawn behavior.

---

## Terrain blocks

```json
"terrainBlocks": [
  "minecraft:stone",
  "minecraft:dirt",
  "minecraft:grass_block",
  "minecraft:gravel",
  "minecraft:sand"
]
```

Defines which Minecraft blocks are treated as valid terrain.

Only these blocks are converted into playable ground in Timberborn.

---

## Block groups mapping

### Trees

```json
"oak"
"birch"
"pine"
```

Each group defines which Minecraft blocks are interpreted as a specific tree type in Timberborn.

Example:

* oak → oak logs, dark oak, pale oak
* birch → birch, acacia, cherry
* pine → spruce, jungle, mangrove roots

---

### Vegetation / plants

```json
"blueberry"
```

This group includes all small plants, flowers, bushes and decorative vegetation.

Examples:

* flowers (dandelion, poppy, tulips, etc.)
* mushrooms
* grass variants
* vines
* sugar cane
* berries and crops

These are used to populate the map with natural details.

---

## Summary

This config controls:

* map size limits
* terrain filtering rules
* tree classification
* vegetation distribution probability
* world detail density after conversion

Adjusting values affects how dense, natural and optimized the final Timberborn map will be.

# Generated files

The script or executable should generate two files:

```txt
map_dc143ff7-e30c-4586-9b57-294c1174c46e.timber
map_dc143ff7-e30c-4586-9b57-294c1174c46e_log.json
```

## File descriptions

### `.timber`

The generated Timberborn map file.
Move it into your Timberborn maps folder.

### `..._log.json`

A log file containing generated map data for inspection.
It can be safely deleted, cteated if `"logFileCreate": true,` in config.json.

---

# Final steps

After importing the map into Timberborn:

1. Open the map editor
2. Add missing gameplay elements such as:

   * starting district
   * mines
   * resources
   * decorations

When opening the editor you may see warnings about removed elements.
This happens because some imported structures do not satisfy Timberborn gravity rules.


