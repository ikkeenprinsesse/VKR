import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorBanner({ error, onRetry, className }: Props) {
  return (
    <div className={cn(
      "flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600",
      className
    )}>
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{error}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 font-bold hover:text-red-700 transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Повторить
        </button>
      )}
    </div>
  );
}
