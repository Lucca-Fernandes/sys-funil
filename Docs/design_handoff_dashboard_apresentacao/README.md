# Handoff: Dashboard com aba "Apresentação" (parallax de closers)

## Overview
Adicionar à **dashboard existente** (Next.js + TypeScript) um seletor de **duas abas**:

1. **Apresentação** — uma experiência de rolagem *parallax cinematográfica*, cena a cena, um closer por vez (foto em tela cheia → dissolve → painel de métricas + gráficos daquele closer), terminando num **dashboard comparativo** do time. Deve reproduzir fielmente o protótipo deste bundle, porém alimentada pelos **dados reais do sistema**.
2. **Dashboard** — a dashboard **normal que já existe** no sistema (nenhuma mudança de layout; apenas passa a conviver com a nova aba).

A aba padrão ao abrir a página é **Dashboard** (a existente). "Apresentação" é um modo de exibição imersivo (ex.: para reuniões / TV / retrospectiva de performance).

## About the Design Files
Os arquivos em `reference/` são **referências de design feitas em HTML** (um protótipo demonstrando aparência e comportamento) — **não** é código de produção para copiar. A tarefa é **recriar este design no ambiente do seu codebase** (React/Next + TS), usando os padrões, componentes e bibliotecas já estabelecidos no projeto (sua lib de charts, seu design system, seu data-fetching, etc.).

- `reference/Parallax Closers.dc.html` — o protótipo completo (marcação + lógica de scroll/animação).
- `reference/support.js` — runtime do protótipo (apenas para conseguir abrir o HTML no navegador; **não portar** — é infraestrutura da ferramenta de design).

Para rodar a referência localmente: sirva a pasta `reference/` por um servidor estático e abra `Parallax Closers.dc.html`.

## Fidelity
**High-fidelity.** Cores, tipografia, espaçamentos, easings e durações abaixo são finais e devem ser reproduzidos com precisão. A única coisa que muda em relação ao protótipo são os **dados** (que passam a vir do sistema) e o número de closers (dinâmico).

---

## Arquitetura das abas

```
/dashboard  (página existente)
 ├─ <Tabs>
 │   ├─ Tab "Dashboard"     → <DashboardExistente/>   (inalterado)
 │   └─ Tab "Apresentação"  → <PresentationView/>     (novo — o parallax)
```

Observações de implementação:
- **Não** aninhe o parallax dentro do container com padding/scroll da dashboard. A `PresentationView` precisa controlar a **altura total de scroll da janela** (é um "scrollytelling"). Recomendação: quando a aba Apresentação estiver ativa, renderizar a view em um container full-bleed (`100vw`, sem o chrome lateral/topo da app, ou com um header próprio minimalista) e ocupar o scroll da própria página/rota. Uma sub-rota dedicada (`/dashboard/apresentacao`) também é válida se o roteamento facilitar — mas a UX pedida é uma troca de abas.
- Ofereça um botão de **sair** (voltar para a aba Dashboard) fixo no header do modo Apresentação.
- O modo Apresentação assume viewport tipo desktop/widescreen (é para telona). Não precisa ser responsivo para mobile; priorize ≥1280px de largura.

---

## PresentationView — modelo de cenas (o "palco")

A experiência é **um único palco fixo** (`position: sticky; top:0; height:100vh; overflow:hidden`) dentro de um "trilho" alto. Todas as cenas são **camadas sobrepostas** (`position:absolute; inset:0`) que fazem **cross-fade + parallax** conforme o scroll. Isso é o que garante transição suave **em todos os pontos** (inclusive gráfico de um closer → foto do próximo), simétrica ao descer e subir.

### Lista de cenas (índice `k`)
Para `N` closers:
- `k = 0` → **Intro** (título "Fundo de funil, reativado.")
- `k = 1..2N` → por closer `i` (0-based): **hero** em `k = 1 + 2i`, **data** (métricas+gráficos) em `k = 2 + 2i`
- `k = 2N + 1` → **Dashboard comparativo** (cena final)

Total de estados `S = 2 + 2N`. Ex.: 4 closers → 10 cenas, dash em `k=9`.

### Matemática do scroll (reproduzir exatamente)
Sejam `vh = window.innerHeight`, e o multiplicador de intensidade `m` (padrão `1`, faixa `0.4–1.8`):

