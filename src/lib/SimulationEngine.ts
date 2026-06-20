import { eventBus } from "./EventBus";
import type { DisasterConfig, DisasterResult, Organism, Species, WorldMap } from "../types/simulation";

export class SimulationEngine {
  tick = 0;
  organisms: Organism[] = [];
  species: Map<string, Species> = new Map();
  worldMap: WorldMap | null = null;
  private activeDisasters: Map<string, { config: DisasterConfig; startTick: number; organismsKilled: number; speciesExtinct: number; biomesChanged: Set<string> }> = new Map();

  /** Process a user-triggered disaster from the EnvironmentPanel */
  triggerDisaster(config: DisasterConfig): void {
    const targetTile = this.worldMap?.tiles[config.y]?.[config.x];
    const targetBiome = targetTile?.biome ?? "unknown";

    // Count organisms and species in the impact zone
    let organismsInZone = 0;
    const speciesInZone = new Set<string>();
    for (const org of this.organisms) {
      const dx = org.x - config.x;
      const dy = org.y - config.y;
      if (dx * dx + dy * dy <= config.radius * config.radius) {
        organismsInZone++;
        speciesInZone.add(org.speciesId);
      }
    }

    // Pendo Track Event: disaster_triggered
    pendo.track("disaster_triggered", {
      disasterType: config.type,
      locationX: config.x,
      locationY: config.y,
      targetBiome,
      affectedAreaRadius: config.radius,
      organismsInImpactZone: organismsInZone,
      speciesInImpactZone: speciesInZone.size,
      simulationTick: this.tick,
    });

    eventBus.emit("disaster:triggered", config);

    // Register active disaster for resolution tracking
    this.activeDisasters.set(`${config.type}-${this.tick}`, {
      config,
      startTick: this.tick,
      organismsKilled: 0,
      speciesExtinct: 0,
      biomesChanged: new Set(),
    });

    this.processDisasterEffects(config);
  }

  /** Apply immediate disaster effects to organisms and terrain */
  private processDisasterEffects(config: DisasterConfig): void {
    const disasterKey = `${config.type}-${this.tick}`;
    const record = this.activeDisasters.get(disasterKey);

    const survivors: Organism[] = [];
    for (const org of this.organisms) {
      const dx = org.x - config.x;
      const dy = org.y - config.y;
      const inZone = dx * dx + dy * dy <= config.radius * config.radius;
      if (inZone && Math.random() < 0.7) {
        // Organism killed by disaster
        if (record) record.organismsKilled++;
        const sp = this.species.get(org.speciesId);
        if (sp) {
          sp.population--;
          if (sp.population <= 0) {
            this.handleExtinction(sp, "disaster");
            if (record) record.speciesExtinct++;
          }
        }
      } else {
        survivors.push(org);
      }
    }
    this.organisms = survivors;

    // Alter biomes in impact zone
    if (this.worldMap && record) {
      for (let dy = -config.radius; dy <= config.radius; dy++) {
        for (let dx = -config.radius; dx <= config.radius; dx++) {
          if (dx * dx + dy * dy <= config.radius * config.radius) {
            const ty = config.y + dy;
            const tx = config.x + dx;
            const tile = this.worldMap.tiles[ty]?.[tx];
            if (tile) {
              record.biomesChanged.add(tile.biome);
            }
          }
        }
      }
    }

    this.resolveDisaster(disasterKey);
  }

  /** Resolve a disaster after its effects are fully processed */
  private resolveDisaster(disasterKey: string): void {
    const record = this.activeDisasters.get(disasterKey);
    if (!record) return;

    const result: DisasterResult = {
      type: record.config.type,
      totalOrganismsKilled: record.organismsKilled,
      speciesExtinctionsCaused: record.speciesExtinct,
      biomesAltered: record.biomesChanged.size,
      impactAreaFinal: record.config.radius,
      durationTicks: this.tick - record.startTick,
      startTick: record.startTick,
    };

    // Pendo Track Event: disaster_impact_resolved
    pendo.track("disaster_impact_resolved", {
      disasterType: result.type,
      totalOrganismsKilled: result.totalOrganismsKilled,
      speciesExtinctionsCaused: result.speciesExtinctionsCaused,
      biomesAltered: result.biomesAltered,
      impactAreaFinal: result.impactAreaFinal,
      durationTicks: result.durationTicks,
      simulationTick: this.tick,
    });

    eventBus.emit("disaster:resolved", result);
    this.activeDisasters.delete(disasterKey);
  }

  /** Handle a species going extinct */
  private handleExtinction(species: Species, cause: string): void {
    const lifespanTicks = this.tick - species.spawnTick;
    const biomesOccupied = species.preferredBiomes.length;
    const totalSpeciesRemaining = this.species.size - 1;

    // Pendo Track Event: species_extinction
    pendo.track("species_extinction", {
      speciesName: species.name,
      speciesId: species.id,
      extinctionCause: cause,
      peakPopulation: species.peakPopulation,
      lifespanTicks,
      biomesOccupied,
      simulationTick: this.tick,
      totalSpeciesRemaining,
    });

    eventBus.emit("species:extinct", species, cause);
    this.species.delete(species.id);
  }

  /** Check all species for extinction during a tick */
  checkExtinctions(): void {
    for (const [, species] of this.species) {
      if (species.population <= 0) {
        this.handleExtinction(species, "natural");
      }
    }
  }

  /** Add an organism to the simulation */
  addOrganism(organism: Organism): void {
    this.organisms.push(organism);
    const sp = this.species.get(organism.speciesId);
    if (sp) {
      sp.population++;
      if (sp.population > sp.peakPopulation) {
        sp.peakPopulation = sp.population;
      }
    }
  }

  /** Register a new species */
  registerSpecies(species: Species): void {
    this.species.set(species.id, species);
  }
}
