import React, { useCallback, useMemo, useState } from "react";
import type { LogEntry } from "../../types/simulation";

interface LogsPanelProps {
  entries: LogEntry[];
}

type EventCategory = "all" | "extinction" | "speciation" | "disaster" | "climate" | "placement";

export const LogsPanel: React.FC<LogsPanelProps> = ({ entries }) => {
  const [filterType, setFilterType] = useState<EventCategory>("all");
  const [searchText, setSearchText] = useState("");

  const filteredEntries = useMemo(() => {
    let results = entries;
    if (filterType !== "all") {
      results = results.filter((e) => e.type === filterType);
    }
    if (searchText) {
      const lower = searchText.toLowerCase();
      results = results.filter((e) => e.message.toLowerCase().includes(lower));
    }
    return results;
  }, [entries, filterType, searchText]);

  const handleFilterChange = useCallback(
    (newFilterType: EventCategory, newSearchText: string) => {
      const results = entries.filter((e) => {
        if (newFilterType !== "all" && e.type !== newFilterType) return false;
        if (newSearchText) {
          return e.message.toLowerCase().includes(newSearchText.toLowerCase());
        }
        return true;
      });

      // Pendo Track Event: event_log_filtered
      pendo.track("event_log_filtered", {
        filterType: newFilterType,
        filterValues: newSearchText || "none",
        eventCategory: newFilterType,
        dateRange: "all",
        resultsCount: results.length,
        totalEventsCount: entries.length,
      });
    },
    [entries],
  );

  const onFilterTypeChange = useCallback(
    (category: EventCategory) => {
      setFilterType(category);
      handleFilterChange(category, searchText);
    },
    [handleFilterChange, searchText],
  );

  const onSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      handleFilterChange(filterType, text);
    },
    [handleFilterChange, filterType],
  );

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-2">
      <h3 className="font-bold mb-2">Event Log</h3>
      <div className="flex gap-2 mb-2">
        <select
          value={filterType}
          onChange={(e) => onFilterTypeChange(e.target.value as EventCategory)}
          className="bg-gray-800 rounded px-2 py-1 text-sm"
        >
          <option value="all">All Events</option>
          <option value="extinction">Extinctions</option>
          <option value="speciation">Speciations</option>
          <option value="disaster">Disasters</option>
          <option value="climate">Climate</option>
          <option value="placement">Placements</option>
        </select>
        <input
          type="text"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
          className="bg-gray-800 rounded px-2 py-1 text-sm flex-1"
        />
      </div>
      <div className="flex-1 overflow-y-auto text-sm">
        {filteredEntries.map((entry) => (
          <div key={entry.id} className="py-1 border-b border-gray-800">
            <span className="text-gray-400 mr-2">[{entry.tick}]</span>
            <span>{entry.message}</span>
          </div>
        ))}
        {filteredEntries.length === 0 && <div className="text-gray-500 mt-4 text-center">No events match filter</div>}
      </div>
    </div>
  );
};
