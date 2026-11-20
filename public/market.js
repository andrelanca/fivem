// Preços do mercado (repo andrelanca/fivem-market, https://fivem-market.andrelanca.com/api/prices).
// Partilhado pelo crafting e pelo motor craft.js (que carrega este ficheiro sozinho).
// Market.load() → Promise de { date, find(nome), prices }. Um pedido por página.
// find(nome) → { min, date, made, missing } | null:
//   - se o mercado tem o material: o mínimo do mercado;
//   - senão, se há receita em receitas.js (ex.: Aço, feito na Siderurgia): soma dos materiais da receita
//     (made: true); missing = materiais lá dentro sem preço (não entram na soma).
window.Market = (function () {
  const API = "https://fivem-market.andrelanca.com/api/prices";
  // compara nomes sem acentos, maiúsculas, plurais nem "de/da/do": "Lingote de ferro" = "Lingote Ferro"
  const norm = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
    .split(/\s+/).filter(w => !/^(de|da|do|das|dos)$/.test(w))
    .map(w => w.length > 3 ? w.replace(/(es|s)$/, "") : w).join(" ");
  const dm = d => d ? d.slice(8, 10) + "/" + d.slice(5, 7) : "";
  // receitas.js ao lado deste ficheiro (carregado sozinho se a página não o tiver)
  const here = document.currentScript && document.currentScript.src;
  const recipes = () => window.RECEITAS ? Promise.resolve() : new Promise(ok => {
    const s = document.createElement("script");
    s.src = here ? new URL("receitas.js", here).href : "../receitas.js";
    s.onload = s.onerror = ok;
    document.head.appendChild(s);
  });
  let p = null;
  function load(force) {
    if (p && !force) return p;
    p = recipes().then(() => fetch(API, { cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error("mercado " + r.status); return r.json(); }))
      .then(d => {
        const by = {};
        (d.prices || []).forEach(x => { if (x && x.label && x.min > 0) by[norm(x.label)] = x; });
        const R = {};
        Object.entries(window.RECEITAS || {}).forEach(([k, v]) => { R[norm(k)] = v; });
        const find = (name, seen) => {
          const k = norm(name), x = by[k];
          if (x) return { label: x.label, min: x.min, date: x.date, made: false, missing: [] };
          const r = R[k]; seen = seen || [];
          if (!r || seen.includes(k)) return null;
          let min = 0; const missing = [];
          Object.entries(r).forEach(([m, q]) => {
            const f = find(m, seen.concat(k));
            if (f) { min += f.min * q; missing.push(...f.missing); } else missing.push(m);
          });
          return min ? { label: name, min, date: d.date, made: true, missing: [...new Set(missing)] } : null;
        };
        return { date: d.date, prices: d.prices || [], find };
      });
    p.catch(() => { p = null; }); // falhou → a próxima chamada tenta outra vez
    return p;
  }
  return { URL: API, norm, dm, load };
})();
