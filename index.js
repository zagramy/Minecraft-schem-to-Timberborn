// ================= IMPORTS =================
const fs = require("fs");
const nbt = require("prismarine-nbt");
const AdmZip = require("adm-zip");
const {
    randomUUID
} = require("crypto");

// ================= CONFIG =================
const path = require("path");

function appPath(file) {
    return path.join(
        process.pkg
            ? path.dirname(process.execPath)
            : __dirname,
        file
    );
}
const config = JSON.parse(
    fs.readFileSync(appPath("config.json"), "utf8")
);
const MAX_X = config.mapMaxSize.x;
const MAX_Y = config.mapMaxSize.y;
const chanceNewOak = config.settings.oak.chanceNew;
const chanceNewBirch = config.settings.birch.chanceNew;
const chanceNewPine = config.settings.pine.chanceNew;
const chanceNewBlueberry = config.settings.blueberry.chanceNew;
const chanceGrowOak = config.settings.oak.chanceGrow;
const chanceGrowBirch = config.settings.birch.chanceGrow;
const chanceGrowPine = config.settings.pine.chanceGrow;
const chanceGrowBlueberry = config.settings.blueberry.chanceGrow;
const TERRAIN = new Set(config.terrainBlocks);

const HEIGHT = 23;

const OAK_GROUP = new Set(config.groups.oak);
const BIRCH_GROUP = new Set(config.groups.birch);
const PINE_GROUP = new Set(config.groups.pine);
const BLUEBERRY_GROUP = new Set(config.groups.blueberry);

const ALL_LOGS = new Set([
    ...OAK_GROUP,
    ...BIRCH_GROUP,
    ...PINE_GROUP,
    ...BLUEBERRY_GROUP
]);

// ================= CONSTANTS =================
const AIR = "minecraft:air";
const WATER_SOURCE = "minecraft:water[level=0]";

const NEIGHBOR_DIRS = [
    // axis (6)
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],

    // edges on same Y (8 diagonals)
    [1, 0, 1],
    [1, 0, -1],
    [-1, 0, 1],
    [-1, 0, -1],

    // vertical + horizontal diagonals (8)
    [1, 1, 0],
    [-1, 1, 0],
    [0, 1, 1],
    [0, 1, -1],
    [1, -1, 0],
    [-1, -1, 0],
    [0, -1, 1],
    [0, -1, -1],

    // full 3D corners (8)
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, 1, 1],
    [-1, 1, -1],
    [-1, -1, 1],
    [-1, -1, -1]
];

// ================= HELPERS =================

function unwrap(tag) {

    while (
        tag &&
        typeof tag === "object" &&
        tag.value !== undefined
    ) {
        tag = tag.value;
    }

    return tag;
}

function normalize(block) {

    const index = block.indexOf("[");

    return index === -1 ?
        block :
        block.slice(0, index);
}

function isTerrain(block) {
    return TERRAIN.has(normalize(block));
}

function isWaterSource(block) {
    return block === WATER_SOURCE;
}

function isLog(block) {
    return ALL_LOGS.has(normalize(block));
}

function hasEntityAt(entities, x, y, z) {

    for (const entity of entities) {

        const pos =
            entity.Components?.BlockObject?.Coordinates;

        if (!pos) {
            continue;
        }

        if (
            pos.X === x &&
            pos.Y === y &&
            pos.Z === z
        ) {
            return true;
        }
    }

    return false;
}
// ================= FLIP X =================
function flipX(x, width) {
    return width - 1 - x;
}

// ================= INDEX =================
function idx(x, y, z, width, layerSize) {
    return y * layerSize + (z * width + x);
}

// ================= SAFE BLOCK READ =================
function getBlock(
    blocks,
    index
) {
    return blocks[index] || AIR;
}

