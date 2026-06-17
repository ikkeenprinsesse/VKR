import { useState } from "react";
import { X, Loader2, Wallet, Info, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/api/yoomoney";
import { useAuthStore } from "@/store/auth";
import { getMe } from "@/api/auth";

interface Props {
  onClose: () => void;
}

export default function TutorSettingsModal({ onClose }: Props) {
  const { user, setUser } = useAuthStore();

  const [wallet, setWallet]         = useState(user?.yoomoney_wallet ?? "");
  const [secret, setSecret]         = useState("");
  const [price, setPrice]           = useState(
    user?.default_lesson_price != null ? String(user.default_lesson_price) : ""
  );
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await updateSettings({
        yoomoney_wallet: wallet || undefined,
        yoomoney_secret: secret || undefined,
        default_lesson_price: price ? Number(price) : undefined,
      });
      // обновляем стейт
      const me = await getMe();
      setUser(me);
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900">Настройки оплаты</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
          {/* Wallet */}
          <div className="space-y-1.5">
            <Label htmlFor="wallet">Номер кошелька ЮMoney</Label>
            <Input
              id="wallet"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="410011XXXXXXXXX"
            />
            <p className="text-xs text-gray-400">
              Найти номер: профиль на{" "}
              <a href="https://yoomoney.ru" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                yoomoney.ru
              </a>{" "}
              → «Номер счёта»
            </p>
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <Label htmlFor="price">Цена занятия по умолчанию (₽)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="50"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="1500"
            />
            <p className="text-xs text-gray-400">
              Будет автоматически подставляться при генерации ссылки на оплату
            </p>
          </div>

          {/* Secret */}
          <div className="space-y-1.5">
            <Label htmlFor="secret">Секрет для вебхука (необязательно)</Label>
            <div className="relative">
              <Input
                id="secret"
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Оставьте пустым, если не настраиваете вебхук"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Webhook info */}
          <div className="flex gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Как настроить автоматическую отметку оплаты:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
                <li>Войдите на yoomoney.ru → Настройки → Уведомления</li>
                <li>Включите HTTP-уведомления</li>
                <li>
                  URL:{" "}
                  <span className="font-mono bg-blue-100 px-1 rounded">
                    {window.location.origin}/yoomoney/webhook
                  </span>
                </li>
                <li>Придумайте секрет и вставьте его в поле выше</li>
              </ol>
              <p className="text-blue-500 mt-1">
                Без вебхука платежи нужно отмечать вручную в разделе «Финансы».
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : saved
                  ? "✓ Сохранено"
                  : null
              }
              {!loading && !saved && "Сохранить"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
