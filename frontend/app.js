const config = window.STOCK_PREDICTION_CONFIG || {};
const apiBaseUrl = (config.apiBaseUrl || "http://localhost:8000").replace(/\/$/, "");

const form = document.querySelector("#stock-form");
const input = document.querySelector("#stock-input");
const button = document.querySelector("#analyze-button");
const notice = document.querySelector("#notice");
const results = document.querySelector("#results");
const rows = document.querySelector("#prediction-rows");
const chart = document.querySelector("#prediction-chart");

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function setNotice(message, type = "") {
  notice.textContent = message;
  notice.className = `notice ${type}`;
}

function setLoading(loading) {
  button.disabled = loading;
  button.querySelector("span:first-child").textContent = loading ? "Analyzing..." : "Run forecast";
  input.disabled = loading;
}

function renderPredictions(stock, payload) {
  const predictions = payload.next_60_days || [];
  const first = predictions[0];
  const last = predictions[predictions.length - 1];
  const delta = first && last ? ((Number(last.Predicted_Close) - Number(first.Predicted_Close)) / Number(first.Predicted_Close)) * 100 : 0;

  document.querySelector("#result-title").innerHTML = `${stock} <span>forecast</span>`;
  document.querySelector("#last-date").textContent = payload.last_market_date || "—";
  document.querySelector("#day-sixty").textContent = last ? formatPrice(last.Predicted_Close) : "—";
  document.querySelector("#change-label").textContent = Number.isFinite(delta) ? `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}% across forecast` : "Model projection";
  document.querySelector("#last-updated").textContent = `Updated for ${stock} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  rows.innerHTML = predictions.slice(0, 10).map((prediction, index) => `
    <tr><td><span class="row-index">${String(index + 1).padStart(2, "0")}</span>${prediction.Date}</td><td>${formatPrice(prediction.Predicted_Close)}</td></tr>
  `).join("");

  const chartUrl = payload.charts?.prediction || `/download_chart/${encodeURIComponent(stock)}/prediction`;
  chart.src = `${apiBaseUrl}${chartUrl}${chartUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
  chart.alt = `${stock} historical and predicted closing prices`;
  const csv = ["Date,Predicted_Close", ...predictions.map((prediction) => `${prediction.Date},${prediction.Predicted_Close}`)].join("\n");
  document.querySelector("#csv-link").href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  document.querySelector("#csv-link").download = `${stock}_predictions.csv`;
  results.hidden = false;
  results.classList.remove("revealed");
  requestAnimationFrame(() => results.classList.add("revealed"));
}

async function analyzeStock(stock) {
  setLoading(true);
  setNotice("Fetching recent market history and generating the forecast…", "loading");
  results.hidden = true;

  try {
    const body = new FormData();
    body.append("stock", stock);
    const response = await fetch(`${apiBaseUrl}/analyze_stock`, { method: "POST", body });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "The backend could not analyze this symbol.");

    const predictionsResponse = await fetch(`${apiBaseUrl}/get_predictions/${encodeURIComponent(stock)}`);
    const predictionData = await predictionsResponse.json();
    if (!predictionsResponse.ok) throw new Error(predictionData.error || "Predictions were generated but could not be loaded.");
    renderPredictions(stock, predictionData);
    setNotice(payload.message || "Forecast ready.", "success");
  } catch (error) {
    setNotice(`${error.message} Check that the FastAPI server is running at ${apiBaseUrl}.`, "error");
  } finally {
    setLoading(false);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const stock = input.value.trim().toUpperCase();
  if (stock) analyzeStock(stock);
});

document.querySelectorAll(".symbol-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    input.value = chip.dataset.symbol;
    input.focus();
  });
});
