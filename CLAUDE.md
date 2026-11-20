# fivem

Deploys to the self-hosted PaaS on the Raspberry Pi 5.
Live at: **https://fivem.andrelanca.com**

## Deployment contract — do not break these

- The app **must listen on port 3000** (`process.env.PORT ?? 3000`, bound to `0.0.0.0`).
- It serves **plain HTTP**. TLS terminates at Cloudflare — never add TLS in the container.
- **`.deploy`** at the repo root is what opts this repo into deployment. Do not delete it.
- **`Dockerfile`** is required. Without it the build falls back to Nixpacks (~10 min on arm64).
- Deploys happen on push to **`main`**, automatically, via a GitHub webhook.

## Shipping

`git push` to `main`. Live within a couple of minutes.

**Regra do dono do repo:** todo o trabalho vai sempre para `main`, sem perguntar. Se a sessão
trabalhar noutro branch, faz merge/push para `main` no fim de cada alteração.

Verify from outside:

```bash
curl -sI https://fivem.andrelanca.com
```

## Secrets and config

Environment variables live in the Dokploy panel (<https://panel.andrelanca.com>) under this
app's *Environment* tab — **not** in this repo.

## Platform reference

Architecture, corner cases, scaling: `/home/alanca/paas-setup/PAAS-CONTEXT.md` on the Pi.
For deployment problems use the `paas-deploy` skill.

## Estrutura

Site estático em `public/`, servido por nginx (ver `Dockerfile`).
**Cache:** o nginx manda `Cache-Control: no-cache` e o `Dockerfile` põe `?v=<hora do build>` nos `"../*.js|css"` das
páginas (o `craft.js`/`market.js` passam o mesmo `?v=` ao `market.js`/`receitas.js`). Sem isto a Cloudflare e o
telemóvel serviam o `craft.js` antigo durante horas depois de um deploy (2026-11-20). Links novos: usar `"../x.js"`.

- `public/index.html`: painel de ferramentas (a página inicial), uma linha `<li class="tool">` por ferramenta.
- `public/tokens.css` e `public/base.css`: cores, tipos e regras base.
- `public/craft.css`: o layout de todas as ferramentas (topo, tabela, separadores, ficha, dock).
- `public/craft.js`: o motor das ferramentas de craft. Desenha a página toda a partir de `window.CRAFT`.
- `public/<ferramenta>/index.html`: cada craft é **só a config** (`window.CRAFT`): grupos, itens, materiais, preços, textos.
  Ex.: `public/balas/`, `public/pecas/`, `public/armas/`.
- `public/crafting/` (acessórios) é a exceção: tem lógica própria (Blip, preços dos materiais), mas usa o `craft.css`.

### Juntar um craft novo

```bash
scripts/novo-craft.sh <pasta> "Craft de X" "X"
```

Isto cria `public/<pasta>/index.html` a partir de `scripts/modelo.html` e junta a linha no painel.
Depois é só preencher `groups` (e as opções que interessarem; estão todas comentadas no modelo):

```js
groups: [
  { name: "Grupo", items: [            // 2+ grupos → separadores automáticos
    { n: "Nome", m: { "Material": 2 }, p: 1500, out: 2 },  // m por craft, p = dinheiro por craft, out = quanto sai
  ]},
]
```

- Pormenores de uma página (textos, unidades, colunas, separadores) → na config dessa página.
- Layout/comportamento de todas → `craft.js` / `craft.css`. Não copiar HTML/CSS para as páginas.

## Ligação ao mercado (fivem-market)

Preços: `https://fivem-market.andrelanca.com/api/prices` (JSON público com CORS, do repo `andrelanca/fivem-market`) — o
**mínimo** de cada material. Tudo passa por **`public/market.js`** (`Market.load()` → `find(nome)`):
- nomes comparados com `Market.norm` (sem acentos/maiúsculas/plurais, ignora "de/da/do": "Lingote de ferro" = "Lingote Ferro");
- se o mercado não tem o material mas há receita em **`public/receitas.js`** (Aço, Bronze, Polímero, Lingote de ferro —
  a página da Siderurgia lê os itens daí), o preço é a soma dos materiais da receita (`made: true`, `missing` = o que
  ficou sem preço, ex.: Petróleo). Receita nova de um material intermédio → juntar em `receitas.js`.
- o `/api/prices` também traz os **preços à mão** do fivem-market (Análise → Preços à mão, `source: "manual"`) para
  materiais que o mercado não tem: `find` devolve `manual: true` → na ficha "à mão"; no crafting "à mão no site do mercado" (prefixo `m:`).

**Motor `craft.js`** (Balas, Peças, Siderurgia, Armas): carrega `market.js` sozinho; se algum material da página tem
preço, aparece a coluna **Custo** (custo de 1 craft; "+ sem X" quando falta preço de algum) e a ficha mostra o custo
de cada material e o total (também no "Copiar lista"). Páginas sem nenhum material no mercado (Armas) ficam iguais.
Se o **item que sai** está no mercado (ou nos preços à mão), aparece a coluna **Vale** (valor de 1 craft = `out` × mínimo;
`sells: "Nome"` se o nome no mercado for outro) e a ficha mostra quanto vale o que recebes, com a taxa de 15 % (`fee`)
e, se o custo estiver completo, quanto ganhas/perdes.

**Minas** (`public/minas/`, pedido 2026-11-20 — não é um craft: entregas e devolvem o remanescente): conversões com perda — entregas 10 lingotes de prata → 7 Prata
(tiram 30 %), 10 lingotes de cobre → 8 Cobre (20 %), 10 areia → 4 Vidro (60 %). No motor: `out` < 1 por item +
`roundDown: true` (o que recebes arredonda para baixo). As percentagens estão em **`receitas.js` → `CONVERSOES`**
(a página lê os `out` daí). Preço dos lingotes/areia = **o que dão** (pedido do André: 10 lingotes de cobre valem o
mesmo que 8 Cobre): `Market.find("Lingote de cobre")` → 0,8 × mínimo do Cobre, `derived: true`. Coluna "Vale cada"
com a conta por baixo ("0,8 × 390 €"). Um valor `derived` **não conta como custo** no motor (`costOf`) — não é o que
pagaste; com preço à mão no fivem-market (o que pagas pelos lingotes) aparece o Custo e o lucro.

**Crafting (acessórios)**: atualiza os preços dos materiais **ao abrir** (`updateFromMarket(true)`) sem mexer nos
postos à mão (`localStorage` `crafting-mat-manual`); botão **Atualizar do mercado** troca todos. Origem por material
em `crafting-mat-src` ("mercado, DD/MM" / "feito na Siderurgia, DD/MM" (prefixo `f:`) / "posto à mão").
