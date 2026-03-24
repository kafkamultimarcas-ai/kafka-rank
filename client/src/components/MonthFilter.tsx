import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface MonthFilterProps {
  month: number; // 0-11
  year: number;
  onChange: (month: number, year: number) => void;
  showAll?: boolean;
  isAll?: boolean;
  onToggleAll?: () => void;
}

export default function MonthFilter({ month, year, onChange, showAll, isAll, onToggleAll }: MonthFilterProps) {
  const prevMonth = () => {
    if (month === 0) onChange(11, year - 1);
    else onChange(month - 1, year);
  };
  const nextMonth = () => {
    if (month === 11) onChange(0, year + 1);
    else onChange(month + 1, year);
  };
  const goToCurrentMonth = () => {
    const now = new Date();
    onChange(now.getMonth(), now.getFullYear());
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg px-1 py-1">
        <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={goToCurrentMonth} className="px-3 py-1 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 min-w-[140px] justify-center">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          {isAll ? "Todos os meses" : `${MONTH_NAMES[month]} ${year}`}
        </button>
        <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {showAll && onToggleAll && (
        <button
          onClick={onToggleAll}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isAll
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {isAll ? "Filtrando: Todos" : "Ver Todos"}
        </button>
      )}
    </div>
  );
}

// Helper: filtra array por mês/ano baseado em campo de data (timestamp ou Date string)
export function filterByMonth<T>(items: T[], month: number, year: number, dateField: keyof T): T[] {
  return items.filter(item => {
    const val = item[dateField];
    if (!val) return false;
    const d = new Date(val as any);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}
