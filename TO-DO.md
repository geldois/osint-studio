# TO-DO

## fix(api)

- Error path assumes JSON: on a non-ok response the body is parsed as `{ detail }`, which throws an opaque parse error
  for non-JSON failures (proxy 502, HTML). Read text first, then attempt to parse.

## fix(dashboard)

- `CategoricalChartCard`'s variante pizza renderiza `<Pie>` sem nenhum setor (grupo `recharts-pie` vazio) — confirmado
  com dado real (grafo de 107 entidades), reproduzido em mount limpo, sem erro no console. Mesmo defeito confirmado em
  `CoverageRadialCard` (`RadialBar`, código pré-existente, não tocado nesta sessão): só o arco de fundo (`#eee`)
  aparece, o arco de valor nunca renderiza. Afeta a família inteira de gráficos polares do Recharts `3.8.0` neste
  ambiente (`next dev`, Turbopack, `reactStrictMode` no default `true`), não algo introduzido pelo toggle barra/pizza em
  si — nunca verificado ao vivo com dado populado antes desta sessão. Mitigado por ora: nenhum card usa mais
  `defaultVariant="pie"`, todos nascem em barra (comprovadamente funcional); o alternador continua visível mas a
  variante pizza fica em branco se clicada. Suspeita não confirmada: o double-invoke de efeitos do Strict Mode
  descompassando o seletor baseado em store interno do Recharts v3 — precisa de `reactStrictMode: false` em
  `next.config.ts` + reiniciar o servidor dev para testar, não feito por não reiniciar servidor em produção durante esta
  sessão.

## refactor(whiteboard)

- Concentric-ring placement can still leave residual overlap inside one ring when card sizes vary a lot; the bounded
  push-apart pass handles typical cases but a genuinely dense ring could still need a real collision-aware pass.
- Ring assignment fills each depth level to capacity ring by ring, not per parent — a non-root node with more children
  than one ring's own capacity can have some overflow into the next, larger ring at a restarted angle, decoupled from
  its siblings. Give each parent its own angular slice, sized to its own subtree, if a graph with deep branching past
  the root ever makes this visible in practice.
