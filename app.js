const form = document.querySelector("#backtest-form");
const statusEl = document.querySelector("#status");
const fileInput = document.querySelector("#csv-file");
const sampleButton = document.querySelector("#sample-data");
const canvas = document.querySelector("#equity-chart");
const ctx = canvas.getContext("2d");

const metricEls = {
  annualReturn: document.querySelector("#annual-return"),
  sharpe: document.querySelector("#sharpe"),
  drawdown: document.querySelector("#drawdown"),
  trades: document.querySelector("#trades"),
};

const tableBody = document.querySelector("#result-table");
let importedRows = null;

document.querySelector("#end-date").valueAsDate = new Date();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const params = getParams();
  setStatus("正在拉取股票数据...");

  try {
    const rows = importedRows || (await fetchMarketData(params.symbol, params.startDate, params.endDate));
    runAndRender(rows, params, importedRows ? "使用导入 CSV 数据完成回测。" : "在线数据拉取完成。");
  } catch (error) {
    const fallback = generateSampleData(params.startDate, params.endDate);
    runAndRender(fallback, params, `在线拉取失败，已切换到演示数据：${error.message}`);
  }
});

sampleButton.addEventListener("click", () => {
  importedRows = null;
  const params = getParams();
  const rows = generateSampleData(params.startDate, params.endDate);
  runAndRender(rows, params, "已载入演示数据。");
});

fileInput.addEventListener("change", async () => {
  const [file] = fileInput.files;
  if (!file) return;

  try {
    importedRows = parseCsv(await file.text());
    const params = getParams();
    runAndRender(importedRows, params, `已导入 ${file.name}，共 ${importedRows.length} 条价格。`);
  } catch (error) {
    importedRows = null;
    setStatus(`CSV 解析失败：${error.message}`);
  }
});

function getParams() {
  const data = new FormData(form);
  return {
    symbol: String(data.get("symbol") || "AAPL").trim().toUpperCase(),
    startDate: String(data.get("startDate")),
    endDate: String(data.get("endDate")),
    lookback: Number(data.get("lookback")),
    threshold: Number(data.get("threshold")),
    cost: Number(data.get("cost")),
    riskFree: Number(data.get("riskFree")),
  };
}

async function fetchMarketData(symbol, startDate, endDate) {
  const yahooRows = await fetchYahoo(symbol, startDate, endDate).catch(() => []);
  if (yahooRows.length > 80) return yahooRows;

  const stooqRows = await fetchStooq(symbol, startDate, endDate).catch(() => []);
  if (stooqRows.length > 80) return stooqRows;

  throw new Error("没有获得足够的日线价格");
}

async function fetchYahoo(symbol, startDate, endDate) {
  const period1 = Math.floor(new Date(`${startDate}T00:00:00Z`).getTime() / 1000);
  const period2 = Math.floor(new Date(`${endDate}T23:59:59Z`).getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=history`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Yahoo HTTP ${response.status}`);
  const payload = await response.json();
  const result = payload.chart?.result?.[0];
  if (!result?.timestamp || !result.indicators?.quote?.[0]) return [];

  const quote = result.indicators.quote[0];
  const adjusted = result.indicators.adjclose?.[0]?.adjclose || quote.close;
  return result.timestamp
    .map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      open: quote.open[index],
      high: quote.high[index],
      low: quote.low[index],
      close: adjusted[index],
      volume: quote.volume[index],
    }))
    .filter((row) => Number.isFinite(row.close));
}
