import { SearchIcon, XIcon } from "lucide-react";

interface EventsSearchBarProps {
  searchQuery: string;
  resultsCount: number;
  onClear: () => void;
}

export function EventsSearchBar({
  searchQuery,
  resultsCount,
  onClear,
}: EventsSearchBarProps) {
  return (
    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center">
            <SearchIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-semibold text-primary/80">
                Search results for:
              </span>
              <span className="text-sm font-bold text-primary bg-primary/20 px-3 py-0.5 rounded-full">
                &quot;{searchQuery}&quot;
              </span>
            </div>
            <p className="text-xs text-primary/70 font-medium">
              Found {resultsCount} event{resultsCount !== 1 ? "s" : ""} matching your search
            </p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="w-9 h-9 bg-primary/10 hover:bg-primary/25 rounded-full flex items-center justify-center transition-colors text-primary active:scale-90 cursor-pointer"
          title="Clear search"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}