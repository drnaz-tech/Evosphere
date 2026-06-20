import { eventBus } from "./EventBus";
import type { WorldMap, WorldTile } from "../types/simulation";

export class WorldGenerator {
  generate(seed: number): WorldMap {
    const startTime = performance.now();

    const width = 256;
    const height = 256;
    const tiles: WorldTile[][] = [];

    // Procedural terrain generation from seed
    for (let y = 0; y < height; y++) {
      const row: WorldTile[] = [];
      for (let x = 0; x < width; x++) {
        const elevation = this.noise(x, y, seed);
        const moisture = this.noise(x + 1000, y + 1000, seed);
        const temperature = 1 - (elevation * 0.6 + Math.abs(y / height - 0.5) * 0.4);
        row.push({
          elevation,
          moisture,
          temperature,
          biome: this.classifyBiome(elevation, moisture, temperature),
        });
      }
      tiles.push(row);
    }

    // Carve rivers and lakes
    const hasRivers = this.carveRivers(tiles, seed);
    const hasLakes = this.carveLakes(tiles, seed);

    // Collect unique biome types
    const biomeSet = new Set<string>();
    for (const row of tiles) {
      for (const tile of row) {
        biomeSet.add(tile.biome);
      }
    }
    const biomes = Array.from(biomeSet);

    const worldMap: WorldMap = { width, height, tiles, seed, biomes, hasRivers, hasLakes };

    const generationTimeMs = Math.round(performance.now() - startTime);

    // Pendo Track Event: world_generated
    pendo.track("world_generated", {
      seed,
      worldWidth: width,
      worldHeight: height,
      biomeCount: biomes.length,
      biomeTypes: biomes.join(","),
      generationTimeMs,
      hasRivers,
      hasLakes,
    });

    eventBus.emit("sim:world-generated", worldMap);

    return worldMap;
  }

  private noise(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  }

  private classifyBiome(elevation: number, moisture: number, temperature: number): string {
    if (elevation < 0.15) return "deep_ocean";
    if (elevation < 0.25) return "coastal";
    if (elevation > 0.85) return "alpine";
    if (elevation > 0.7) return "tundra";
    if (moisture > 0.8 && temperature > 0.6) return "tropical_rainforest";
    if (moisture > 0.6 && temperature > 0.4) return "temperate_forest";
    if (moisture > 0.7 && elevation < 0.35) return "wetland";
    if (moisture < 0.2) return "desert";
    return "grassland";
  }

  private carveRivers(tiles: WorldTile[][], _seed: number): boolean {
    // River generation from high elevation to low
    let carved = false;
    for (let i = 0; i < 5; i++) {
      const startX = Math.floor(tiles[0].length * ((i + 1) / 6));
      let x = startX;
      let y = 0;
      while (y < tiles.length && x >= 0 && x < tiles[0].length) {
        if (tiles[y][x].elevation > 0.25) {
          tiles[y][x].biome = "river";
          carved = true;
        }
        y++;
        x += Math.random() > 0.5 ? 1 : -1;
      }
    }
    return carved;
  }

  private carveLakes(tiles: WorldTile[][], _seed: number): boolean {
    let carved = false;
    for (let i = 0; i < 3; i++) {
      const cx = Math.floor(tiles[0].length * ((i + 1) / 4));
      const cy = Math.floor(tiles.length * 0.5 + i * 20);
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const ty = cy + dy;
          const tx = cx + dx;
          if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
            if (dx * dx + dy * dy <= 9) {
              tiles[ty][tx].biome = "lake";
              carved = true;
            }
          }
        }
      }
    }
    return carved;
  }
}
