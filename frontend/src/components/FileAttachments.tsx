import { useRef, useState } from "react";
import { Paperclip, X, FileText, Loader2, Download } from "lucide-react";
import type { HWFile } from "@/api/homework";
import { uploadHomeworkFile } from "@/api/homework";
import { cn } from "@/lib/utils";

function isImage(f: HWFile) {
  return f.content_type.startsWith("image/");
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* Одиночный файл — кликабельный */
export function FileChip({ file, onRemove }: { file: HWFile; onRemove?: () => void }) {
  const img = isImage(file);
  return (
    <div className="group relative">
      {img ? (
        <a href={file.url} target="_blank" rel="noreferrer" className="block">
          <img
            src={file.url}
            alt={file.original_name}
            className="w-24 h-24 rounded-xl object-cover border border-gray-200 hover:opacity-90 transition-opacity"
          />
        </a>
      ) : (
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors max-w-[220px]"
        >
          <FileText className="w-4 h-4 text-violet-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">{file.original_name}</p>
            <p className="text-[10px] text-gray-400">{fileSize(file.size)}</p>
          </div>
          <Download className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
        </a>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}
    </div>
  );
}

/* Список прикреплённых файлов (только просмотр) */
export function FileList({ files, label = "Прикреплённые файлы" }: { files: HWFile[]; label?: string }) {
  if (!files.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => <FileChip key={i} file={f} />)}
      </div>
    </div>
  );
}

/* Загрузчик файлов с превью */
interface FileUploaderProps {
  files: HWFile[];
  onChange: (files: HWFile[]) => void;
  label?: string;
  maxFiles?: number;
  disabled?: boolean;
}

export function FileUploader({ files, onChange, label = "Прикрепить файлы", maxFiles = 5, disabled }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!picked.length) return;
    if (files.length + picked.length > maxFiles) {
      setError(`Максимум ${maxFiles} файлов`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const uploaded = await Promise.all(picked.map(uploadHomeworkFile));
      onChange([...files, ...uploaded]);
    } catch {
      setError("Ошибка загрузки файла");
    } finally {
      setUploading(false);
    }
  }

  function remove(i: number) {
    onChange(files.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => <FileChip key={i} file={f} onRemove={() => remove(i)} />)}
        </div>
      )}

      {files.length < maxFiles && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || disabled}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed text-sm font-medium transition-colors",
            uploading || disabled
              ? "border-gray-200 text-gray-300 cursor-not-allowed"
              : "border-gray-300 text-gray-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50"
          )}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          {uploading ? "Загрузка…" : label}
        </button>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        className="hidden"
        onChange={handlePick}
      />
    </div>
  );
}
