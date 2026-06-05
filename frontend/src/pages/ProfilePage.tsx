import { useState, useRef } from "react";
import { Camera, Loader2, Check, Eye, EyeOff, Info } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { updateProfile } from "@/api/users";
import { uploadHomeworkFile } from "@/api/homework";
import { getMe } from "@/api/auth";
import Sidebar from "@/components/Sidebar";
import { TUTOR_NAV, STUDENT_NAV } from "@/config/nav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  useCurrentUser();
  const { user, setUser } = useAuthStore();
  const isTutor = user?.role === "tutor";
  const nav = isTutor ? TUTOR_NAV : STUDENT_NAV;

  // ── form state ────────────────────────────────────────────────────────────
  const [name,     setName]     = useState(user?.name ?? "");
  const [subjects, setSubjects] = useState(user?.subjects ?? "");
  const [level,    setLevel]    = useState(user?.level ?? "");
  const [photo,    setPhoto]    = useState(user?.photo ?? "");

  // tutor-only payment fields
  const [wallet,      setWallet]      = useState(user?.yoomoney_wallet ?? "");
  const [secret,      setSecret]      = useState("");
  const [price,       setPrice]       = useState(
    user?.default_lesson_price != null ? String(user.default_lesson_price) : ""
  );
  const [showSecret,  setShowSecret]  = useState(false);

  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── avatar upload ──────────────────────────────────────────────────────────
  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadHomeworkFile(file);
      setPhoto(uploaded.url);
    } catch {
      setError("Не удалось загрузить фото");
    } finally {
      setUploading(false);
    }
  }

  // ── save ───────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Имя не может быть пустым"); return; }
    setError(null);
    setSaving(true);
    try {
      await updateProfile({
        name:                  name.trim(),
        subjects:              subjects.trim() || undefined,
        level:                 level.trim() || undefined,
        photo:                 photo || undefined,
        ...(isTutor && {
          yoomoney_wallet:     wallet.trim() || undefined,
          yoomoney_secret:     secret.trim() || undefined,
          default_lesson_price: price ? Number(price) : undefined,
        }),
      });
      const me = await getMe();
      setUser(me);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  const initials = (user?.name ?? "?")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={nav} />

      <main className="flex-1 overflow-y-auto p-6 max-w-2xl">
        <h1 className="text-2xl font-black text-gray-900 mb-6">Мой профиль</h1>

        <form onSubmit={handleSave} className="space-y-6">

          {/* ── Avatar ──────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Фото</h2>
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                {photo ? (
                  <img
                    src={photo}
                    alt={user?.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-violet-100 flex items-center justify-center text-3xl font-black text-violet-600 border-2 border-violet-200">
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-md hover:bg-violet-700 transition-colors disabled:opacity-60"
                >
                  {uploading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Camera className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">{user?.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{isTutor ? "Репетитор" : "Ученик"}</p>
                <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="mt-2 text-xs font-bold text-violet-600 hover:underline disabled:opacity-50"
                >
                  {uploading ? "Загрузка…" : photo ? "Сменить фото" : "Загрузить фото"}
                </button>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarPick}
            />
          </div>

          {/* ── Personal info ────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Личные данные</h2>

            <div className="space-y-1.5">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email ?? ""}
                disabled
                className="bg-gray-50 text-gray-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subjects">
                {isTutor ? "Предметы (через запятую)" : "Предметы, которые изучаю"}
              </Label>
              <Input
                id="subjects"
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                placeholder={isTutor ? "Математика, Физика" : "Математика, Русский язык"}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="level">
                {isTutor ? "Уровень преподавания" : "Класс / уровень"}
              </Label>
              <Input
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder={isTutor ? "Школа, ЕГЭ, ОГЭ" : "10 класс"}
              />
            </div>
          </div>

          {/* ── Payment settings (tutor only) ─────────────────────────────── */}
          {isTutor && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Настройки оплаты</h2>

              <div className="space-y-1.5">
                <Label htmlFor="wallet">Номер кошелька ЮMoney</Label>
                <Input
                  id="wallet"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="410011XXXXXXXXX"
                />
                <p className="text-xs text-gray-400">
                  Профиль на{" "}
                  <a href="https://yoomoney.ru" target="_blank" rel="noreferrer" className="text-violet-600 hover:underline">
                    yoomoney.ru
                  </a>{" "}
                  → «Номер счёта»
                </p>
              </div>

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
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="secret">Секрет для вебхука ЮMoney</Label>
                <div className="relative">
                  <Input
                    id="secret"
                    type={showSecret ? "text" : "password"}
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Оставьте пустым, если не используете"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Автоматическая отметка оплаты:</p>
                  <p>yoomoney.ru → Настройки → Уведомления → HTTP. URL вебхука:</p>
                  <p className="font-mono bg-blue-100 px-1.5 py-0.5 rounded mt-1 break-all">
                    {window.location.origin}/yoomoney/webhook
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Error / Save ──────────────────────────────────────────────── */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || uploading}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-colors",
              saved
                ? "bg-emerald-500"
                : "bg-violet-600 hover:bg-violet-700 disabled:opacity-60"
            )}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saved  && <Check className="w-4 h-4" />}
            {saving ? "Сохраняем…" : saved ? "Сохранено" : "Сохранить изменения"}
          </button>
        </form>
      </main>
    </div>
  );
}
