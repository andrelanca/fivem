// Motor das ferramentas de craft. Cada página define `window.CRAFT` (modelo com todas as opções: scripts/modelo.html)
// e carrega este ficheiro, que desenha a página toda: topo, tabela, separadores, ficha, dock, copiar e limpar.
// O layout vive aqui e em craft.css. As páginas só têm dados e textos.
(function () {
  const C = window.CRAFT;
  if (!C) throw new Error("craft.js: falta definir window.CRAFT antes de carregar este ficheiro.");

  // ---- valores por omissão (qualquer um pode ser trocado na config da página) ----
  const unit = C.unit || ["craft", "crafts"];          // o que conta a quantidade
  const money = C.money || "Dinheiro";                  // nome da coluna do preço
  const out = C.out || 1;                               // quanto sai por craft (pode vir no item)
  const outTitle = C.outTitle || "Recebes";             // título da lista de resultados na ficha
  const outWord = C.outWord || "";                      // ex.: "balas", usado ao copiar
  const fichaTitle = C.fichaTitle || "A reunir";
  const groups = C.groups;

  // ---- utilitários ----
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const eur = n => fmt(n) + " €";
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const plural = (n, [one, many]) => n + " " + (n === 1 ? one : many);

  // ---- dados ----
  const items = [];
  groups.forEach((g, gi) => {
    g.id = g.id || "g" + gi;
    g.items.forEach((it, i) => { it.key = it.key || g.id + "-" + i; it.out = it.out || out; it.group = g; items.push(it); });
  });
  // ordem dos materiais: a da config, ou a ordem em que aparecem
  const MATS = C.materials || [...new Set(items.flatMap(it => Object.keys(it.m || {})))];
  // até 4 materiais cabe uma coluna por material; acima disso, uma coluna de texto
  const matCols = C.matCols != null ? C.matCols : MATS.length <= 4;
  const hasMoney = C.showMoney != null ? C.showMoney : items.some(it => it.p); // sem preços → sem coluna nem total de dinheiro
  const tabsOn = C.tabs != null ? C.tabs : groups.length > 1;
  const storeKey = (C.id || location.pathname) + "-qty";
  let qty = load(storeKey, {}) || {};
  let cat = "todos";

  // ---- página ----
  document.body.innerHTML = `
<header class="bar">
  <div class="shell bar-in">
    <nav class="crumbs" aria-label="Caminho">
      <a class="crumb" href="../">Ferramentas</a>
      <span class="sep" aria-hidden="true">/</span>
      <a class="mark" href="#" aria-label="${esc(C.title)}, início">${esc(C.short)}</a>
    </nav>
  </div>
</header>
<main class="shell">
  <h1 class="visually-hidden">${esc(C.title)}</h1>
  <div class="work">
    <div>
      ${tabsOn ? `<div class="toolbar"><div class="tabs" role="tablist" aria-label="Categoria" id="tabs"></div></div>` : ""}
      <div id="list"></div>
      ${C.note ? `<p class="note">${esc(C.note)}</p>` : ""}
    </div>
    <aside class="ficha" aria-labelledby="ficha-title">
      <div class="ficha-head"><h2 id="ficha-title">${esc(fichaTitle)}</h2><span class="units" id="units"></span></div>
      ${hasMoney ? `<div class="big" aria-live="polite">
        <div class="lbl">${esc(money)} total</div>
        <div class="figure" id="t-price">0 €</div>
      </div>` : ""}
      <div><h3>Materiais</h3><div id="mats"></div></div>
      <div><h3>${esc(outTitle)}</h3><div id="sel"></div></div>
      <div class="actions">
        <button type="button" class="btn btn--primary" id="copy">Copiar lista</button>
        <button type="button" class="btn" id="reset">Limpar</button>
      </div>
      <p class="toast" id="toast" role="status"></p>
    </aside>
  </div>
</main>
<div class="dock" id="dock">
  <div>${hasMoney ? `<span class="lbl">${esc(money)} total, <span id="d-units"></span></span><span class="figure" id="d-price">0 €</span>` : `<span class="lbl">A reunir</span><span class="figure" id="d-units"></span>`}</div>
  <a class="btn" href="#ficha-title">Ver lista</a>
</div>`;

  const list = document.getElementById("list");
  const cols = 2 + (hasMoney ? 1 : 0) + (matCols ? MATS.length : 1);
  const matCells = it => matCols
    ? MATS.map(k => `<td class="num price" data-label="${esc(k)}">${(it.m && it.m[k]) || 0}</td>`).join("")
    : `<td class="mats">${MATS.filter(k => it.m && it.m[k]).map(k => `${it.m[k]} ${esc(k)}`).join(" · ")}</td>`;
  const sub = it => it.sub != null ? it.sub : (it.out > 1 ? `Dá ${it.out} por craft` : "");

  list.innerHTML = `<table class="sheet">
  <thead><tr><th>${esc(C.itemLabel || "Item")}</th>${matCols ? MATS.map(k => `<th class="num">${esc(k)}</th>`).join("") : "<th>Materiais</th>"}${hasMoney ? `<th class="num">${esc(money)}</th>` : ""}<th class="num">${esc(C.qtyLabel || "Quantidade")}</th></tr></thead>
  ${groups.map(g => `<tbody class="group" data-cat="${g.id}">
    <tr class="ghead"><td colspan="${cols}"><h2>${esc(g.name)}</h2></td></tr>
    ${g.items.map(it => `<tr class="item" data-key="${it.key}">
      <td class="desc"><div class="name">${esc(it.n)}</div>${sub(it) ? `<div class="mats">${esc(sub(it))}</div>` : ""}</td>
      ${matCells(it)}
      ${hasMoney ? `<td class="num price sem" data-label="${esc(money)}">${eur(it.p || 0)}</td>` : ""}
      <td class="num qcell"><div class="qty">
        <button type="button" data-d="-1" aria-label="Menos ${esc(it.n)}">−</button>
        <input type="number" min="0" step="1" inputmode="numeric" name="q-${it.key}" id="q-${it.key}" aria-label="Quantidade ${esc(it.n)}">
        <button type="button" data-d="1" aria-label="Mais ${esc(it.n)}">+</button>
      </div></td>
    </tr>`).join("")}
  </tbody>`).join("")}
</table>`;

  // ---- separadores (um por grupo, mais "Todos") ----
  const tabs = document.getElementById("tabs");
  if (tabs) {
    tabs.innerHTML = [{ id: "todos", name: "Todos" }, ...groups].map(g =>
      `<button type="button" role="tab" data-cat="${g.id}">${esc(g.name)} <span class="n" id="cnt-${g.id}"></span></button>`).join("");
    tabs.addEventListener("click", e => { const b = e.target.closest("button[data-cat]"); if (!b) return; cat = b.dataset.cat; filter(); });
  }
  function filter() {
    if (!tabs) return;
    list.querySelectorAll("tbody.group").forEach(g => { g.hidden = cat !== "todos" && g.dataset.cat !== cat; });
    tabs.querySelectorAll("button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.cat === cat)));
  }

  const table = rows => `<table class="list"><tbody>${rows.map(([a, b]) => `<tr><td>${a}</td><td class="num">${b}</td></tr>`).join("")}</tbody></table>`;

  function render() {
    const mats = {}; let price = 0, units = 0; const sel = [];
    items.forEach(it => {
      const q = qty[it.key] || 0;
      const row = list.querySelector(`[data-key="${it.key}"]`);
      row.classList.toggle("on", q > 0);
      row.querySelector('button[data-d="-1"]').disabled = q === 0;
      const inp = document.getElementById("q-" + it.key);
      if (document.activeElement !== inp) inp.value = q || "";
      if (!q) return;
      units += q; price += (it.p || 0) * q;
      for (const [k, v] of Object.entries(it.m || {})) mats[k] = (mats[k] || 0) + v * q;
      sel.push({ it, q });
    });
    if (tabs) {
      groups.forEach(g => { const n = g.items.reduce((s, it) => s + (qty[it.key] || 0), 0); document.getElementById("cnt-" + g.id).textContent = n || ""; });
      document.getElementById("cnt-todos").textContent = units || "";
    }
    const u = plural(units, unit);
    document.getElementById("units").textContent = u;
    document.getElementById("d-units").textContent = u;
    if (hasMoney) {
      document.getElementById("t-price").textContent = eur(price);
      document.getElementById("d-price").textContent = eur(price);
    }
    const mk = MATS.filter(k => mats[k]);
    document.getElementById("mats").innerHTML = mk.length ? table(mk.map(k => [esc(k), fmt(mats[k])])) : `<p class="empty">Nada por agora. Usa o + numa linha da tabela.</p>`;
    document.getElementById("sel").innerHTML = sel.length
      ? table(sel.map(s => s.it.out > 1 ? [`${esc(s.it.n)} <span class="empty">${s.q}× craft</span>`, fmt(s.q * s.it.out)] : [esc(s.it.n), s.q + "×"]))
      : `<p class="empty">Ainda nada.</p>`;
    store(storeKey, qty);
    return { mats, mk, price, sel };
  }

  list.addEventListener("click", e => {
    const b = e.target.closest("button[data-d]"); if (!b) return;
    const key = b.closest("tr").dataset.key;
    qty[key] = Math.max(0, (qty[key] || 0) + Number(b.dataset.d) * (e.shiftKey ? 10 : 1));
    render();
  });
  list.addEventListener("input", e => {
    if (!e.target.matches(".qty input")) return;
    qty[e.target.closest("tr").dataset.key] = Math.max(0, Math.floor(Number(e.target.value) || 0));
    render();
  });
  list.addEventListener("focusout", e => { if (e.target.matches(".qty input")) render(); });

  let toastT;
  const toast = t => { const el = document.getElementById("toast"); el.textContent = t; clearTimeout(toastT); toastT = setTimeout(() => { el.textContent = ""; }, 2500); };
  document.getElementById("reset").addEventListener("click", () => { qty = {}; render(); toast("Lista limpa."); });
  document.getElementById("copy").addEventListener("click", () => {
    const r = render();
    if (!r.sel.length) { toast("A lista está vazia, não há nada para copiar."); return; }
    const txt = [
      C.short.toUpperCase(), ...r.sel.map(s => s.it.out > 1 ? `- ${s.q}x craft ${s.it.n} = ${fmt(s.q * s.it.out)}${outWord ? " " + outWord : ""}` : `- ${s.q}x ${s.it.n}`), "",
      "MATERIAIS", ...r.mk.map(k => `- ${fmt(r.mats[k])} ${k}`),
      ...(hasMoney ? ["", `${money} total: ${eur(r.price)}`] : [])
    ].join("\n");
    navigator.clipboard.writeText(txt).then(() => toast("Lista copiada."), () => toast("Este browser não deixou copiar. Tenta noutro browser."));
  });

  filter(); render();
})();