```
T = vh * 0.75      // duração da transição (em px de scroll)
D = vh * 0.60      // "dwell": tempo parado lendo cada cena
U = T + D          // passo de scroll por cena  (= vh * 1.35)
Pk = k * U         // âncora de cada cena k
s  = window.scrollY
```

Altura do trilho (o elemento alto que gera o scroll):
```
trackHeight = ((S - 1) * 135 + 160) vh      // 135vh por passo (=1.35*100) + folga
```

Para cada cena `k`, calcule a fase e a fração `f ∈ [0,1]`:
```
if      (Pk        <= s <= Pk + D)          phase = 'hold'                       // 100% visível, parada
else if (Pk + D    <  s <  Pk + D + T)      phase = 'exit',  f = (s-(Pk+D))/T    // saindo
else if (Pk - T    <= s <  Pk)              phase = 'enter', f = (s-(Pk-T))/T    // entrando
else                                        phase = 'off'                        // escondida
```

Easings:
```
easeOut(t)  = 1 - (1 - t)^3
easeBack(t) = 1 + 2.70158*(t-1)^3 + 1.70158*(t-1)^2   // overshoot suave
```

### Estilos por tipo de cena (com `e = easeOut(f)`, `eb = easeBack(f)`)

**Intro (`title`)**
- hold: `opacity:1; transform:none`
- exit: `opacity: 1-e; transform: translateY(-f*80*m) scale(1 - f*0.05)`
- enter: `opacity: e; transform: translateY((1-e)*40px)`

**Hero** (2 camadas: `media` = a foto emoldurada, `name` = bloco do nome)
- hold: media `opacity:1; translateY(0) scale(1); blur(0)`, name `translateY(0)`
- exit: media `opacity:1-e; translateY(-f*150*m) scale(1 + f*0.42); blur(f*10px)`, name `translateY(-f*118*m)`
- enter: media `opacity:e; translateY((1-e)*70px) scale(1); blur(0)`, name `translateY((1-e)*90px)`

**Data e Dash** (camada `panel`)
- hold: `opacity:1; translateY(0) scale(1); blur(0)`; métricas em valor final
- exit: `opacity:1-e; translateY(-f*70*m) scale(1 - f*0.04); blur(f*8px)`
- enter: `opacity: min(1, f*1.25); translateY((1-eb)*72px) scale(0.9 + 0.1*eb); blur((1-e)*8px)`; métricas preenchendo com `nv = e`

> `m` só afeta os `translateY` (a "força" do parallax). É exposto como controle opcional (slider 0.4–1.8).

### Count-up / preenchimento (importante para apresentação)
Os números, barras e anéis **não** devem depender de "quanto" você rolou. Regra: ao passar do **início da cena de dados** (`phase` entra em `enter`/`hold`), tudo anima até o **valor final** com `nv = easeOut(f)` e **trava** no valor final durante todo o `hold`. Assim, ao pausar em qualquer cena, os valores estão sempre corretos e completos. (No protótipo isto é o `nv` acima; se preferir, use uma animação por tempo de ~0.55s disparada quando a cena entra em foco — o efeito percebido é o mesmo.)
- Número: `Math.round(target * nv)` + sufixo (`''` ou `'%'`).
- Barra: `width = pct * nv` (%).
- Anel (donut): `conic-gradient(#F26421 {pct*nv}%, #FFE3D0 0)`.
- Toggle "count-up" off → mostrar direto o valor final (sem animar), útil para acessibilidade / prefers-reduced-motion.

### Extras do palco
- Barra de progresso fixa no topo (`height:3px`, `linear-gradient(90deg,#F58432,#E0430C)`), largura = `scrollY / (Plast + D)`.
- Header fixo (logo meeventos + chip com o **nome da cena ativa**, que é o closer atualmente em foco, ou "Fundo de Funil"/"Dashboard geral").
- Fundo compartilhado atrás de tudo: gradientes radiais laranja + grade de linhas finas (64–66px) + a **marca d'água "meeventos"** gigante (Poppins 800, cor laranja ~4–5% de opacidade) nos cantos.

---

## Especificação das telas/cenas

### 1. Intro
- Eyebrow: `MEEVENTOS · RECUPERAÇÃO DE FUNDO DE FUNIL` — DM Sans 600, 13px, `letter-spacing:.36em`, cor `#E0430C`.
- Título: "Fundo de funil, **reativado.**" — Poppins 800, `clamp(50px,7.4vw,110px)`, `line-height:.96`, `letter-spacing:-.025em`. "reativado." em `#F26421`, resto `#211A15`.
- Subtítulo: DM Sans 400, `clamp(16px,1.6vw,22px)`, cor `#7a6a5c`, max-width 600px.
- Dica "ROLAR ↓" com seta em bob animation (`translateY 0→9px`, 2s ease-in-out infinite).

