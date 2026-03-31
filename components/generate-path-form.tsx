"use client";

import { useMemo, useState, useTransition } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type {
  LearnPathCourse,
  LearnPathOutputLanguage,
  LearnPathStudyMode,
} from "@/lib/learn-path/types";
import { cn } from "@/lib/utils";
import { usePreviewPathStore } from "@/store/use-preview-path-store";

type GeneratePathFormProps = {
  variant?: "hero" | "create";
  className?: string;
};

type SourceMode = "text" | "file";

const sourceModes: Array<{
  id: SourceMode;
  title: string;
  description: string;
}> = [
  {
    id: "text",
    title: "Colar texto",
    description: "Cole um artigo, anotação ou trecho de estudo.",
  },
  {
    id: "file",
    title: "Enviar arquivo",
    description: "Carregue um PDF ou TXT para a IA interpretar.",
  },
];

const studyModes: Array<{
  id: LearnPathStudyMode;
  title: string;
  description: string;
}> = [
  {
    id: "content",
    title: "Estudar o conteúdo",
    description: "A IA organiza o assunto em units, lessons e quizzes.",
  },
  {
    id: "language",
    title: "Aprender o idioma",
    description: "A IA usa o texto para ensinar o idioma presente nele.",
  },
];

const languageOptions: Array<{
  id: LearnPathOutputLanguage;
  title: string;
  description: string;
}> = [
  {
    id: "pt-BR",
    title: "Português (Brasil)",
    description: "Explicações e perguntas em PT-BR.",
  },
  {
    id: "source",
    title: "Idioma original",
    description: "Mantém o idioma dominante do conteúdo.",
  },
];

const acceptedFileTypes = ".pdf,.txt,application/pdf,text/plain";

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const isAllowedFile = (file: File) => {
  const name = file.name.toLowerCase();

  return (
    file.type === "application/pdf" ||
    file.type === "text/plain" ||
    name.endsWith(".pdf") ||
    name.endsWith(".txt")
  );
};

