import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-10 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-gray-700" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
