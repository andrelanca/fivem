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