### 2. Hero (por closer)
- **Foto emoldurada** (`media`): `position:absolute; top:92px; left:8vw; right:8vw; bottom:6.5vw; border-radius:30px; overflow:hidden; box-shadow:0 34px 80px -28px rgba(120,50,10,.42)`. `<img>` `object-fit:cover; object-position:center 20%`.
  - Overlays sobre a foto: gradiente vertical escurecendo a base `linear-gradient(180deg, rgba(24,12,4,.20) 0%, transparent 26%, rgba(24,12,4,.30) 58%, rgba(20,8,2,.84) 100%)` + tint de marca `linear-gradient(105deg, rgba(224,67,12,.32), transparent 52%)` com `mix-blend-mode:multiply`.
- **Bloco do nome** (`name`): `position:absolute; left:0; right:0; bottom:16vh; padding:0 11vw`.
  - Chip do cargo/role: pill translúcida (`rgba(255,255,255,.14)`, blur, borda `rgba(255,255,255,.25)`), DM Sans 600 12px `letter-spacing:.22em`, cor `#FFD9BE`.
  - Nome: Poppins 800, `clamp(56px,8.4vw,128px)`, `line-height:.9`, `letter-spacing:-.028em`, cor `#fff`, `text-shadow:0 6px 44px rgba(0,0,0,.4)`.
  - Linha de métricas (embaixo do nome): DM Sans 500 16px, `rgba(255,255,255,.8)` — ex.: "128 leads · 34 recuperados · 41% de interesse médio". **(Não há mais tagline/descrição — só nome + esta linha.)**

### 3. Data / Gráficos (por closer)
Card "glass": `width:min(1080px,92vw)`, `background:rgba(255,255,255,.72)`, `backdrop-filter:blur(18px)`, borda `rgba(255,255,255,.85)`, `border-radius:30px`, `box-shadow:0 36px 90px -24px rgba(180,80,20,.32)`, padding `36px 40px`. Fundo da cena mostra a própria foto do closer bem esmaecida (`opacity:.1`, grayscale) — reforça o vínculo com o hero.
- **Header do card**: avatar (78px, radius 20, borda branca) + nome (Poppins 700, `clamp(24px,2.6vw,32px)`, `#211A15`) + rótulo "CLOSER" (DM Sans 600 13px `.14em`, `#F26421`). À direita, **anel RECUP.** (donut 132px, conic laranja) com % no centro (Poppins 800 30px) e label "RECUP.".
- **Grid de 6 indicadores** (`repeat(3,1fr)`, gap 15px), cada card branco radius 18, padding 20/22, sombra leve: número Poppins 800 `clamp(28px,3vw,36px)` + label DM Sans 600 11.5px `.09em` `#9a8a7d`. Ordem/labels: **LEADS, AGENDAMENTOS, MESHOW, NO-SHOWS, RECUPERADOS, INTERESSE MÉD.** (este último com sufixo `%`).
  - Cores dos números: laranja `#F26421` (leads, meshow, interesse), tinta `#211A15` (agendamentos), vermelho `#E23B2E` (no-shows), verde `#16A34A` (recuperados).
- **Funil de recuperação** (abaixo, separado por borda `rgba(120,70,30,.1)`): título "FUNIL DE RECUPERAÇÃO" + 4 barras horizontais (Leads → Agendamentos → MeShow → Recuperados). Cada linha: label (118px, DM Sans 600 12.5px `#5c4d42`) + trilho (`height:24px`, `rgba(120,70,30,.07)`, radius 8) com barra preenchida (`width = valor/leads*100%`, cores `#E0430C / #F26421 / #F58432 / #16A34A`) + valor (Poppins 700 14px, `#211A15`).

