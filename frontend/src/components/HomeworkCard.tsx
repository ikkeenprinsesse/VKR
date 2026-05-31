import { Clock, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Homework } from "@/api/homework";
import { cn } from "@/lib/utils";

interface HomeworkCardProps {
  hw: Homework;
  answeredStatus?: "draft" | "submitted" | "graded" | "overdue" | null;
  score?: number | null;
  maxScore?: number;
  onClick?: () => void;
}

function formatDeadline(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const hours = Math.floor(diff / 1000 / 60 / 60);
  if (diff < 0) return { text: "Просрочено", urgent: true };
  if (hours < 24) return { text: `Осталось ${hours} ч`, urgent: true };
  return {
    text: d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    urgent: false,
  };
}

export default function HomeworkCard({ hw, answeredStatus, score, maxScore, onClick }: HomeworkCardProps) {
  const dl = formatDeadline(hw.deadline);

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border transition-colors",
        onClick ? "cursor-pointer hover:border-primary/30" : "",
        dl.urgent && !answeredStatus ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 mt-0.5">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 line-clamp-2 mb-1">{hw.description}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={cn("flex items-center gap-1", dl.urgent ? "text-amber-600" : "text-gray-500")}>
              {dl.urgent ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {dl.text}
            </span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">Макс. {hw.max_score} б</span>

            {answeredStatus === "graded" && score != null && (
              <>
                <span className="text-gray-400">·</span>
                <Badge variant="success">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {score}/{maxScore ?? hw.max_score} б
                </Badge>
              </>
            )}
            {answeredStatus === "submitted" && (
              <Badge variant="default">На проверке</Badge>
            )}
            {answeredStatus === "overdue" && (
              <Badge variant="danger">Просрочено</Badge>
            )}
            {!answeredStatus && (
              <Badge variant="warning">Не сдано</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
