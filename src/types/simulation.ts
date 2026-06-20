export interface WorldTile {
  elevation: number;
  moisture: number;
  temperature: number;
  biome: string;
}

export interface WorldMap {
  width: number;
  height: number;
  tiles: WorldTile[][];
  seed: number;
  biomes: string[];
  hasRivers: boolean;
  hasLakes: boolean;
}

export interface Organism {
  id: string;
  speciesId: string;
  speciesName: string;
  x: number;
  y: number;
  state: "idle" | "eating" | "hunting" | "fleeing" | "mating";
  genes: Record<string, number>;
}

export interface Species {
  id: string;
  name: string;
  diet: "herbivore" | "carnivore" | "omnivore";
  preferredBiomes: string[];
  population: number;
  peakPopulation: number;
  spawnTick: number;
  parentSpeciesId?: string;
}

export interface DisasterConfig {
  type: "volcano" | "meteor" | "wildfire" | "flood" | "epidemic" | "glaciation";
  x: number;
  y: number;
  radius: number;
}

export interface DisasterResult {
  type: string;
  totalOrganismsKilled: number;
  speciesExtinctionsCaused: number;
  biomesAltered: number;
  impactAreaFinal: number;
  durationTicks: number;
  startTick: number;
}

export interface ClimateState {
  temperature: number;
  moisture: number;
  co2Level: number;
}

export interface EpidemicRecord {
  diseaseName: string;
  startTick: number;
  durationTicks: number;
  totalMortality: number;
  speciesAffected: number;
  biomesAffected: number;
  peakInfectionRate: number;
  survivorCount: number;
}

export interface LogEntry {
  id: string;
  type: "extinction" | "speciation" | "disaster" | "climate" | "placement";
  message: string;
  tick: number;
  timestamp: number;
  x?: number;
  y?: number;
  metadata: Record<string, unknown>;
}

export interface SaveData {
  version: string;
  timestamp: number;
  seed: number;
  tick: number;
  speciesCount: number;
  organismCount: number;
  serialized: string;
}
