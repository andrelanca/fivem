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

`git push` to `main`. Live within a couple of minutes. Verify from outside:

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

- `public/index.html`: painel de ferramentas (a página inicial).
- `public/<ferramenta>/index.html`: cada ferramenta na sua pasta (ex.: `public/crafting/`, `public/armas/`).
- `public/tokens.css` e `public/base.css`: cores, tipos e regras base partilhados por todas as páginas.

Para juntar uma ferramenta: cria `public/<nome>/index.html` (importa `../tokens.css` e `../base.css`,
e põe no topo o caminho `Ferramentas / <Nome>` com link para `../`), depois junta uma linha `<li class="tool">`
no painel, só com o título.

## Ligação ao mercado (fivem-market)

`public/crafting/` → vista *Preços dos materiais* tem o botão **Atualizar do mercado**: faz `fetch` a
`https://fivem-market.andrelanca.com/api/prices` (JSON público com CORS, gerado pelo repo `andrelanca/fivem-market`)
e põe o **mínimo** de cada material. Só entram os materiais usados nas receitas (`MAT_ORDER`), comparados pelo nome
com `norm()` (sem acentos/maiúsculas/plurais). O que o mercado não tem (ex.: Aço) fica com o preço posto à mão.
Cada material mostra a origem ("mercado, DD/MM" / "posto à mão") — guardada em `localStorage` `crafting-mat-src`;
editar à mão ou importar texto apaga a origem.
**Atualiza sozinho ao abrir a página** (`updateFromMarket(true)`), mas não mexe nos preços postos à mão
(`localStorage` `crafting-mat-manual`); o botão atualiza todos, incluindo esses. Material novo numa receita: se o nome bater com o do mercado, entra sozinho.
