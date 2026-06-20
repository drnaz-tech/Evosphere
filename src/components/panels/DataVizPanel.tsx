import React, { useCallback, useState } from "react";

type ChartType = "population" | "diversity" | "biomass";
type ExportFormat = "csv" | "json" | "png";

interface DataPoint {
  tick: number;
  value: number;
  label: string;
}

interface DataVizPanelProps {
  data: DataPoint[];
  speciesNames: string[];
  currentTick: number;
}

export const DataVizPanel: React.FC<DataVizPanelProps> = ({ data, speciesNames, currentTick }) => {
  const [chartType, setChartType] = useState<ChartType>("population");
  const [timeRange, setTimeRange] = useState(currentTick);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      const filteredData = data.filter((d) => d.tick <= timeRange);

      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === "csv") {
        const header = "tick,value,label";
        const rows = filteredData.map((d) => `${d.tick},${d.value},${d.label}`);
        content = [header, ...rows].join("\n");
        mimeType = "text/csv";
        extension = "csv";
      } else if (format === "json") {
        content = JSON.stringify(filteredData, null, 2);
        mimeType = "application/json";
        extension = "json";
      } else {
        // PNG export handled separately
        content = "";
        mimeType = "image/png";
        extension = "png";
      }

      if (content) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `evosphere-${chartType}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
      }

      // Pendo Track Event: data_visualization_exported
      pendo.track("data_visualization_exported", {
        chartType,
        dataFormat: format,
        timeRangeTicks: timeRange,
        speciesIncluded: speciesNames.length,
        dataPointCount: filteredData.length,
      });
    },
    [chartType, data, timeRange, speciesNames],
  );

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">Data Visualization</h3>
        <div className="flex gap-1">
          <button onClick={() => handleExport("csv")} className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">
            CSV
          </button>
          <button onClick={() => handleExport("json")} className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">
            JSON
          </button>
          <button onClick={() => handleExport("png")} className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">
            PNG
          </button>
        </div>
      </div>
      <div className="flex gap-2 mb-2">
        <select
          value={chartType}
          onChange={(e) => setChartType(e.target.value as ChartType)}
          className="bg-gray-800 rounded px-2 py-1 text-sm"
        >
          <option value="population">Population</option>
          <option value="diversity">Species Diversity</option>
          <option value="biomass">Biomass</option>
        </select>
        <input
          type="range"
          min={0}
          max={currentTick}
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="flex-1"
        />
      </div>
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Chart: {chartType} ({data.filter((d) => d.tick <= timeRange).length} points)
      </div>
    </div>
  );
};