export const GeneratePathForm = ({
  variant = "hero",
  className,
}: GeneratePathFormProps) => {
  const router = useRouter();
  const loadPath = usePreviewPathStore((state) => state.loadPath);
  const [pending, startTransition] = useTransition();
  const [studyMode, setStudyMode] = useState<LearnPathStudyMode>("content");
  const [sourceMode, setSourceMode] = useState<SourceMode>("text");
  const [outputLanguage, setOutputLanguage] =
    useState<LearnPathOutputLanguage>("pt-BR");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const detailedMode = variant === "create";
  const textLength = useMemo(() => text.trim().length, [text]);

  const handleFile = (nextFile: File | null) => {
    if (!nextFile) return;

    if (!isAllowedFile(nextFile)) {
      const message = "Envie apenas um arquivo PDF ou TXT.";
      setError(message);
      toast.error(message);
      return;
    }

    setFile(nextFile);
    setError(null);
  };

  const onSubmit = () => {
    setError(null);

    const formData = new FormData();

    formData.set("studyMode", studyMode);
    formData.set("sourceType", sourceMode);
    formData.set("outputLanguage", outputLanguage);

    if (sourceMode === "text") {
      formData.set("text", text);
    }

    if (sourceMode === "file" && file) {
      formData.set("file", file);
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/generate-path", {
          method: "POST",
          body: formData,
        });

        const payload = (await response.json()) as {
          error?: string;
          path?: LearnPathCourse;
        };

        if (!response.ok || !payload.path) {
          throw new Error(payload.error || "Não foi possível gerar o learn path.");
        }

        loadPath(payload.path);

        if (payload.path.warning) {
          toast.warning(payload.path.warning);
        } else {
          toast.success("Learn path gerado.");
        }

        router.push("/learn/preview");
      } catch (nextError) {
        const message =
          nextError instanceof Error
            ? nextError.message
            : "Não foi possível gerar o learn path.";

        setError(message);
        toast.error(message);
      }
    });
  };

  const canSubmit =
    (sourceMode === "text" && text.trim().length > 0) ||
    (sourceMode === "file" && !!file);

  return (
    <div
      className={cn(
        "rounded-[32px] border-2 bg-white shadow-sm",
        detailedMode ? "p-6 lg:p-8" : "w-full max-w-[540px] p-4 lg:p-5",
        className
      )}
    >
      <div className={cn("space-y-2", !detailedMode && "space-y-1.5")}>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
          {detailedMode ? "Create path" : "Try the MVP"}
        </p>
        <h2
          className={cn(
            "font-bold text-neutral-800",
            detailedMode ? "text-2xl lg:text-3xl" : "text-xl lg:text-2xl"
          )}
        >
          {detailedMode
            ? "Transforme conteúdo bruto em um learn path jogável"
            : "Cole um texto ou envie um arquivo e gere sua trilha agora"}
        </h2>
        <p className="text-sm text-muted-foreground lg:text-base">
          {detailedMode
            ? "Escolha entre estudar o tema do material ou aprender o idioma usado nele. O resultado abre direto na sessão atual."
            : "PDF e TXT funcionam no upload. Você pode estudar o conteúdo em si ou usar o texto para aprender o idioma presente nele."}
        </p>
      </div>

      <div className={cn("space-y-3", detailedMode ? "mt-6" : "mt-4")}>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
          Objetivo
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          {studyModes.map((mode) => {
            const active = mode.id === studyMode;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setStudyMode(mode.id)}
                className={cn(
                  "rounded-2xl border-2 p-4 text-left transition",
                  active
                    ? "border-green-500 bg-green-50"
                    : "border-slate-200 hover:border-green-300"
                )}
              >
                <p className="font-bold text-neutral-800">{mode.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className={cn("grid gap-3 md:grid-cols-2", detailedMode ? "mt-6" : "mt-4")}>
        {sourceModes.map((mode) => {
          const active = mode.id === sourceMode;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                setSourceMode(mode.id);
                setError(null);
              }}
              className={cn(
                "rounded-2xl border-2 p-4 text-left transition",
                active
                  ? "border-green-500 bg-green-50"
                  : "border-slate-200 hover:border-green-300"
              )}
            >
              <p className="text-base font-bold text-neutral-800">{mode.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className={cn(detailedMode ? "mt-6" : "mt-4")}>
        {sourceMode === "text" ? (
          <div className="space-y-3">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              className={cn(
                "w-full rounded-2xl border-2 border-slate-200 p-4 text-sm text-neutral-700 outline-none transition focus:border-green-500",
                detailedMode ? "min-h-[320px]" : "min-h-[160px] lg:min-h-[148px]"
              )}
              placeholder={
                studyMode === "language"
                  ? "Exemplo: cole um diálogo, entrevista ou artigo em alemão para a IA transformar isso em uma trilha para aprender alemão."
                  : "Exemplo: cole um texto sobre RAG, arquitetura de software, história, biologia ou qualquer outro assunto que você queira transformar em estudo gamificado."
              }
            />

            {detailedMode && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Mínimo recomendado: 120 caracteres úteis.</span>
                <span>{textLength} caracteres</span>
              </div>
            )}
          </div>
        ) : (
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center transition",
              dragActive
                ? "border-green-500 bg-green-50"
                : "border-slate-300 hover:border-green-400 hover:bg-slate-50",
              detailedMode ? "min-h-[320px]" : "min-h-[160px] lg:min-h-[148px]"
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              handleFile(event.dataTransfer.files?.[0] || null);
            }}
          >
            <input
              type="file"
              accept={acceptedFileTypes}
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0] || null)}
            />

            <Image src="/create.svg" alt="Upload" width={72} height={72} />

            <p className="mt-4 text-lg font-bold text-neutral-800">
              {file ? file.name : "Clique ou arraste um PDF/TXT"}
            </p>

            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              O backend extrai o texto do arquivo e envia apenas o conteúdo útil
              para a IA estruturar o learn path.
            </p>

            {file && (
              <p className="mt-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                {file.name} • {formatFileSize(file.size)}
              </p>
            )}
          </label>
        )}
      </div>

      <div className={cn("space-y-3", detailedMode ? "mt-6" : "mt-4")}>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
          Idioma de saída
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          {languageOptions.map((language) => {
            const active = language.id === outputLanguage;

            return (
              <button
                key={language.id}
                type="button"
                onClick={() => setOutputLanguage(language.id)}
                className={cn(
                  "rounded-2xl border-2 p-4 text-left transition",
                  active
                    ? "border-green-500 bg-green-50"
                    : "border-slate-200 hover:border-green-300"
                )}
              >
                <p className="font-bold text-neutral-800">{language.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {language.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div
        className={cn(
          "mt-4 flex gap-3",
          detailedMode
            ? "flex-col items-start justify-between lg:flex-row lg:items-center"
            : "flex-col"
        )}
      >
        <div className="text-sm text-muted-foreground">
          {detailedMode
            ? "O resultado abre em um preview anônimo com progresso salvo só na sessão atual."
            : "A trilha gerada fica disponível até você recarregar ou fechar a sessão."}
        </div>

        <Button
          onClick={onSubmit}
          disabled={!canSubmit || pending}
          aria-disabled={!canSubmit || pending}
          variant="secondary"
          size="lg"
          className={cn(!detailedMode && "w-full")}
        >
          {pending ? "Gerando..." : "Gerar learn path"}
        </Button>
      </div>
    </div>
  );
};
