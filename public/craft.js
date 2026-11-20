// Motor das ferramentas de craft. Cada página define `window.CRAFT` (modelo com todas as opções: scripts/modelo.html)
// e carrega este ficheiro, que desenha a página toda: topo, tabela, separadores, ficha, dock, copiar e limpar.
// O layout vive aqui e em craft.css. As páginas só têm dados e textos.
(function () {
  const here = document.currentScript && document.currentScript.src;
  const C = window.CRAFT;
  if (!C) throw new Error("craft.js: falta definir window.CRAFT antes de carregar este ficheiro.");

  // ---- valores por omissão (qualquer um pode ser trocado na config da página) ----
  const unit = C.unit || ["craft", "crafts"];          // o que conta a quantidade
  const money = C.money || "Dinheiro";                  // nome da coluna do preço
  const out = C.out || 1;                               // quanto sai por craft (pode vir no item)
  const outTitle = C.outTitle || "Recebes";             // título da lista de resultados na ficha
  const outWord = C.outWord || "";                      // ex.: "balas", usado ao copiar
  const fichaTitle = C.fichaTitle || "A reunir";
  const FEE = C.fee != null ? C.fee : 0.15;            // taxa do mercado ao vender (para "se venderes")
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
  let mkt = null; // preços do mercado (market.js), quando chegarem

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
      <div><h3>Materiais</h3><div id="mats"></div><p class="note" id="mkt-note"></p></div>
      <div><h3>${esc(outTitle)}</h3><div id="sel"></div><p class="note" id="val-note"></p></div>
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
  const priced = () => !!(mkt && MATS.some(k => mkt.find(k))); // algum material desta página está no mercado
  // custo de 1 craft ao mínimo do mercado; missing = materiais sem preço (não entram na soma)
  const itemCost = it => { let c = 0; const missing = [];
    Object.entries(it.m || {}).forEach(([k, v]) => { const m = mkt.find(k); if (m) { c += m.min * v; missing.push(...m.missing); } else missing.push(k); });
    return { c, missing: [...new Set(missing)] }; };
  const costCell = it => {
    const { c, missing } = itemCost(it);
    const sub = missing.length ? `<div class="mats">sem ${esc(missing.join(", "))}</div>` : "";
    return `<td class="num price cost" data-label="Custo"${missing.length ? ` title="O mercado não tem ${esc(missing.join(", "))}: não entra na soma"` : ""}>${c ? eur(c) + (missing.length ? " +" : "") : "—"}${sub}</td>`;
  };
  const matCells = it => matCols
    ? MATS.map(k => `<td class="num price" data-label="${esc(k)}">${(it.m && it.m[k]) || 0}</td>`).join("")
    : `<td class="mats">${MATS.filter(k => it.m && it.m[k]).map(k => `${it.m[k]} ${esc(k)}`).join(" · ")}</td>`;
  const sub = it => it.sub != null ? it.sub : (it.out > 1 ? `Dá ${it.out} por craft` : "");
  // quanto recebes de q crafts (C.roundDown: arredonda para baixo, ex.: conversões com perda, out 0.7)
  const got = (it, q) => C.roundDown ? Math.floor(q * it.out + 1e-9) : q * it.out;
  // valor no mercado do que sai (só se o mercado, ou um preço à mão, tem esse item — não o custo de uma receita)
  const outPrice = it => { const m = mkt && mkt.find(it.sells || it.n); return m && !m.made ? m : null; };
  const valued = () => !!(mkt && items.some(outPrice));
  const valCell = it => { const m = outPrice(it);
    return `<td class="num price cost" data-label="Vale">${m ? eur(m.min * it.out) : "—"}</td>`; };

  function drawTable() {
  const pc = priced(), vc = valued();
  const cols = 2 + (hasMoney ? 1 : 0) + (pc ? 1 : 0) + (vc ? 1 : 0) + (matCols ? MATS.length : 1);
  list.innerHTML = `<table class="sheet">
  <thead><tr><th>${esc(C.itemLabel || "Item")}</th>${matCols ? MATS.map(k => `<th class="num">${esc(k)}</th>`).join("") : "<th>Materiais</th>"}${pc ? `<th class="num" title="Custo dos materiais de 1 craft, ao preço mais baixo do mercado de ${esc(Market.dm(mkt.date))}">Custo</th>` : ""}${vc ? `<th class="num" title="Quanto vale no mercado o que sai de 1 ${esc(unit[0])} (ao preço mais baixo de ${esc(Market.dm(mkt.date))})">Vale</th>` : ""}${hasMoney ? `<th class="num">${esc(money)}</th>` : ""}<th class="num">${esc(C.qtyLabel || "Quantidade")}</th></tr></thead>
  ${groups.map(g => `<tbody class="group" data-cat="${g.id}">
    <tr class="ghead"><td colspan="${cols}"><h2>${esc(g.name)}</h2></td></tr>
    ${g.items.map(it => `<tr class="item" data-key="${it.key}">
      <td class="desc"><div class="name">${esc(it.n)}</div>${sub(it) ? `<div class="mats">${esc(sub(it))}</div>` : ""}</td>
      ${matCells(it)}
      ${pc ? costCell(it) : ""}
      ${vc ? valCell(it) : ""}
      ${hasMoney ? `<td class="num price sem" data-label="${esc(money)}">${eur(it.p || 0)}</td>` : ""}
      <td class="num qcell"><div class="qty">
        <button type="button" data-d="-1" aria-label="Menos ${esc(it.n)}">−</button>
        <input type="number" min="0" step="1" inputmode="numeric" name="q-${it.key}" id="q-${it.key}" aria-label="Quantidade ${esc(it.n)}">
        <button type="button" data-d="1" aria-label="Mais ${esc(it.n)}">+</button>
      </div></td>
    </tr>`).join("")}
  </tbody>`).join("")}
</table>`;
  }
  drawTable();

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
    // com preços do mercado: custo de cada material ao mínimo do mercado (só se algum material da página está lá)
    const pc = priced();
    let cost = 0; const noPrice = [];
    mk.forEach(k => { const m = pc && mkt.find(k); if (m) { cost += m.min * mats[k]; noPrice.push(...m.missing); } else if (pc) noPrice.push(k); });
    document.getElementById("mats").innerHTML = !mk.length ? `<p class="empty">Nada por agora. Usa o + numa linha da tabela.</p>`
      : pc ? `<table class="list"><thead><tr><th>Material</th><th class="num">Quantidade</th><th class="num">Custo</th></tr></thead><tbody>${mk.map(k => {
          const m = mkt.find(k);
          return `<tr><td>${esc(k)}${m && m.made ? ` <span class="empty">feito${m.missing.length ? ", sem " + esc(m.missing.join(", ")) : ""}</span>` : m && m.manual ? ` <span class="empty">à mão</span>` : ""}</td><td class="num">${fmt(mats[k])}</td><td class="num${m ? "" : " dim"}">${m ? eur(m.min * mats[k]) : "sem preço"}</td></tr>`;
        }).join("")}<tr class="tot"><td>Total</td><td></td><td class="num">${eur(cost)}</td></tr></tbody></table>`
      : table(mk.map(k => [esc(k), fmt(mats[k])]));
    const miss = [...new Set(noPrice)];
    document.getElementById("mkt-note").textContent = pc && mk.length
      ? `Custo ao preço mais baixo do mercado de ${Market.dm(mkt.date)}.` + (mk.some(k => { const m = mkt.find(k); return m && m.made; }) ? " \"Feito\" = o mercado não tem, conta o custo dos materiais da receita (Siderurgia)." : "") + (mk.some(k => { const m = mkt.find(k); return m && m.manual; }) ? " \"À mão\" = preço posto em Preços à mão no site do mercado." : "") + (miss.length ? ` Sem preço: ${miss.join(", ")}, não entra no total.` : "")
      : "";
    // o que recebes; com preços do mercado, quanto vale
    const vc = valued(); let worth = 0, worthAll = true;
    const recv = s => s.it.out === 1 ? esc(s.it.n)
      : C.roundDown ? `${esc(s.it.n)} <span class="empty">de ${fmt(s.q)} ${esc(Object.keys(s.it.m || {})[0] || "")}</span>`
      : `${esc(s.it.n)} <span class="empty">${s.q}× craft</span>`;
    const recvN = s => s.it.out !== 1 ? fmt(got(s.it, s.q)) : s.q + "×";
    document.getElementById("sel").innerHTML = !sel.length ? `<p class="empty">Ainda nada.</p>`
      : vc ? `<table class="list"><thead><tr><th>Item</th><th class="num">Recebes</th><th class="num">Vale</th></tr></thead><tbody>${sel.map(s => {
          const m = outPrice(s.it), v = m ? m.min * got(s.it, s.q) : 0;
          if (m) worth += v; else worthAll = false;
          return `<tr><td>${recv(s)}</td><td class="num">${recvN(s)}</td><td class="num${m ? "" : " dim"}">${m ? eur(v) : "sem preço"}</td></tr>`;
        }).join("")}<tr class="tot"><td>Total</td><td></td><td class="num">${eur(worth)}</td></tr></tbody></table>`
      : table(sel.map(s => [recv(s), recvN(s)]));
    const costOk = pc && mk.length && !noPrice.length;
    document.getElementById("val-note").textContent = vc && sel.length && worth
      ? `Vale ao preço mais baixo do mercado de ${Market.dm(mkt.date)}${worthAll ? "" : " (só o que tem preço)"}. Se venderes no mercado, com a taxa de ${Math.round(FEE * 100)} %, recebes ${eur(worth * (1 - FEE))}.`
        + (costOk ? ` Tirando o custo dos materiais (${eur(cost)}), ${worth * (1 - FEE) - cost >= 0 ? "ganhas" : "perdes"} ${eur(Math.abs(worth * (1 - FEE) - cost))}.` : "")
      : "";
    store(storeKey, qty);
    return { mats, mk, price, sel, cost: pc && mk.length ? cost : null, noPrice: [...new Set(noPrice)], worth: vc && sel.length ? worth : null };
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
      C.short.toUpperCase(), ...r.sel.map(s => s.it.out !== 1 ? `- ${fmt(s.q)}x ${C.roundDown ? Object.keys(s.it.m || {})[0] || s.it.n : "craft " + s.it.n} = ${fmt(got(s.it, s.q))}${outWord ? " " + outWord : " " + s.it.n}` : `- ${s.q}x ${s.it.n}`), "",
      "MATERIAIS", ...r.mk.map(k => `- ${fmt(r.mats[k])} ${k}`),
      ...(hasMoney ? ["", `${money} total: ${eur(r.price)}`] : []),
      ...(r.worth ? [`Vale no mercado (${Market.dm(mkt.date)}): ${eur(r.worth)} · com a taxa de ${Math.round(FEE * 100)} %: ${eur(r.worth * (1 - FEE))}`] : []),
      ...(r.cost != null ? [`Custo dos materiais (mercado ${Market.dm(mkt.date)}): ${eur(r.cost)}${r.noPrice.length ? " (sem " + r.noPrice.join(", ") + ")" : ""}`] : [])
    ].join("\n");
    navigator.clipboard.writeText(txt).then(() => toast("Lista copiada."), () => toast("Este browser não deixou copiar. Tenta noutro browser."));
  });

  filter(); render();

  // preços do mercado: carrega market.js (ao lado deste ficheiro) e volta a desenhar quando chegarem
  const useMarket = () => window.Market.load().then(m => { mkt = m; if (priced() || valued()) { drawTable(); filter(); } render(); }).catch(() => {});
  if (window.Market) useMarket();
  else {
    const s = document.createElement("script");
    s.src = here ? new URL("market.js" + new URL(here).search, here).href : "../market.js"; // mesmo ?v= do deploy
    s.onload = useMarket;
    document.head.appendChild(s);
  }
})();
