// static/grafico.js
(() => {
  // ---------- Caixinha de status ----------
  function statusBox() {
    let box = document.getElementById("debug-graficos");
    if (!box) {
      box = document.createElement("div");
      box.id = "debug-graficos";
      box.style.cssText =
        "font:14px/1.4 Arial; background:#f7f7ff; border:1px solid #dcdcfb; padding:10px; margin:16px 0; border-radius:8px;";
      const host = document.querySelector("#graficos") || document.body;
      host.prepend(box);
    }
    return box;
  }
  function logLine(msg, ok = true) {
    const box = statusBox();
    const p = document.createElement("div");
    p.textContent = (ok ? "✅ " : "❌ ") + msg;
    p.style.color = ok ? "#1b5e20" : "#b71c1c";
    box.appendChild(p);
  }

  // ---------- Garante que a seção e os canvases existem ----------
  function ensureGraphSection() {
    let sec = document.getElementById("graficos");
    if (!sec) {
      sec = document.createElement("section");
      sec.id = "graficos";
      sec.style.margin = "40px 0";
      sec.innerHTML = `
        <h2>Gráficos do TCC</h2>

        <article style="margin:24px 0;">
          <h3>Histórico de Incidências (2000–2023)</h3>
          <canvas id="graficoHistorico"></canvas>
        </article>

        <article style="margin:24px 0;">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <h3 style="margin:0;">Modelo Preditivo até 2033</h3>
            <label><strong>Modelo:</strong></label>
            <select id="modelo">
              <option>Prophet</option>
              <option>ARIMA</option>
              <option>ETS</option>
            </select>
          </div>
          <canvas id="graficoPreditivo" style="margin-top:12px;"></canvas>
        </article>

        <article style="margin:24px 0;">
          <h3>Correlação: Índice UV × Casos</h3>
          <canvas id="graficoCorrelacao"></canvas>
        </article>
      `;
      // Insere antes do fim do <main>, se existir; senão, no body.
      const main = document.querySelector("main");
      (main || document.body).appendChild(sec);
      logLine("Seção #graficos criada automaticamente (canvases adicionados).");
    } else {
      // Garante canvases individuais
      if (!document.getElementById("graficoHistorico")) {
        const a = document.createElement("article");
        a.innerHTML = `<h3>Histórico de Incidências (2000–2023)</h3><canvas id="graficoHistorico"></canvas>`;
        sec.appendChild(a);
      }
      if (!document.getElementById("graficoPreditivo")) {
        const a = document.createElement("article");
        a.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <h3 style="margin:0;">Modelo Preditivo até 2033</h3>
            <label><strong>Modelo:</strong></label>
            <select id="modelo">
              <option>Prophet</option>
              <option>ARIMA</option>
              <option>ETS</option>
            </select>
          </div>
          <canvas id="graficoPreditivo" style="margin-top:12px;"></canvas>
        `;
        sec.appendChild(a);
      }
      if (!document.getElementById("graficoCorrelacao")) {
        const a = document.createElement("article");
        a.innerHTML = `<h3>Correlação: Índice UV × Casos</h3><canvas id="graficoCorrelacao"></canvas>`;
        sec.appendChild(a);
      }
    }
  }

  // ---------- Base da API ----------
  const API =
    location.port === "5056" || location.port === "5000"
      ? location.origin
      : "http://127.0.0.1:5056";
  logLine(`API base: ${API}`);

  // ---------- Checagem Chart.js ----------
  if (typeof Chart === "undefined") {
    logLine(
      'Chart.js NÃO está carregado. Adicione no <head>: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>',
      false
    );
    return;
  } else {
    logLine("Chart.js OK");
  }

  // ---------- Helpers ----------
  async function getJSON(path) {
    const url = `${API}${path}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    return res.json();
  }
  function el(id) {
    return document.getElementById(id);
  }
  function showError(where, err) {
    console.error(`[ERRO] ${where}:`, err);
    logLine(`${where} falhou: ${err?.message || err}`, false);
  }

  // ---------- 1) Histórico (barras) ----------
  async function renderHistorico() {
    const canvas = el("graficoHistorico");
    if (!canvas) {
      logLine("Canvas #graficoHistorico não encontrado no HTML.", false);
      return;
    }
    try {
      const data = await getJSON(`/api/incidencia/anual?start=2000&end=2023`);
      if (!Array.isArray(data) || data.length === 0)
        throw new Error("Sem dados para 2000–2023.");

      const anos = data.map((d) => d.ano);
      const casos = data.map((d) => d.casos);

      new Chart(canvas, {
        type: "bar",
        data: {
          labels: anos,
          datasets: [{ label: "Casos/ano", data: casos }],
        },
        options: {
          responsive: true,
          scales: {
            x: { title: { display: true, text: "Ano" } },
            y: { title: { display: true, text: "Casos" }, beginAtZero: true },
          },
        },
      });
      logLine("Histórico renderizado.");
    } catch (err) {
      showError("Histórico (2000–2023)", err);
    }
  }

  // ---------- 2) Preditivo (linha) com fallback Prophet → ARIMA → ETS ----------
  let chartPreditivo;
  async function tryModelo(modelo) {
    const data = await getJSON(
      `/api/preditivo/anual?modelo=${encodeURIComponent(modelo)}`
    );
    if (!Array.isArray(data) || data.length === 0)
      throw new Error(`Sem dados para o modelo '${modelo}'.`);
    return { modelo, data };
  }
  async function renderPreditivo() {
    const canvas = el("graficoPreditivo");
    if (!canvas) {
      logLine("Canvas #graficoPreditivo não encontrado no HTML.", false);
      return;
    }
    try {
      let got = null;
      for (const m of ["Prophet", "ARIMA", "ETS"]) {
        try {
          got = await tryModelo(m);
          break;
        } catch {
          /* tenta próximo */
        }
      }
      if (!got)
        throw new Error("Nenhum modelo (Prophet/ARIMA/ETS) retornou dados.");

      const { modelo, data } = got;
      const anos = data.map((d) => d.ano);
      const ponto = data.map((d) => d.point);
      const lo95 = data.map((d) => d.lo95);
      const hi95 = data.map((d) => d.hi95);

      if (chartPreditivo) chartPreditivo.destroy();
      chartPreditivo = new Chart(canvas, {
        type: "line",
        data: {
          labels: anos,
          datasets: [
            { label: `Previsão (${modelo})`, data: ponto, borderWidth: 2 },
            {
              label: "Intervalo 95% (baixo)",
              data: lo95,
              borderWidth: 1,
              pointRadius: 0,
            },
            {
              label: "Intervalo 95% (alto)",
              data: hi95,
              borderWidth: 1,
              pointRadius: 0,
            },
          ],
        },
        options: {
          responsive: true,
          interaction: { mode: "index", intersect: false },
          scales: {
            x: { title: { display: true, text: "Ano" } },
            y: { title: { display: true, text: "Casos (previstos)" } },
          },
        },
      });
      logLine(`Preditivo renderizado com modelo ${modelo}.`);

      // Troca manual do <select id="modelo"> se existir
      const sel = el("modelo");
      if (sel && !sel._bound) {
        sel._bound = true;
        sel.addEventListener("change", async (e) => {
          const chosen = e.target.value || "Prophet";
          try {
            const d = await getJSON(
              `/api/preditivo/anual?modelo=${encodeURIComponent(chosen)}`
            );
            if (!Array.isArray(d) || d.length === 0)
              throw new Error(`Sem dados para o modelo '${chosen}'.`);

            const anos2 = d.map((r) => r.ano);
            const ponto2 = d.map((r) => r.point);
            const lo952 = d.map((r) => r.lo95);
            const hi952 = d.map((r) => r.hi95);

            chartPreditivo.destroy();
            chartPreditivo = new Chart(canvas, {
              type: "line",
              data: {
                labels: anos2,
                datasets: [
                  { label: `Previsão (${chosen})`, data: ponto2, borderWidth: 2 },
                  {
                    label: "Intervalo 95% (baixo)",
                    data: lo952,
                    borderWidth: 1,
                    pointRadius: 0,
                  },
                  {
                    label: "Intervalo 95% (alto)",
                    data: hi952,
                    borderWidth: 1,
                    pointRadius: 0,
                  },
                ],
              },
            });
            logLine(`Preditivo atualizado para ${chosen}.`);
          } catch (err2) {
            showError(`Troca de modelo (${chosen})`, err2);
          }
        });
      }
    } catch (err) {
      showError("Preditivo", err);
    }
  }

  // ---------- 3) Correlação UV × Casos ----------
  async function renderCorrelacao() {
    const canvas = el("graficoCorrelacao");
    if (!canvas) {
      logLine("Canvas #graficoCorrelacao não encontrado no HTML.", false);
      return;
    }
    try {
      const data = await getJSON(
        `/api/correlacao/uv-incidencia?start=2000&end=2023`
      );
      if (!Array.isArray(data) || data.length === 0)
        throw new Error("Sem dados para correlação.");

      const temUV = data.some((d) => d.uv_medio != null);

      if (temUV) {
        // Scatter: cada ponto é um ano (x=UV, y=casos)
        const pontos = data
          .filter((d) => d.uv_medio != null)
          .map((d) => ({
            x: Number(d.uv_medio),
            y: Number(d.casos),
            _ano: d.ano,
          }));

        new Chart(canvas, {
          type: "scatter",
          data: { datasets: [{ label: "Ano (UV × Casos)", data: pontos, pointRadius: 4 }] },
          options: {
            responsive: true,
            plugins: {
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const p = ctx.raw;
                    return `Ano ${p._ano}: UV=${p.x.toFixed(2)}, Casos=${p.y}`;
                  },
                },
              },
            },
            scales: {
              x: { title: { display: true, text: "Índice UV (média anual)" } },
              y: { title: { display: true, text: "Casos (total anual)" }, beginAtZero: true },
            },
          },
        });
        logLine("Correlação renderizada (scatter UV × Casos).");
      } else {
        // Sem UV → plota só série de casos
        const anos = data.map((d) => d.ano);
        const casos = data.map((d) => d.casos);
        new Chart(canvas, {
          type: "line",
          data: { labels: anos, datasets: [{ label: "Casos/ano", data: casos }] },
          options: {
            responsive: true,
            scales: {
              x: { title: { display: true, text: "Ano" } },
              y: { title: { display: true, text: "Casos" }, beginAtZero: true },
            },
          },
        });
        logLine("Correlação: sem UV na base → renderizei só a série de casos.");
      }
    } catch (err) {
      showError("Correlação UV × Casos", err);
    }
  }

  // ---------- Inicialização ----------
  document.addEventListener("DOMContentLoaded", () => {
    logLine("DOM pronto.");
    ensureGraphSection();       // <= cria a seção/canvases se faltar
    renderHistorico();
    renderPreditivo();
    renderCorrelacao();
  });
})();
