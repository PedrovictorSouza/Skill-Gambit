# PRAGT CSS Tool

Overlay reutilizável para inspecionar especificidade e aplicar mudanças em código real durante a construção do site.

## O que o pacote expõe

- `PragtCssTool`: componente React que monta o Specificity Tool
- `PragtSpecificityTool`: componente React do overlay de especificidade
- `initPragtCssTool(options)`: bootstrap para páginas sem React explícito
- `createApplyStylePostHandler(config)`
- `createDeleteElementPostHandler(config)`
- `createReparentElementPostHandler(config)`
- `createSwapElementsPostHandler(config)`
- `createUpdateTextPostHandler(config)`
- `createPragtProjectConfig(config)`
- `@pragt/css-tool/styles.css`: stylesheet da UI

## Uso rápido em React / Next

```jsx
import "@pragt/css-tool/styles.css";
import { PragtCssTool } from "@pragt/css-tool/react";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PragtCssTool />
      </body>
    </html>
  );
}
```

O `PragtCssTool` já monta o Specificity Tool automaticamente em ambiente de desenvolvimento.

## Uso rápido sem montar React manualmente

```js
import "@pragt/css-tool/styles.css";
import { initPragtCssTool } from "@pragt/css-tool";

initPragtCssTool({
  apiBasePath: "/api/pragt"
});
```

## Levar para outro repositório

O fluxo mínimo ficou assim:

1. Copie a pasta [`/Users/pedrovictor/Portfolio/packages/pragt-css`](/Users/pedrovictor/Portfolio/packages/pragt-css) para o outro projeto.
2. Instale as dependências que o pacote usa no ambiente servidor:
   - `@babel/parser`
   - `@babel/traverse`
   - `@babel/generator`
3. Crie um `pragt.config.js` no projeto consumidor.
4. Monte o overlay no layout raiz.
5. Exponha as rotas `/api/pragt/*`.

### Config mínimo

```js
import { createPragtProjectConfig } from "./packages/pragt-css/src/next/index.js";

export default createPragtProjectConfig({
  css: {
    allowedFilePaths: [
      "src/App.css",
      "src/styles/editor.css",
      "packages/pragt-css/src/styles/pragt-specificity-tool.css"
    ],
    resolveTargetFile({ pathname, selector, scope, targetType }, { file }) {
      if (scope === "global" || targetType === "variable") {
        return file("src/App.css");
      }

      if (String(selector || "").includes(".pragt-specificity-")) {
        return file("packages/pragt-css/src/styles/pragt-specificity-tool.css");
      }

      if (String(pathname || "").startsWith("/editor")) {
        return file("src/styles/editor.css");
      }

      return file("src/App.css");
    }
  },
  sources: {
    allowedFilePaths: [
      "src/App.jsx",
      "src/components/EditorSection.jsx",
      "src/data/siteContent.json"
    ],
    jsxFilePaths: [
      "src/App.jsx",
      "src/components/EditorSection.jsx"
    ],
    resolveDeleteSourceFiles({ pathname }, { file }) {
      if (String(pathname || "").startsWith("/editor")) {
        return [file("src/components/EditorSection.jsx")];
      }

      return [
        file("src/App.jsx"),
        file("src/data/siteContent.json")
      ];
    },
    resolveUpdateTextSourceFiles({ pathname }, { file }) {
      if (String(pathname || "").startsWith("/editor")) {
        return [file("src/components/EditorSection.jsx")];
      }

      return [
        file("src/App.jsx"),
        file("src/data/siteContent.json")
      ];
    },
    resolveSwapSourceFile({ pathname }, { file }) {
      if (String(pathname || "").startsWith("/editor")) {
        return file("src/components/EditorSection.jsx");
      }

      return file("src/App.jsx");
    }
  }
});
```

### Rotas Next

```js
import pragtConfig from "../../../../pragt.config.js";
import { createApplyStylePostHandler } from "../../../../packages/pragt-css/src/next/index.js";

export const POST = createApplyStylePostHandler(pragtConfig);
```

Repita o mesmo padrão para:
- `delete-element`
- `reparent-element`
- `swap-elements`
- `update-text`

