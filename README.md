# Minecraft schem to Timberborn
Convert Minecraft worlds into fully playable Timberborn maps using WorldEdit schematics. The app preserves terrain, trees, and individual water sources to recreate your world with impressive accuracy. Explore familiar landscapes and build your beaver civilization on maps generated from your own creations.

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

5. Move the generated `.schem` file into the folder containing the script or executable.

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

Install Node.js first. https://nodejs.org/en/download

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
Releases: https://github.com/zagramy/Minecraft-schem-to-Timberborn/releases/tag/v0.0.1

If all required files are in the same folder, simply run:

```txt
Minecraft schem to Timberborn.exe
```

---

# Generated files

The script or executable should generate two files:

```txt
map_dc143ff7-e30c-4586-9b57-294c1174c46e.timber
map_dc143ff7-e30c-4586-9b57-294c1174c46e_log
```

## File descriptions

### `.timber`

The generated Timberborn map file.
Move it into your Timberborn maps folder.

### `..._log.json`

A log file containing generated map data for inspection.
It can be safely deleted.

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


