import { Search } from "lucide-react";
import { VehicleCombobox } from "@/components/VehicleCombobox";
import type { ContasFilter, ContasTypeFilter } from "@/features/financeiro/contas/useContasState";

const STATUS_ACTIVE_CLASS: Record<string, string> = {
  gray: "bg-gray-500/30 text-gray-200 ring-1 ring-gray-500/40",
  red: "bg-red-500/30 text-red-400 ring-1 ring-red-500/50",
  amber: "bg-amber-500/30 text-amber-400 ring-1 ring-amber-500/50",
  emerald: "bg-emerald-500/30 text-emerald-400 ring-1 ring-emerald-500/50",
  purple: "bg-purple-500/30 text-purple-400 ring-1 ring-purple-500/50",
};

interface ContasFiltersProps {
  statusOptions: Array<{ key: string; label: string; count: number; color: string }>;
  typeOptions: ReadonlyArray<{ key: string; label: string; icon: any }>;
  filter: ContasFilter;
  onFilterChange: (filter: ContasFilter) => void;
  typeFilter: ContasTypeFilter;
  onTypeFilterChange: (filter: ContasTypeFilter) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterVehicle: string;
  onVehicleFilterChange: (value: string) => void;
  showSearchOnly?: boolean;
}

export function ContasFilters({
  statusOptions,
  typeOptions,
  filter,
  onFilterChange,
  typeFilter,
  onTypeFilterChange,
  searchQuery,
  onSearchChange,
  filterVehicle,
  onVehicleFilterChange,
  showSearchOnly = false,
}: ContasFiltersProps) {
  return (
    <>
      {!showSearchOnly && (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {statusOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => onFilterChange(filter === option.key ? "all" : (option.key as ContasFilter))}
                className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${
                  filter === option.key
                    ? STATUS_ACTIVE_CLASS[option.color]
                    : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
                }`}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>

          <div className="flex gap-1.5">
            {typeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.key}
                  onClick={() => onTypeFilterChange(typeFilter === option.key ? "all" : (option.key as ContasTypeFilter))}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-bold transition-all ${
                    typeFilter === option.key ? "bg-gray-700 text-white" : "bg-gray-800/50 text-gray-500"
                  }`}
                >
                  <Icon className="h-3 w-3" /> {option.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por descrição, fornecedor, veículo..."
          className="w-full rounded-xl border border-gray-800 bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Filtrar por veículo</label>
        <VehicleCombobox
          value={filterVehicle}
          onChange={onVehicleFilterChange}
          placeholder="Todos os veículos"
        />
      </div>
    </>
  );
}
