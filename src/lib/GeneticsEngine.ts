import { eventBus } from "./EventBus";
import type { Organism, Species } from "../types/simulation";

interface MutationResult {
  gene: string;
  originalValue: number;
  mutatedValue: number;
  type: string;
}

interface SpeciationResult {
  parentSpecies: Species;
  newSpecies: Species;
  mutations: MutationResult[];
  divergence: number;
  biomeOfOrigin: string;
}

const DIVERGENCE_THRESHOLD = 0.35;

export class GeneticsEngine {
  /** Process mutations for an organism during reproduction */
  mutate(organism: Organism, parentSpecies: Species): MutationResult[] {
    const mutations: MutationResult[] = [];
    for (const [gene, value] of Object.entries(organism.genes)) {
      if (Math.random() < 0.05) {
        const delta = (Math.random() - 0.5) * 0.2;
        const mutatedValue = Math.max(0, Math.min(1, value + delta));
        organism.genes[gene] = mutatedValue;
        mutations.push({
          gene,
          originalValue: value,
          mutatedValue,
          type: delta > 0 ? "gain" : "loss",
        });
      }
    }
    return mutations;
  }

  /** Check if accumulated mutations cause speciation */
  checkSpeciation(
    organism: Organism,
    parentSpecies: Species,
    mutations: MutationResult[],
    allSpecies: Map<string, Species>,
    tick: number,
  ): SpeciationResult | null {
    // Calculate genetic divergence from parent species baseline
    let totalDivergence = 0;
    let geneCount = 0;
    for (const value of Object.values(organism.genes)) {
      totalDivergence += Math.abs(value - 0.5);
      geneCount++;
    }
    const divergence = geneCount > 0 ? totalDivergence / geneCount : 0;

    if (divergence < DIVERGENCE_THRESHOLD) return null;

    // Speciation threshold crossed — create a new species
    const newSpecies: Species = {
      id: `species-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${parentSpecies.name} (variant)`,
      diet: parentSpecies.diet,
      preferredBiomes: [...parentSpecies.preferredBiomes],
      population: 1,
      peakPopulation: 1,
      spawnTick: tick,
      parentSpeciesId: parentSpecies.id,
    };

    const biomeOfOrigin = this.getBiomeAt(organism.x, organism.y);
    const mutationTypes = [...new Set(mutations.map((m) => m.type))].join(",");

    // Pendo Track Event: speciation_event
    pendo.track("speciation_event", {
      parentSpeciesName: parentSpecies.name,
      newSpeciesName: newSpecies.name,
      mutationTypes,
      geneticDivergence: Math.round(divergence * 1000) / 1000,
      biomeOfOrigin,
      simulationTick: tick,
      totalSpeciesCount: allSpecies.size + 1,
    });

    eventBus.emit("species:speciation", { parentSpecies, newSpecies });

    return {
      parentSpecies,
      newSpecies,
      mutations,
      divergence,
      biomeOfOrigin,
    };
  }

  private getBiomeAt(_x: number, _y: number): string {
    // In the full implementation, this queries the WorldMap
    return "unknown";
  }
}
