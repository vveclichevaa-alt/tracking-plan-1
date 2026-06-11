import React, { useCallback, useRef, useState } from 'react';
import type { ImageFile, ScreenSource } from '../lib/types';

interface Props {
  onSourceSet: (source: ScreenSource | null) => void;
  initialSource?: ScreenSource | null;
}

export function FileUpload({ onSourceSet, initialSource }: Props) {
  // PNG block state — array of uploaded images
  const [imageFiles, setImageFiles] = useState<ImageFile[]>(
    initialSource?.type === 'image' ? initialSource.images : []
  );

  // URL block state
  const [urlInput, setUrlInput] = useState(
    initialSource?.type === 'url' ? initialSource.url : ''
  );
  const [urlActive, setUrlActive] = useState<string | null>(
    initialSource?.type === 'url' ? initialSource.url : null
  );

  // Which block is currently active
  const [activeType, setActiveType] = useState<'image' | 'url' | null>(
    initialSource ? initialSource.type : null
  );

  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── PNG block ─────────────────────────────────────────────────────────────

  const compressImage = (file: File): Promise<ImageFile> =>
    new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);
        canvas.toBlob(
          (blob) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = (e.target?.result as string).split(',')[1];
              resolve({ name: file.name, base64, mimeType: 'image/jpeg' });
            };
            reader.readAsDataURL(blob!);
          },
          'image/jpeg',
          0.8
        );
      };
      img.src = objectUrl;
    });

  const handleFiles = useCallback(
    async (files: File[]) => {
      const imageOnly = files.filter((f) => f.type.startsWith('image/'));
      if (imageOnly.length === 0) return;
      const loaded = await Promise.all(imageOnly.map(compressImage));
      setImageFiles((prev) => {
        const next = [...prev, ...loaded];
        setActiveType('image');
        onSourceSet({ type: 'image', images: next });
        return next;
      });
    },
    [onSourceSet]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(Array.from(e.dataTransfer.files));
    },
    [handleFiles]
  );

  const removeImage = (index: number) => {
    setImageFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setActiveType(null);
        onSourceSet(null);
      } else {
        onSourceSet({ type: 'image', images: next });
      }
      return next;
    });
  };

  const clearAllImages = () => {
    setImageFiles([]);
    if (activeType === 'image') {
      setActiveType(null);
      onSourceSet(null);
    }
  };

  // ── URL block ─────────────────────────────────────────────────────────────

  const handleUrlSubmit = () => {
    const url = urlInput.trim();
    if (!url) return;
    setUrlActive(url);
    setActiveType('url');
    onSourceSet({ type: 'url', url });
  };

  const clearUrl = () => {
    setUrlActive(null);
    setUrlInput('');
    if (activeType === 'url') {
      setActiveType(null);
      onSourceSet(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── PNG block ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            PNG файл{imageFiles.length > 0 && ` (${imageFiles.length})`}
          </span>
          {imageFiles.length > 0 && (
            <button
              onClick={clearAllImages}
              title="Очистить все"
              className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Thumbnail gallery */}
        {imageFiles.length > 0 && (
          <div className="p-2 flex flex-wrap gap-2 bg-white">
            {imageFiles.map((img, i) => (
              <div key={i} className="relative group">
                <img
                  src={`data:${img.mimeType};base64,${img.base64}`}
                  alt={img.name}
                  className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => removeImage(i)}
                  title="Удалить"
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                >
                  ✕
                </button>
                <p className="text-xs text-gray-400 text-center truncate w-20 mt-0.5">{img.name}</p>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone — always visible so user can add more */}
        <div
          className={`p-3 text-center cursor-pointer transition-colors border-t border-dashed border-gray-200 ${
            dragging ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
          } ${imageFiles.length === 0 ? 'p-4' : 'p-2'}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFiles(Array.from(e.target.files));
              }
              e.target.value = '';
            }}
          />
          {imageFiles.length === 0 ? (
            <>
              <div className="text-3xl mb-1">📎</div>
              <p className="text-xs text-gray-400">
                Перетащите PNG или{' '}
                <span className="text-blue-500 underline">нажмите для выбора</span>
              </p>
              <p className="text-xs text-gray-300 mt-0.5">Можно несколько файлов</p>
            </>
          ) : (
            <p className="text-xs text-gray-400">
              <span className="text-blue-500 underline">+ Добавить ещё</span>
            </p>
          )}
        </div>
      </div>

      {/* ── URL block ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">URL страницы</span>
          {urlActive && (
            <button
              onClick={clearUrl}
              title="Очистить"
              className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="p-3 bg-white">
          {urlActive ? (
            <div>
              <p className="text-xs text-blue-600 break-all mb-2">🔗 {urlActive}</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 leading-relaxed">
                <p className="font-semibold mb-1">⚠ Скриншот нужен вручную</p>
                <p>
                  Сделайте скриншот: <span className="font-mono bg-amber-100 px-1 rounded">Win+Shift+S</span> → сохранить → загрузить через блок PNG выше.
                </p>
                <p className="mt-1 text-amber-600">URL сохранён как контекст для модели.</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                placeholder="https://..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
              >
                OK
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
