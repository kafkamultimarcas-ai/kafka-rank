import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthNavigatorProps {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  compact?: boolean;
}

export function MonthNavigator({
  label,
  onPrevious,
  onNext,
  compact = false,
}: MonthNavigatorProps) {
  const buttonClass = compact
    ? "rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800"
    : "rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800";

  return (
    <div className={`flex items-center justify-between rounded-2xl border border-gray-800 bg-gray-900/80 ${compact ? "p-2" : "p-3"}`}>
      <button onClick={onPrevious} className={buttonClass}>
        <ChevronLeft className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </button>
      <div className="text-center">
        <p className={`font-bold text-white ${compact ? "text-sm" : "text-lg"}`}>{label}</p>
      </div>
      <button onClick={onNext} className={buttonClass}>
        <ChevronRight className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </button>
    </div>
  );
}