### 4. Dashboard comparativo (cena final) — **interativo**
Painel `width:min(1280px,95vw)`. Estrutura:
- **Header**: eyebrow "VISÃO GERAL · SOMENTE LEITURA" + título "Dashboard do funil" (Poppins 800 `clamp(30px,3.4vw,48px)`) + subtítulo à direita.
- **KPIs** (`repeat(4,1fr)`, gap 13): cards brancos radius 16, número Poppins 800 34px + label. Conteúdo: **LEADS TOTAIS**, **RECUPERADOS**, **INTERESSE MÉDIO** (`%`), **LEADS QUENTES 🔥**. (São somas/derivados de todos os closers — ver "Mapeamento de dados".)
- **Grid `1.12fr 0.88fr`** com dois cards:
  - **Comparativo entre closers** (interativo): seletor de métrica segmentado com 4 abas — **Recuperados / Interesse / MeShow / Taxa recup.** Ao clicar, as barras reanimam (transição `width .55s cubic-bezier(.22,1,.36,1)`), o rótulo "média X" atualiza, e a cor da barra muda conforme a métrica (`#16A34A / #F26421 / #F58432 / #E0430C`). Cada linha: avatar (inicial) + nome + barra (largura = `valor / max(valores) * 100%`) + valor. **Hover** na linha: destaca o fundo e revela um badge de **delta vs média** (`+N` verde / `-N` vermelho, com sufixo da métrica).
  - **Funil consolidado** (interativo): anel "TAXA GERAL" (70px) no canto + 4 etapas (Leads/Agendamentos/MeShow/Recuperados) com contagem, `% do total` e barra (`width = % do total`). **Hover** numa etapa: destaca e revela "conversão da etapa anterior: X%".

---

## Interactions & Behavior (resumo)
- **Scroll** dirige 100% da cena (ver matemática acima). Usar `requestAnimationFrame` com throttle (um rAF pendente por vez) no listener de `scroll`/`resize`. Passivo.
- **Simetria**: como tudo deriva de `scrollY`, subir reproduz as transições ao contrário automaticamente. Não implemente animações "one-shot" baseadas em direção.
- **Troca de métrica** (dash): estado local `metric` (não precisa re-render do palco inteiro; no protótipo é feito de forma imperativa para não conflitar com os estilos aplicados por scroll — em React, isole a cena Dash num componente com seu próprio estado, memoizado, para o setState não "resetar" os estilos inline do parallax).
- **Hover** (linhas do comparativo e etapas do funil): transições de `background`/`opacity` `.2s`.
- **prefers-reduced-motion**: respeitar — desligar count-up e reduzir/zerar os `translateY`/`blur` (equivale a `intensity → 0` e `countUp → false`).

## State Management
- `activeTab: 'dashboard' | 'apresentacao'`
- Dentro da apresentação: `scrollY` (do DOM, não precisa em state), `metric: 'recuperados' | 'interesse' | 'meshow' | 'taxa'`, `hoveredRow`, `hoveredStep`.
- Controles opcionais (tweaks) que existiam no protótipo, se quiserem expor: `intensity` (0.4–1.8), `countUp` (bool), `theme` ('light'|'dark'), `panelTone` ('glass'|'solid').
- **Dados**: buscar via a camada de data-fetching já usada no projeto (React Query/SWR/server components). A apresentação só monta quando os dados chegam (mostrar skeleton/hint enquanto carrega).

---

## Mapeamento de dados (sistema → modelo do design)

Cada **closer** precisa de:

```ts
type Closer = {
  name: string;         // primeiro nome basta no hero
  role?: string;        // chip do hero (ex.: "CLOSER · TOP PERFORMER"); default "CLOSER"
  photoUrl: string;     // foto do closer (hero em tela cheia)
  stats: {
    leads: number;
    agendamentos: number;
    meshow: number;      // "MeShow" = compareceu
    noShows: number;
    recuperados: number;
    interesseMedio: number; // %
  };
  recupPct: number;     // % do anel RECUP. (taxa de recuperação do closer)
};
```

Derivados calculados no client (como no protótipo):
- `heroLine` = `${leads} leads · ${recuperados} recuperados · ${interesseMedio}% de interesse médio`.
- **Funil por closer** (barras): pct de cada etapa = `etapa / leads * 100` para Leads, Agendamentos, MeShow, Recuperados.
- **KPIs consolidados**: `LEADS TOTAIS = Σ leads`; `RECUPERADOS = Σ recuperados`; `INTERESSE MÉDIO = média(interesseMedio)`; `LEADS QUENTES` = do sistema (nº de leads marcados "quente"/alto interesse) — se não houver campo, defina a regra com o time (ex.: interesse ≥ limiar).
- **Comparativo (métricas por closer)**: Recuperados=`recuperados`, Interesse=`interesseMedio`, MeShow=`meshow`, Taxa recup.=`recupPct`. Barra = `valor / max * 100`. "média" = média aritmética dos closers.
- **Funil consolidado**: somatórios; `% do total = etapa / Σleads * 100`; `conversão da etapa anterior = etapa / etapaAnterior * 100`. `TAXA GERAL = Σrecuperados / Σleads * 100`.