// ================= MAIN =================
function convert(file) {

    if (!fs.existsSync(file)) {

        console.error("Missing schematic:", file);
        return;
    }

    const data = fs.readFileSync(file);

    nbt.parse(data, (err, result) => {

            if (err) {
                console.error("NBT parse failed");
                throw err;
            }

            const schem = result.value.Schematic.value;
            const blocks = schem.Blocks.value;

            const width = Math.min(
                schem.Width.value,
                MAX_X
            );

            const length = Math.min(
                schem.Length.value,
                MAX_Y
            );

            const schematicHeight = Math.min(
                schem.Height.value,
                HEIGHT
            );

            const layerSize = width * length;
            const totalSize = width * length * HEIGHT;

            const paletteRaw = unwrap(blocks.Palette);
            const dataArray = unwrap(blocks.Data);

            // ================= BUILD PALETTE =================
            const palette = {};

            for (const [name, obj] of Object.entries(paletteRaw)) {
                palette[obj.value] = name;
            }

            // ================= PRE-RESOLVE BLOCKS =================
            const resolvedBlocks = new Array(dataArray.length);

            for (let i = 0; i < dataArray.length; i++) {
                resolvedBlocks[i] =
                    palette[dataArray[i]] || AIR;
            }

            // ================= WORLD DATA =================
            const grid = new Uint8Array(totalSize);

            const entities = [];

            let waterSourcesCount = 0;
            let treeEntitiesCount = 0;

            // ================= TERRAIN PASS =================
            for (let y = 0; y < schematicHeight; y++) {

                for (let z = 0; z < length; z++) {

                    for (let x = 0; x < width; x++) {

                        // minecraft read
                        const Index = idx(
                            x,
                            y,
                            z,
                            width,
                            layerSize
                        );

                        // timberborn write
                        const tIndex = idx(
                            flipX(x, width),
                            y,
                            z,
                            width,
                            layerSize
                        );

                        const block = getBlock(
                            resolvedBlocks,
                            Index
                        );

                        // ================= TERRAIN =================
                        if (isTerrain(block)) {
                            grid[tIndex] = 1;
                        }

                        // ================= WATER =================
                        if (isWaterSource(block)) {

                            let hasNeighbor = false;

                            for (const [dx, dy, dz] of NEIGHBOR_DIRS) {

                                const nx = x + dx;
                                const ny = y + dy;
                                const nz = z + dz;

                                if (
                                    nx < 0 ||
                                    ny < 0 ||
                                    nz < 0 ||
                                    nx >= width ||
                                    ny >= schematicHeight ||
                                    nz >= length
                                ) {
                                    continue;
                                }

                                const neighborIndex = idx(
                                    nx,
                                    ny,
                                    nz,
                                    width,
                                    layerSize
                                );

                                const neighborBlock = getBlock(
                                    resolvedBlocks,
                                    neighborIndex
                                );

                                if (neighborBlock === WATER_SOURCE) {
                                    hasNeighbor = true;
                                    break;
                                }
                            }

                            if (!hasNeighbor) {

                                // ================= FILL TERRAIN BELOW WATER =================
                                for (let fy = y - 1; fy >= 0; fy--) {

                                    const fillIndex = idx(
                                        flipX(x, width),
                                        fy,
                                        z,
                                        width,
                                        layerSize
                                    );

                                    grid[fillIndex] = 1;
                                }

                                waterSourcesCount++;

                                entities.push({
                                    Id: randomUUID(),
                                    Template: "WaterSource",
                                    Components: {
                                        WaterSource: {
                                            SpecifiedStrength: 1,
                                            CurrentStrength: 1
                                        },
                                        BlockObject: {
                                            Coordinates: {
                                                X: flipX(x, width),
                                                Y: z,
                                                Z: y
                                            }
                                        }
                                    }
                                });

                                // remove voxel where water source exists
                                grid[tIndex] = 0;
                            }
                        }

                        // ================= TREES AND BLUEBERRIES =================
                        if (isLog(block)) {

                            let below = AIR;
                            let above = AIR;

                            if (y > 0) {

                                const belowIndex = idx(
                                    x,
                                    y - 1,
                                    z,
                                    width,
                                    layerSize
                                );

                                below = getBlock(
                                    resolvedBlocks,
                                    belowIndex
                                );
                            }

                            if (y < schematicHeight - 1) {

                                const aboveIndex = idx(
                                    x,
                                    y + 1,
                                    z,
                                    width,
                                    layerSize
                                );

                                above = getBlock(
                                    resolvedBlocks,
                                    aboveIndex
                                );
                            }

                            if (
                                isTerrain(below) &&
                                !isTerrain(above)
                            ) {

                                let template = null;
								let good = null;
                                let amount = 1;
								let chancenew = 0;
                                let growChance = 0;

                                const base = normalize(block);

                                if (OAK_GROUP.has(base)) {

                                    template = "Oak";
									good: "Log";
                                    amount = 8;
                                    growChance = chanceGrowOak;
									chancenew = chanceNewOak;
                                } else if (BIRCH_GROUP.has(base)) {

                                    template = "Birch";
									good: "Log";
                                    amount = 1;
                                    growChance = chanceGrowBirch;
									chancenew = chanceNewBirch;
                                } else if (PINE_GROUP.has(base)) {

                                    template = "Pine";
									good: "Log";
                                    amount = 2;
                                    growChance = chanceGrowPine;
									chancenew = chanceNewPine;
                                } else if (BLUEBERRY_GROUP.has(base)) {

                                    template = "BlueberryBush";
									good: "Berries";
                                    amount = 2;
                                    growChance = chanceGrowBlueberry;
									chancenew = chanceNewBlueberry;
                                }

                                if (template) {

								treeEntitiesCount++;

								const components = {
									BlockObject: {
										Coordinates: {
											X: flipX(x, width),
											Y: z,
											Z: y
										}
									},
									CoordinatesOffsetter: {
										Random: true
									},
									LivingNaturalResource: {
										IsDead: true
									},
									Yielder: {
										Cuttable: {
											Yield: {
												Good: good,
												Amount: amount
											}
										}
									}
								};

								if (Math.random() < growChance) {

									components.Growable = {
										GrowthProgress: 0.009998858
									};
								}

								entities.push({
									Id: randomUUID(),
									Template: template,
									Components: components
								});
                                // ================= EXTRA TREES AND BLUEBERRIES =================
                                for (let ox = -2; ox <= 2; ox++) {

                                    for (let oz = -2; oz <= 2; oz++) {

                                        // skip center
                                        if (ox === 0 && oz === 0) {
                                            continue;
                                        }

                                        if (Math.random() < chancenew) {
                                            continue;
                                        }

                                        const nx = x + ox;
                                        const nz = z + oz;

                                        // bounds
                                        if (
                                            nx < 0 ||
                                            nz < 0 ||
                                            nx >= width ||
                                            nz >= length
                                        ) {
                                            continue;
                                        }

                                        const groundIndex = idx(
                                            nx,
                                            y - 1,
                                            nz,
                                            width,
                                            layerSize
                                        );

                                        const currentIndex = idx(
                                            nx,
                                            y,
                                            nz,
                                            width,
                                            layerSize
                                        );

                                        const aboveIndex = idx(
                                            nx,
                                            y + 1,
                                            nz,
                                            width,
                                            layerSize
                                        );

                                        const groundBlock = getBlock(
                                            resolvedBlocks,
                                            groundIndex
                                        );

                                        const currentBlock = getBlock(
                                            resolvedBlocks,
                                            currentIndex
                                        );

                                        const aboveBlock = getBlock(
                                            resolvedBlocks,
                                            aboveIndex
                                        );

                                        // current and above must be empty
                                        if (
                                            currentBlock !== AIR ||
                                            aboveBlock !== AIR
                                        ) {
                                            continue;
                                        }

                                        // below must be terrain
                                        if (!isTerrain(groundBlock)) {
                                            continue;
                                        }

                                        const tx = flipX(nx, width);
                                        const ty = nz;
                                        const tz = y;

                                        // avoid duplicate entities
                                        if (
                                            hasEntityAt(
                                                entities,
                                                tx,
                                                ty,
                                                tz
                                            )
                                        ) {
                                            continue;
                                        }

                                        treeEntitiesCount++;

										const components = {
											BlockObject: {
												Coordinates: {
													X: tx,
													Y: ty,
													Z: tz
												}
											},
											CoordinatesOffsetter: {
												Random: true
											},
											LivingNaturalResource: {
												IsDead: true
											},
											Yielder: {
												Cuttable: {
													Yield: {
														Good: good,
														Amount: amount
													}
												}
											}
										};

										if (Math.random() < growChance) {

											components.Growable = {
												GrowthProgress: 0.000000001
											};
										}

										entities.push({
											Id: randomUUID(),
											Template: template,
											Components: components
										});
                                    }
                                }
                                grid[tIndex] = 0;
                            }
                        }
                    }
                }
            }
        }

        // ================= CLEAN GRID =================
        const voxelArray = Array.from(grid);

        // ================= WATER ARRAYS =================
        const size = width * length;

        const emptyArray = "0 "
            .repeat(size)
            .trim();

        const columnOutflows = Array(size)
            .fill("0|0:0|0:0|0:0|0")
            .join(" ");

        // ================= WORLD =================
        const world = {

            GameVersion: "1.0.12.5-3db367b-gw",

            Timestamp: new Date()
                .toISOString()
                .replace("T", " ")
                .split(".")[0],

            Singletons: {

                MapSize: {
                    Size: {
                        X: width,
                        Y: length
                    }
                },

                TerrainMap: {
                    Voxels: {
                        Array: voxelArray.join(" ")
                    }
                },

                WaterEvaporationMap: {
                    Levels: 1,
                    EvaporationModifiers: {
                        Array: emptyArray
                    }
                },

                WaterSimulationMigrator: {
                    IsMigrated: true
                },

                WaterMapNew: {
                    Levels: 1,
                    WaterColumns: {
                        Array: emptyArray
                    },
                    ColumnOutflows: {
                        Array: columnOutflows
                    }
                },

                SoilMoistureSimulator: {
                    Size: 1,
                    MoistureLevels: {
                        Array: emptyArray
                    }
                },

                SoilContaminationSimulator: {
                    Size: 1,
                    ContaminationCandidates: {
                        Array: emptyArray
                    },
                    ContaminationLevels: {
                        Array: emptyArray
                    }
                },

                NumberedEntityNamerService: {
                    NextNumbers: []
                },

                WindService: {
                    WindStrength: 0,
                    WindDirection: {
                        X: 0,
                        Y: 0
                    },
                    NextWindChangeTime: 0
                }
            },

            Entities: entities
        };

        // ================= SAVE =================
        const fileid = randomUUID();

        const tmpFolder = path.join(process.cwd(), `tmp_${fileid}`);
        const zipName = `map_${fileid}.timber`;

        fs.mkdirSync(tmpFolder);

        fs.writeFileSync(
            `${tmpFolder}/world.json`,
            JSON.stringify(world)
        );

        fs.writeFileSync(
            `${tmpFolder}/map_metadata.json`,
            JSON.stringify({
                Width: width,
                Height: length,
                MapNameLocKey: "",
                MapDescriptionLocKey: "",
                MapDescription: "",
                IsRecommended: false,
                IsUnconventional: false,
                IsDev: false
            })
        );

        fs.writeFileSync(
            `${tmpFolder}/version.txt`,
            "1.0.12.5-3db367b-gw"
        );

        if (fs.existsSync(path.join(__dirname, "map_thumbnail.jpg"))) {

            fs.copyFileSync(
                "map_thumbnail.jpg",
                `${tmpFolder}/map_thumbnail.jpg`
            );
        }

        fs.writeFileSync(
            `map_${fileid}_log.json`,
            JSON.stringify(world, null, 2)
        );

        const zip = new AdmZip();

        for (const f of fs.readdirSync(tmpFolder)) {

            zip.addFile(
                f,
                fs.readFileSync(`${tmpFolder}/${f}`)
            );
        }

        zip.writeZip(zipName);

        fs.rmSync(tmpFolder, {
            recursive: true,
            force: true
        });

        console.log("================================="); 
		console.log("DONE:", zipName); 
		console.log("Map size:", width, "x", length); 
		console.log("Height:", schematicHeight); 
		console.log("Water sources created:", waterSourcesCount); 
		console.log("Tree and Blueberry entities created:", treeEntitiesCount); 
		console.log("=================================");
    });
	process.stdin.resume();
}

convert(appPath("structure.schem"));