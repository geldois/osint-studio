# TO-DO

## chore(deploy)

- `NEXT_PUBLIC_API_URL` is only ever set for local dev (defaults to `http://localhost:8000`); no Vercel deployment
  exists yet. When it does, the production value and the backend's `CORS_ORIGINS` need to be configured together —
  neither works without the other.

## fix(api)

- Error path assumes JSON: on a non-ok response the body is parsed as `{ detail }`,
  which throws an opaque parse error for non-JSON failures (proxy 502, HTML). Read
  text first, then attempt to parse.

## refactor(whiteboard)

- Concentric-ring placement can still leave residual overlap inside one ring when card
  sizes vary a lot; the bounded push-apart pass handles typical cases but a genuinely
  dense ring could still need a real collision-aware pass.
- Ring assignment fills each depth level to capacity ring by ring, not per parent — a
  non-root node with more children than one ring's own capacity can have some overflow
  into the next, larger ring at a restarted angle, decoupled from its siblings. Give each
  parent its own angular slice, sized to its own subtree, if a graph with deep branching
  past the root ever makes this visible in practice.

## test(studio)

- No test in the commit gate exercises a real osint-engine response. The five contract
  breaks fixed in `mvp-temporal-navigation/0-reconnect-frontend-contract` were all
  invisible to the unit suite, because every mock was written against the same wrong
  assumption the code held. Only a request against a running backend catches that class of
  drift, and it can't join the gate without a live server. Run it by hand after any change
  to `api-schemas.ts`: ingest one `.txt` and one `.csv`, and parse both responses plus
  `GET /text-ingestion/patterns` through the frontend's own schemas.
- `useBatchEstimate`/`useBatchExpand` (`use-batch-expand.ts`) and the rehydration effect
  (`use-hydrate-graph-selection.ts`) have no automated coverage — both are hooks with
  render effects, out of the gate per `docs/architecture/tooling.md`, same as `use-expand.ts`
  and `use-ingest.ts` already were.
- Manual roteiro — spec `mvp-temporal-navigation/4-temporal-navigation`: buscar dois CNPJs
  distintos; abrir o menu temporal (ícone de histórico no cabeçalho) e confirmar duas
  seções; marcar "tudo" e confirmar que o Whiteboard mostra os dois grafos; ingerir um `.txt`
  com um CPF já presente e confirmar que o nó ganha o selo de conflito; abrir o menu de
  versão daquele nó, fixar a versão antiga e confirmar que o card muda e ganha a marca de
  fixado; dar F5 e confirmar que a seleção volta.
- Manual roteiro — spec `mvp-temporal-navigation/5-typed-table-and-batch-consumption`:
  ingerir um `.csv` com três CPFs completos; expandir um CNPJ cujo QSA traga um sócio de
  CPF mascarado; abrir o nó mascarado e conferir o painel de possíveis correspondências
  com os candidatos e a confiança; conferir que aquele nó não oferece expandir; marcar dois
  candidatos completos na tabela (aba "Pessoas"), conferir a estimativa e o total na barra
  de lote, consumir, e conferir os `outcomes` e o grafo resultante; repetir a mesma seleção
  sem `force` e conferir que os dois voltam como `already_fetched` sem custo; trocar de aba
  e voltar conferindo que a seleção persiste.
- Manual roteiro — spec `mvp-temporal-navigation/6-visual-system`, nas larguras
  375×667, 390×844, 768×1024 e 1440×900, rotas `/whiteboard`, `/ingest`, `/settings` e
  `/login`: `hasHorizontalOverflow()`/`overflowingElements()` no console em cada
  combinação; em 375 px, abrir um nó e conferir o Whiteboard cheio com o painel em folha de até
  70% de altura ancorada no rodapé, e a mesma tela em 1440 px conferindo a coluna de
  320 px; tabela em 375 px rolando na horizontal dentro dela, sem rolar a página; gravar
  tema `light`, dar F5 em "slow 3G" e conferir que nenhum quadro mostra o tema escuro;
  medir os controles do cabeçalho do Whiteboard e do `ViewSwitch` pelo inspetor (≥40×40 em
  375 px, ≥32×32 em 1440 px); em aparelho real, rolar até a barra de endereço sumir e
  voltar conferindo rodapé sem faixa branca.
- `mvp-kipflow-launch/2-cpf-cost-estimate-and-partial-failure-guarantee` segue não
  implementada. A spec `5-typed-table-and-batch-consumption` dependia só de
  `KIPFLOW_CPF_COST_BRL`/`formatCostBRL` daquela spec — essa fatia foi implementada em
  `src/lib/pricing.ts`; o restante (badge de custo no botão de expandir individual do
  `DetailPanel`, fluxo de confirmação de reprocessamento em `409`/`ENTITY_ALREADY_FETCHED`)
  segue pendente.
- O `ViewSwitch`, ancorado no rodapé abaixo de `md`, fica coberto quando o `DetailPanel`
  abre como folha — aceito por ora (spec `6-visual-system` já registra a mesma tensão para
  o toque no Whiteboard atrás da folha); revisitar se atrapalhar em uso real.
