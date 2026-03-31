"use client";

import Image from "next/image";

import { GeneratePathForm } from "@/components/generate-path-form";

export const CreateFlow = () => {
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-8 px-6 pb-10">
      <div className="space-y-2">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
          Create
        </p>
        <h1 className="text-3xl font-bold text-neutral-800">
          Crie um learn path anônimo a partir de qualquer material
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Comece por texto colado ou arquivo PDF/TXT. A IA interpreta o
          conteúdo, organiza 3 units e te manda direto para um preview gamificado.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <GeneratePathForm variant="create" />

        <div className="rounded-[32px] border-2 bg-white p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <Image src="/hero.svg" alt="Mascot squad" width={72} height={72} />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
                Output shape
              </p>
              <h2 className="text-2xl font-bold text-neutral-800">
                O que o MVP gera
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border-2 bg-slate-50 p-4">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
                Units
              </p>
              <p className="mt-3 text-3xl font-bold text-neutral-800">3</p>
            </div>
            <div className="rounded-2xl border-2 bg-slate-50 p-4">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
                Lessons
              </p>
              <p className="mt-3 text-3xl font-bold text-neutral-800">6</p>
            </div>
            <div className="rounded-2xl border-2 bg-slate-50 p-4">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
                Challenges
              </p>
              <p className="mt-3 text-3xl font-bold text-neutral-800">18</p>
            </div>
          </div>

          <div className="mt-6 space-y-4 rounded-3xl border-2 border-dashed border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <Image src="/create.svg" alt="Create" width={48} height={48} />
              <div>
                <p className="text-lg font-bold text-neutral-800">
                  Como essa versão funciona
                </p>
                <p className="text-sm text-muted-foreground">
                  Slice focado em validar o loop principal do produto.
                </p>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-neutral-700">
              <li>Texto colado e upload de PDF/TXT já geram learn paths reais.</li>
              <li>O preview abre sem exigir login ou banco configurado.</li>
              <li>O progresso fica só na sessão atual, sem save/publish.</li>
              <li>O idioma de saída pode ser PT-BR ou o idioma original.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
