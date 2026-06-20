import { eventBus } from "./EventBus";
import type { ClimateState } from "../types/simulation";

const SIGNIFICANT_CHANGE_THRESHOLD = 0.1;

export class ClimateSystem {
  state: ClimateState = {
    temperature: 0.5,
    moisture: 0.5,
    co2Level: 0.3,
  };

  /** Advance climate simulation by one tick */
  update(tick: number, speciesCount: number): void {
    const previousState = { ...this.state };

    // Gradual climate drift over deep time
    this.state.temperature += (Math.random() - 0.5) * 0.002;
    this.state.moisture += (Math.random() - 0.5) * 0.001;
    this.state.co2Level += (Math.random() - 0.48) * 0.001;

    // Clamp values
    this.state.temperature = Math.max(0, Math.min(1, this.state.temperature));
    this.state.moisture = Math.max(0, Math.min(1, this.state.moisture));
    this.state.co2Level = Math.max(0, Math.min(1, this.state.co2Level));

    // Check each climate variable for significant shifts
    this.checkShift("temperature", previousState.temperature, this.state.temperature, tick, speciesCount);
    this.checkShift("moisture", previousState.moisture, this.state.moisture, tick, speciesCount);
    this.checkShift("co2Level", previousState.co2Level, this.state.co2Level, tick, speciesCount);
  }

  private checkShift(
    variable: string,
    previousValue: number,
    newValue: number,
    tick: number,
    speciesCount: number,
  ): void {
    const changeMagnitude = Math.abs(newValue - previousValue);
    if (changeMagnitude < SIGNIFICANT_CHANGE_THRESHOLD) return;

    // Estimate affected biomes based on the variable
    const affectedBiomes = this.estimateAffectedBiomes(variable, changeMagnitude);

    // Pendo Track Event: climate_shift_occurred
    pendo.track("climate_shift_occurred", {
      climateVariable: variable,
      previousValue: Math.round(previousValue * 1000) / 1000,
      newValue: Math.round(newValue * 1000) / 1000,
      changeMagnitude: Math.round(changeMagnitude * 1000) / 1000,
      affectedBiomes: affectedBiomes.join(","),
      affectedSpeciesCount: speciesCount,
      simulationTick: tick,
    });

    eventBus.emit("climate:shift", { variable, previousValue, newValue, changeMagnitude });
  }

  private estimateAffectedBiomes(variable: string, magnitude: number): string[] {
    const biomes: string[] = [];
    if (variable === "temperature") {
      if (magnitude > 0.15) biomes.push("tundra", "alpine", "desert");
      biomes.push("grassland", "temperate_forest");
    } else if (variable === "moisture") {
      biomes.push("desert", "wetland", "tropical_rainforest");
    } else {
      biomes.push("deep_ocean", "coastal");
    }
    return biomes;
  }
}
