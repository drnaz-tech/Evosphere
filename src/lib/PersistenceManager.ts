import { eventBus } from "./EventBus";
import type { SaveData } from "../types/simulation";

export class PersistenceManager {
  private storageKey = "evosphere-save";

  /** Save the current simulation state */
  save(
    saveMethod: "manual" | "autosave",
    state: { tick: number; seed: number; speciesCount: number; organismCount: number },
  ): void {
    const saveData: SaveData = {
      version: "1.0",
      timestamp: Date.now(),
      seed: state.seed,
      tick: state.tick,
      speciesCount: state.speciesCount,
      organismCount: state.organismCount,
      serialized: JSON.stringify(state),
    };

    const serialized = JSON.stringify(saveData);
    localStorage.setItem(this.storageKey, serialized);

    const saveFileSizeBytes = new Blob([serialized]).size;

    // Pendo Track Event: simulation_saved
    pendo.track("simulation_saved", {
      saveMethod,
      worldAge: state.tick,
      totalSpeciesCount: state.speciesCount,
      totalOrganismCount: state.organismCount,
      worldSeed: state.seed,
      saveFileSizeBytes,
      simulationTick: state.tick,
    });

    eventBus.emit("persistence:saved", saveData);
  }

  /** Load a previously saved simulation state */
  load(): SaveData | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return null;

    const saveData: SaveData = JSON.parse(raw);
    const saveFileSizeBytes = new Blob([raw]).size;
    const timeSinceLastSave = Date.now() - saveData.timestamp;

    // Pendo Track Event: simulation_loaded
    pendo.track("simulation_loaded", {
      worldSeed: saveData.seed,
      worldAge: saveData.tick,
      totalSpeciesCount: saveData.speciesCount,
      totalOrganismCount: saveData.organismCount,
      saveFileSizeBytes,
      timeSinceLastSave,
      simulationTick: saveData.tick,
    });

    eventBus.emit("persistence:loaded", saveData);

    return saveData;
  }

  /** Check if a save exists */
  hasSave(): boolean {
    return localStorage.getItem(this.storageKey) !== null;
  }
}
