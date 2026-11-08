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
