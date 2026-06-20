import { eventBus } from "./EventBus";
import type { EpidemicRecord } from "../types/simulation";

interface ActiveEpidemic {
  diseaseName: string;
  startTick: number;
  infected: number;
  dead: number;
  peakInfected: number;
  speciesAffected: Set<string>;
  biomesAffected: Set<string>;
  resolved: boolean;
}

export class DiseaseEngine {
  private epidemics: Map<string, ActiveEpidemic> = new Map();

  /** Start a new epidemic */
  startEpidemic(diseaseName: string, tick: number, originBiome: string): void {
    this.epidemics.set(diseaseName, {
      diseaseName,
      startTick: tick,
      infected: 1,
      dead: 0,
      peakInfected: 1,
      speciesAffected: new Set(),
      biomesAffected: new Set([originBiome]),
      resolved: false,
    });
    eventBus.emit("disease:started", diseaseName);
  }

  /** Update epidemic spread for one tick */
  update(tick: number, totalOrganisms: number): void {
    for (const [name, epidemic] of this.epidemics) {
      if (epidemic.resolved) continue;

      // Spread simulation
      const spreadRate = 0.1 * (1 - epidemic.dead / Math.max(totalOrganisms, 1));
      const newInfected = Math.floor(epidemic.infected * spreadRate);
      epidemic.infected += newInfected;

      // Mortality
      const deaths = Math.floor(epidemic.infected * 0.05);
      epidemic.dead += deaths;
      epidemic.infected -= deaths;

      if (epidemic.infected > epidemic.peakInfected) {
        epidemic.peakInfected = epidemic.infected;
      }

      // Check if epidemic has run its course
      if (epidemic.infected <= 0 || spreadRate < 0.01) {
        this.resolveEpidemic(name, tick, totalOrganisms);
      }
    }
  }

  /** Resolve an epidemic and record final outcome */
  private resolveEpidemic(name: string, tick: number, totalOrganisms: number): void {
    const epidemic = this.epidemics.get(name);
    if (!epidemic || epidemic.resolved) return;

    epidemic.resolved = true;
    const durationTicks = tick - epidemic.startTick;
    const survivorCount = totalOrganisms - epidemic.dead;

    const record: EpidemicRecord = {
      diseaseName: epidemic.diseaseName,
      startTick: epidemic.startTick,
      durationTicks,
      totalMortality: epidemic.dead,
      speciesAffected: epidemic.speciesAffected.size,
      biomesAffected: epidemic.biomesAffected.size,
      peakInfectionRate: epidemic.peakInfected,
      survivorCount: Math.max(0, survivorCount),
    };

    // Pendo Track Event: epidemic_completed
    pendo.track("epidemic_completed", {
      diseaseName: record.diseaseName,
      durationTicks: record.durationTicks,
      totalMortality: record.totalMortality,
      speciesAffected: record.speciesAffected,
      biomesAffected: record.biomesAffected,
      peakInfectionRate: record.peakInfectionRate,
      survivorCount: record.survivorCount,
      simulationTick: tick,
    });

    eventBus.emit("disease:resolved", record);
    this.epidemics.delete(name);
  }

  /** Record that a species was affected by an active epidemic */
  addAffectedSpecies(diseaseName: string, speciesId: string): void {
    this.epidemics.get(diseaseName)?.speciesAffected.add(speciesId);
  }

  /** Record that an epidemic spread to a new biome */
  addAffectedBiome(diseaseName: string, biome: string): void {
    this.epidemics.get(diseaseName)?.biomesAffected.add(biome);
  }
}
