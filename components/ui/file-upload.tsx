"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import clsx from "clsx";
import {
  UploadCloud,
  File as FileIcon,
  Trash2,
  Loader,
  CheckCircle,
} from "lucide-react";

interface FileWithPreview {
  id: string;
  preview: string;
  progress: number;
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  file?: File;
}

export default function FileUpload() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList).map((file) => {
      const preview = URL.createObjectURL(file);
      return {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${Math.random()}`,
        preview,
        progress: 0,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });
    setFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => simulateUpload(f.id));
  };

  const simulateUpload = (id: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, progress: Math.min(progress, 100) } : f,
        ),
      );
      if (progress >= 100) {
        clearInterval(interval);
        if (navigator.vibrate) navigator.vibrate(100);
      }
    }, 300);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearAllFiles = () => {
    setFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.preview));
      return [];
    });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const hasFiles = files.length > 0;

  /** Tween layout avoids spring “bounce” when columns go 50/50 */
  const layoutEase = [0.25, 0.1, 0.25, 1] as const;
  const layoutTween = {
    type: "tween" as const,
    duration: 0.42,
    ease: layoutEase,
  };

  return (
    <div
      className={clsx(
        "w-full mx-auto p-4 md:p-6 transition-[max-width] duration-300 ease-out",
        hasFiles ? "max-w-6xl" : "max-w-3xl",
      )}
    >
      <LayoutGroup id="file-upload-columns">
        <div
          className={clsx(
            "flex w-full overflow-x-hidden",
            hasFiles
              ? "flex-col gap-8 sm:flex-row sm:items-stretch sm:gap-6 md:gap-8"
              : "flex-col",
          )}
        >
          <motion.div
            layout="size"
            transition={{ layout: layoutTween }}
            className={clsx("min-w-0", hasFiles ? "w-full sm:w-1/2" : "w-full")}
          >
            <motion.div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              initial={false}
              animate={{
                borderColor: isDragging ? "#71717a" : "#ffffff10",
                scale: isDragging ? 1.02 : 1,
              }}
              transition={{ duration: 0.2 }}
              className={clsx(
                "relative rounded-2xl text-center cursor-pointer bg-secondary/50 border border-zinc-300/20 dark:border-zinc-600/40 shadow-sm hover:shadow-md backdrop-blur group",
                hasFiles ? "p-6 md:p-8" : "p-8 md:p-12",
                isDragging &&
                  "ring-4 ring-zinc-400/25 border-zinc-500 dark:border-zinc-400",
              )}
            >
            <div className="flex flex-col items-center gap-4 md:gap-5">
              <motion.div
                animate={{ y: isDragging ? [-5, 0, -5] : 0 }}
                transition={{
                  duration: 1.5,
                  repeat: isDragging ? Infinity : 0,
                  ease: "easeInOut",
                }}
                className="relative"
              >
                <motion.div
                  animate={{
                    opacity: isDragging ? [0.5, 1, 0.5] : 1,
                    scale: isDragging ? [0.95, 1.05, 0.95] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: isDragging ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                  className="absolute -inset-4 bg-zinc-400/15 dark:bg-zinc-500/10 rounded-full blur-md"
                  style={{ display: isDragging ? "block" : "none" }}
                />
                <UploadCloud
                  className={clsx(
                    "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 drop-shadow-sm transition-colors duration-300",
                    isDragging
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100",
                  )}
                />
              </motion.div>

              <div className="space-y-1.5 md:space-y-2">
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
                  {isDragging
                    ? "Solte os arquivos aqui"
                    : hasFiles
                      ? "Adicionar mais arquivos"
                      : "Envie seus arquivos"}
                </h3>
                <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 md:text-lg max-w-md mx-auto">
                  {isDragging ? (
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      Solte para concluir o envio
                    </span>
                  ) : (
                    <>
                      Arraste e solte os arquivos aqui ou{" "}
                      <span className="text-zinc-900 dark:text-zinc-100 font-medium underline underline-offset-2">
                        clique para escolher
                      </span>
                    </>
                  )}
                </p>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  Anexe o PDF para o sistema processar as informações do documento.
                </p>
              </div>

              <input
                ref={inputRef}
                type="file"
                multiple
                hidden
                onChange={onSelect}
                accept="image/*,application/pdf,video/*,audio/*,text/*,application/zip"
              />
            </div>
          </motion.div>
        </motion.div>

        <AnimatePresence mode="sync">
          {hasFiles && (
            <motion.div
              key="files-panel"
              layout="size"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                layout: layoutTween,
                opacity: { duration: 0.28, ease: layoutEase },
              }}
              className="flex w-full min-w-0 flex-col sm:w-1/2 sm:border-l sm:border-zinc-800/25 sm:pl-6 md:pl-8"
            >
              <div className="mb-4 flex shrink-0 items-center justify-between gap-3 px-0 sm:px-0">
                <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 sm:text-lg md:text-xl">
                  Arquivos ({files.length})
                </h3>
                {files.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllFiles();
                    }}
                    className="rounded-md bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-200 hover:text-zinc-950 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:hover:text-zinc-50"
                  >
                    Limpar tudo
                  </button>
                )}
              </div>

              <div
                className={clsx(
                  "flex min-h-0 flex-col gap-3 overflow-y-auto overflow-x-hidden pr-1 sm:max-h-[min(70vh,32rem)]",
                )}
              >
                <AnimatePresence>
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{
                        duration: 0.22,
                        ease: layoutEase,
                      }}
                      className="flex items-start gap-3 rounded-xl bg-zinc-50 px-3 py-3 shadow transition-all duration-200 hover:shadow-md dark:bg-zinc-800/80 sm:gap-4 sm:px-4 sm:py-4"
                    >
                      <div className="relative flex-shrink-0">
                        {file.type.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element -- pré-visualização blob
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="h-16 w-16 rounded-lg border object-cover shadow-sm dark:border-zinc-700 md:h-20 md:w-20"
                          />
                        ) : file.type.startsWith("video/") ? (
                          <video
                            src={file.preview}
                            className="h-16 w-16 rounded-lg border object-cover shadow-sm dark:border-zinc-700 md:h-20 md:w-20"
                            controls={false}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <FileIcon className="h-16 w-16 text-zinc-400 md:h-20 md:w-20" />
                        )}
                        {file.progress === 100 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute -bottom-2 -right-2 rounded-full bg-white shadow-sm dark:bg-zinc-800"
                          >
                            <CheckCircle className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
                          </motion.div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex w-full flex-col gap-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileIcon className="h-5 w-5 flex-shrink-0 text-zinc-600 dark:text-zinc-400" />
                            <h4
                              className="truncate text-base font-medium text-zinc-800 dark:text-zinc-200 md:text-lg"
                              title={file.name}
                            >
                              {file.name}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                            <span className="text-xs md:text-sm">
                              {formatFileSize(file.size)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="font-medium">
                                {Math.round(file.progress)}%
                              </span>
                              {file.progress < 100 ? (
                                <Loader className="h-4 w-4 animate-spin text-zinc-600 dark:text-zinc-300" />
                              ) : (
                                <button
                                  type="button"
                                  className="cursor-pointer border-0 bg-transparent p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(file.id);
                                  }}
                                  aria-label="Remover arquivo"
                                >
                                  <Trash2 className="h-4 w-4 text-zinc-400 transition-colors duration-200 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100" />
                                </button>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${file.progress}%` }}
                            transition={{
                              duration: 0.4,
                              type: "spring",
                              stiffness: 100,
                              ease: "easeOut",
                            }}
                            className={clsx(
                              "h-full rounded-full shadow-inner",
                              file.progress < 100
                                ? "bg-zinc-500 dark:bg-zinc-400"
                                : "bg-zinc-900 dark:bg-zinc-100",
                            )}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </LayoutGroup>
    </div>
  );
}
