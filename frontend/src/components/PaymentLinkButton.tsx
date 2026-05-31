import { useState } from "react";
import { CreditCard, Copy, Check, ExternalLink, Loader2, X, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPaymentLink } from "@/api/yoomoney";
import type { Lesson } from "@/api/lessons";
import { cn } from "@/lib/utils";

interface Props {
  lesson: Lesson;
  defaultPrice?: number | null;
  tutorHasWallet?: boolean;
  /** compact — только иконка-кнопка без текста */
  compact?: boolean;
}

export default function PaymentLinkButton({ lesson, defaultPrice, tutorHasWallet = true, compact }: Props) {
  const [open, setOpen]     = useState(false);
  const [amount, setAmount] = useState(defaultPrice?.toString() ?? "");
  const [link, setLink]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function generate() {
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getPaymentLink(lesson.id, Number(amount));
      setLink(result.url);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Не удалось создать ссылку");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setLink(null);
    setError(null);
  }

  if (!tutorHasWallet) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Wallet className="w-3.5 h-3.5" />
        <span>Кошелёк не настроен</span>
      </div>
    );
  }

  return (
    <>
      {compact ? (
        <button
          onClick={() => setOpen(true)}
          title="Оплатить через ЮMoney"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50 text-primary hover:bg-violet-100 transition-colors"
        >
          <CreditCard className="w-4 h-4" />
        </button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary/30 text-primary hover:bg-violet-50"
          onClick={() => setOpen(true)}
        >
          <CreditCard className="w-4 h-4" />
          Оплатить
        </Button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setOpen(false); reset(); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Оплата занятия</p>
                  <p className="text-xs text-gray-400">{lesson.topic ?? "Занятие"} · {lesson.duration} мин</p>
                </div>
              </div>
              <button
                onClick={() => { setOpen(false); reset(); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4">
              {!link ? (
                <>
                  <div className="space-y-1.5 mb-4">
                    <label className="text-sm font-medium text-gray-700">Сумма (₽)</label>
                    <Input
                      type="number"
                      min="1"
                      step="50"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="1500"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive bg-red-50 rounded-xl px-3 py-2 mb-4">{error}</p>
                  )}

                  <Button
                    onClick={generate}
                    className="w-full gap-2"
                    disabled={loading || !amount || Number(amount) <= 0}
                  >
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <CreditCard className="w-4 h-4" />
                    }
                    Получить ссылку
                  </Button>
                </>
              ) : (
                <>
                  {/* Success state */}
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="font-semibold text-gray-900">Ссылка готова!</p>
                    <p className="text-sm text-gray-500 mt-0.5">Сумма: {Number(amount).toLocaleString("ru-RU")} ₽</p>
                  </div>

                  {/* Link box */}
                  <div className="flex gap-2 mb-4">
                    <input
                      readOnly
                      value={link}
                      className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-600 truncate focus:outline-none"
                    />
                    <button
                      onClick={copyLink}
                      className={cn(
                        "shrink-0 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                        copied
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Open button */}
                  <a href={link} target="_blank" rel="noreferrer">
                    <Button className="w-full gap-2 mb-3">
                      <ExternalLink className="w-4 h-4" />
                      Перейти к оплате
                    </Button>
                  </a>

                  <button
                    onClick={reset}
                    className="w-full text-sm text-gray-400 hover:text-gray-600 text-center"
                  >
                    Изменить сумму
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
