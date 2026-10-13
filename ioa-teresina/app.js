const BR = new Intl.NumberFormat("pt-BR");
const PCT = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

const metricNames = [
  "Base acionada por WhatsApp",
  "Anuencias",
  "Taxa de anuencia",
  "Responderam ao convite",
  "Conclusao apos anuencia",
  "Interessados em iniciar tratamento",
  "Leram e nao responderam",
  "Falha de envio",
];

const kpiNames = [
  "Anuencias",
  "Taxa de resposta ao convite",
  "Interessados em iniciar tratamento",
  "Leram e nao responderam",
  "Leads que nao receberam convite",
];

function byName(rows, name) {
  return rows.find((row) => row.Indicador === name);
}

function format(value, unit) {
  if (value === null || value === undefined || value === "") return "n/d";
  if (unit === "%") return PCT.format(value);
  if (unit === "nota 0-10") return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return BR.format(value);
}

function deltaClass(value, invert = false) {
  if (!value) return "neutral";
  const worse = invert ? value > 0 : value < 0;
  return worse ? "bad" : "good";
}

function renderKpis(data) {
  const kpis = document.querySelector("#kpis");
  const rows = kpiNames.map((name) => byName(data.indicadores, name)).filter(Boolean);
  const notInvited = byName(data.segmentos, "Leads que nao receberam convite");
  rows.push(notInvited);

  kpis.innerHTML = rows
    .slice(0, 5)
    .map((row) => {
      const value = row["Valor Relatorio 2"] ?? row.Valor;
      const unit = row.Unidade === "% anuencia" ? "%" : row.Unidade;
      const delta = row["Variacao absoluta"];
      const invert = ["Nao responderam", "Leram e nao responderam", "Falha de envio"].includes(row.Indicador);
      const deltaText = delta === null || delta === undefined || delta === "" ? "Relatório 2" : `${delta > 0 ? "+" : ""}${format(delta, unit)}`;
      return `
        <article class="kpi">
          <div class="label">${row.Indicador}</div>
          <div class="value">${format(value, unit)}</div>
          <div class="delta ${deltaClass(delta, invert)}">${deltaText}</div>
        </article>
      `;
    })
    .join("");
}

function renderBars(data) {
  const rows = metricNames.map((name) => byName(data.indicadores, name)).filter(Boolean);
  const max = Math.max(...rows.flatMap((row) => [row["Valor Relatorio 1"], row["Valor Relatorio 2"]].filter((value) => typeof value === "number")));
  document.querySelector("#bars").innerHTML = rows
    .map((row) => {
      const unit = row.Unidade;
      const one = row["Valor Relatorio 1"];
      const two = row["Valor Relatorio 2"];
      const w1 = unit === "%" ? one * 100 : (one / max) * 100;
      const w2 = unit === "%" ? two * 100 : (two / max) * 100;
      return `
        <div class="bar-row">
          <div class="bar-label">${row.Indicador}</div>
          <div class="bar-track">
            <div class="bar"><span style="width:${Math.max(w1, 2)}%"></span></div>
            <div class="bar"><span style="width:${Math.max(w2, 2)}%"></span></div>
          </div>
          <div class="bar-value">${format(one, unit)} / ${format(two, unit)}</div>
        </div>
      `;
    })
    .join("");
}

function renderRecovery(data) {
  const names = ["Leads que nao receberam convite", "Leads sem cadastro na plataforma", "Leads sem fluxo de perguntas"];
  const rows = names.map((name) => byName(data.segmentos, name)).filter(Boolean);
  document.querySelector("#recovery").innerHTML = rows
    .map((row) => `
      <div class="recovery-item">
        <span>${row.Indicador}</span>
        <strong>${format(row.Valor, row.Unidade)}</strong>
        <span>${PCT.format(row.Percentual)} da base</span>
      </div>
    `)
    .join("");
}

function renderActions(data) {
  document.querySelector("#actions").innerHTML = data.acoes
    .map((row) => `
      <div class="action">
        <strong>${row.Acao}</strong>
        <span>${row.Publico}</span>
        <span class="pill ${String(row.Prioridade).toLowerCase()}">${row.Prioridade}</span>
        <small>${row["Proximo passo"]}</small>
      </div>
    `)
    .join("");
}

async function init() {
  const response = await fetch("data/indicadores.json");
  const data = await response.json();
  document.querySelector("#periodo").textContent = data.periodo;
  document.querySelector("#leitura").textContent = data.leituraExecutiva;
  document.querySelector("#updated").textContent = `Atualizado em ${data.atualizadoEm.split("-").reverse().join("/")}`;
  renderKpis(data);
  renderBars(data);
  renderRecovery(data);
  renderActions(data);
}

init().catch((error) => {
  document.querySelector("#leitura").textContent = "Nao foi possivel carregar os dados do dashboard.";
  console.error(error);
});
