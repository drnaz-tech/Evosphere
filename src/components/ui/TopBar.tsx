import React, { useCallback, useState } from "react";

interface SimState {
  tick: number;
  organismCount: number;
  timeOfDay: string;
  zoomLevel: number;
  visibleBiomes: string[];
}

interface TopBarProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  simState: SimState;
}

export const TopBar: React.FC<TopBarProps> = ({ canvasRef, simState }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;

      // Initiate download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evosphere-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);

      // Pendo Track Event: screenshot_captured
      pendo.track("screenshot_captured", {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        zoomLevel: simState.zoomLevel,
        timeOfDay: simState.timeOfDay,
        simulationTick: simState.tick,
        visibleBiomes: simState.visibleBiomes.join(","),
        organismCount: simState.organismCount,
      });
    });
  }, [canvasRef, simState]);

  const handleSettingsUpdate = useCallback(
    (settingName: string, previousValue: string | number | boolean, newValue: string | number | boolean, category: string) => {
      // Pendo Track Event: simulation_settings_updated
      pendo.track("simulation_settings_updated", {
        settingName,
        previousValue: String(previousValue),
        newValue: String(newValue),
        settingsCategory: category,
      });
    },
    [],
  );

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white">
      <span className="font-bold">EvoSphere</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Tick: {simState.tick}</span>
        <button onClick={handleScreenshot} title="Screenshot" className="p-1 hover:bg-gray-700 rounded">
          📷
        </button>
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          title="Settings"
          className="p-1 hover:bg-gray-700 rounded"
        >
          ⚙️
        </button>
      </div>
      {settingsOpen && <SettingsDialog onUpdate={handleSettingsUpdate} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
};

interface SettingsDialogProps {
  onUpdate: (name: string, prev: string | number | boolean, next: string | number | boolean, category: string) => void;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ onUpdate, onClose }) => {
  const [speed, setSpeed] = useState(1);
  const [sound, setSound] = useState(true);

  return (
    <div className="absolute top-12 right-4 bg-gray-800 p-4 rounded shadow-lg z-50">
      <h3 className="font-bold mb-2">Settings</h3>
      <label className="block mb-2">
        Speed:
        <select
          value={speed}
          onChange={(e) => {
            const prev = speed;
            const next = Number(e.target.value);
            setSpeed(next);
            onUpdate("speed", prev, next, "simulation");
          }}
          className="ml-2 bg-gray-700 rounded px-2"
        >
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={5}>5x</option>
        </select>
      </label>
      <label className="block mb-2">
        Sound:
        <input
          type="checkbox"
          checked={sound}
          onChange={(e) => {
            const prev = sound;
            const next = e.target.checked;
            setSound(next);
            onUpdate("sound", prev, next, "audio");
          }}
          className="ml-2"
        />
      </label>
      <button onClick={onClose} className="mt-2 px-3 py-1 bg-gray-600 rounded hover:bg-gray-500">
        Close
      </button>
    </div>
  );
};