### Montagem do overlay

```jsx
import "../packages/pragt-css/src/styles/pragt-specificity-tool.css";
import { PragtCssTool } from "../packages/pragt-css/src/react/index.js";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PragtCssTool />
      </body>
    </html>
  );
}
```

### O que você realmente adapta em cada app

- lista de arquivos CSS que podem ser escritos
- lista de arquivos-fonte que podem ser alterados
- regra que decide em qual arquivo mexer para `apply`, `delete`, `swap` e `update text`

O restante já vem pronto do pacote.

## Grid: desenhar seções com CSS Grid

Para layouts de seção reutilizáveis em Grid, importe o stylesheet dedicado:

```css
@import "@pragt/css-tool/grid.css";
```

### Uso rápido

```html
<section class="pragt-section-shell">
  <div class="pragt-grid pragt-grid-auto pragt-grid-align-center">
    <article class="pragt-grid-slot" style="--pragt-span: 6">
      Hero (6 colunas)
    </article>
    <aside class="pragt-grid-slot" style="--pragt-span: 6; --pragt-span-sm: 4">
      Imagem ou CTA (6 colunas, 4 no tablet, 1 no mobile)
    </aside>
    <div class="pragt-grid-slot" style="--pragt-span: 4">
      Card A
    </div>
    <div class="pragt-grid-slot" style="--pragt-span: 4">
      Card B
    </div>
    <div class="pragt-grid-slot" style="--pragt-span: 4">
      Card C
    </div>
  </div>
</section>
```

### Tokens e variáveis

- `--pragt-grid-columns`, `--pragt-grid-columns-md`, `--pragt-grid-columns-sm`, `--pragt-grid-columns-xs`: colunas por breakpoint (desktop 12/8/4/1 por padrão).
- `--pragt-grid-gap`, `--pragt-grid-gap-sm`: espaçamento em `clamp()` para manter ritmo entre desktop e mobile.
- `--pragt-grid-min-column` e `--pragt-grid-min-column-xs`: largura mínima quando usar `auto-fit`.
- `--pragt-span`, `--pragt-span-md`, `--pragt-span-sm`, `--pragt-span-xs`: span da criança; defina por inline style ou classe utilitária própria.
- `--pragt-grid-shell-padding-inline` e `--pragt-grid-shell-padding-block`: respiro das seções; a classe `.pragt-section-shell` aplica com `scroll-margin-top` para âncoras acessíveis.
- `.pragt-grid-bleed`: remove o max-width quando a seção precisa sangrar.

### Boas práticas embutidas

- Tracks retangulares com `minmax(0, 1fr)` para evitar overflow e manter cartões alinhados.
- `auto-fit` com largura mínima configurável para evitar colunas estreitas que prejudiquem leitura/SEO.
- `scroll-margin-top` na casca de seção evita que títulos ancorados fiquem escondidos sob o header fixo.
- `prefers-reduced-motion` respeitado para rolagem suave.
- `min-width: 0` nos slots evita que conteúdo quebre a grade.
- Alinhamentos utilitários (`pragt-grid-align-*`, `pragt-grid-justify-*`) evitam reinventar cada seção.

### Guidelines rápidas de acessibilidade e SEO

- Use `section` + `h2`/`h3` sem pular níveis; mantenha a ordem visual alinhada à ordem DOM.
- Prefira `auto-fit` para grids de cartões e `span` explícito para duplas/triplas colunas — só grids retangulares.
- Garanta contraste das áreas com CSS do projeto; o toolkit não força cores.
- Evite esconder conteúdo com `display: none` em breakpoints: use `grid` + `span` menor para manter foco/taborder coerente.

## Rotas de escrita

Para manter os recursos de `apply to code`, `delete element`, `swap` e `update text`, o projeto precisa expor rotas que apontem para os handlers do pacote e entregar uma configuração com:

- arquivos CSS permitidos para escrita
- arquivos-fonte permitidos para mutação
- quais arquivos JSX contêm texto editável
- funções de resolução de alvo por rota

No projeto consumidor, isso normalmente fica centralizado em um `pragt.config.js` na raiz.