> Ordenação dos closers: no protótipo estão por performance (recuperados desc). Ordene como o time preferir (ex.: recuperados desc), mas mantenha estável.

---

## Design Tokens

**Cores — claro**
- Laranja marca: `#F26421` (primário), `#F58432` (claro), `#E0430C` (profundo). Gradiente: `linear-gradient(135deg,#F58432,#E0430C)`.
- Tinta/texto: `#211A15`; suaves: `#7a6a5c`, `#5c4d42`; rótulos mudos: `#9a8a7d`, `#a08d7f`.
- Fundos: palco `#F5E9DE`, base/header `#FBF3EC`; cards `#fff`.
- Semânticas: verde `#16A34A` (recuperado/positivo), vermelho `#E23B2E` (no-show/negativo).
- Trilhos de barra: `rgba(120,70,30,.07)`; anel donut track `#FFE3D0`.

**Cores — escuro (tema opcional)**
- Fundo `#171210`; painel `rgba(30,22,17,.74)` (glass) / `#241a13` (solid); card `#221913`.
- Tinta clara `#F3E7DC`; suaves `#cbb9a9` / `#b6a596`; rótulos `#ab9889`.
- Bordas `rgba(255,180,120,.14)`; grade `rgba(255,180,120,.05)`; header `rgba(18,13,10,.74)`.
- Números que eram `#211A15` viram `#F3E7DC` no escuro.

**Tipografia**
- Display/números: **Poppins** 600/700/800.
- Texto/labels: **DM Sans** 400/500/600/700.
- Escalas: ver cada componente acima (nada abaixo de ~11px; números-herói usam `clamp`).

**Raios**: 30 (painéis glass), 20 (avatar/donut wrap), 18 (cards de gráfico), 16 (KPI), 11/12 (linhas/hover), 8/7/6 (trilhos de barra).

**Sombras**: painel glass `0 36px 90px -24px rgba(180,80,20,.32)`; foto hero `0 34px 80px -28px rgba(120,50,10,.42)`; cards `0 5–6px 18–20px rgba(180,120,80,.09–.1)`.

**Easings/durações**: scroll `easeOut`/`easeBack` (acima); troca de métrica `width .55s cubic-bezier(.22,1,.36,1)`; funil `width .6s cubic-bezier(.22,1,.36,1)`; hover `.2s`.

---

## Assets
- **Fotos dos closers**: no protótipo são placeholders do Unsplash. Em produção, usar as fotos reais do sistema (`photoUrl`). Ideal: retrato, foco no rosto (`object-position:center 20%`), ≥1200px de largura.
- **Logo/marca "meeventos"**: usada como marca d'água tipográfica (texto "meeventos" em Poppins 800, laranja translúcido) e no header (bloco "W" laranja + wordmark). Substituir pelo asset/logo oficial do sistema, se houver.
- **Fontes**: Poppins e DM Sans (Google Fonts) — ou as fontes equivalentes já adotadas no design system do projeto.
- **Emoji** 🔥 no KPI "Leads quentes" — manter só se combinar com o tom do produto.

## Files (nesta pasta)
- `reference/Parallax Closers.dc.html` — protótipo completo (fonte de verdade para look & comportamento).
- `reference/support.js` — runtime da ferramenta de design (não portar).

## Checklist de aceite
- [ ] Duas abas na dashboard: "Dashboard" (existente, intacta) e "Apresentação".
- [ ] Apresentação controla o scroll da página (full-bleed) e tem botão de sair.
- [ ] Cenas: intro → (hero+dados) por closer → dashboard comparativo, geradas dinamicamente a partir de N closers reais.
- [ ] Transição suave e simétrica **entre todas** as cenas (inclusive dados de um closer → foto do próximo).
- [ ] Números/barras/anéis travam no valor final durante a pausa em cada cena.
- [ ] Dash comparativo com troca de métrica e hovers (delta vs média; conversão por etapa).
- [ ] Dados 100% do sistema; sem valores hardcoded.
- [ ] `prefers-reduced-motion` respeitado.
