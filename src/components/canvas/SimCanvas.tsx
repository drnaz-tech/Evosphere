import React, { useCallback, useRef } from "react";

interface CatalogSpecies {
  id: string;
  name: string;
  diet: "herbivore" | "carnivore" | "omnivore";
  preferredBiomes: string[];
  initialPopulation: number;
}

interface SimCanvasProps {
  selectedSpecies: CatalogSpecies | null;
  worldWidth: number;
  worldHeight: number;
  getBiomeAt: (x: number, y: number) => string;
  onSpeciesPlaced: (speciesId: string, x: number, y: number) => void;
}

export const SimCanvas: React.FC<SimCanvasProps> = ({
  selectedSpecies,
  worldWidth,
  worldHeight,
  getBiomeAt,
  onSpeciesPlaced,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!selectedSpecies) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const locationX = Math.floor(((e.clientX - rect.left) / rect.width) * worldWidth);
      const locationY = Math.floor(((e.clientY - rect.top) / rect.height) * worldHeight);
      const targetBiome = getBiomeAt(locationX, locationY);
      const isNativeToBiome = selectedSpecies.preferredBiomes.includes(targetBiome);

      // Pendo Track Event: species_placed
      pendo.track("species_placed", {
        speciesName: selectedSpecies.name,
        speciesId: selectedSpecies.id,
        dietType: selectedSpecies.diet,
        targetBiome,
        locationX,
        locationY,
        isNativeToBiome,
        initialPopulation: selectedSpecies.initialPopulation,
      });

      onSpeciesPlaced(selectedSpecies.id, locationX, locationY);
    },
    [selectedSpecies, worldWidth, worldHeight, getBiomeAt, onSpeciesPlaced],
  );

  return (
    <div
      ref={canvasRef}
      onClick={handleCanvasClick}
      style={{ width: "100%", height: "100%", cursor: selectedSpecies ? "crosshair" : "default" }}
    />
  );
};
