document.addEventListener("DOMContentLoaded", () => {
    if (getCurrentRanking() !== "japan") {
        return;
    }

    const root = document.getElementById("market-chart-root");
    const overview = window.marketOverview || {};
    const charts = overview.main?.charts || {};

    if (!root) {
        return;
    }

    activeChartData = charts;
    root.innerHTML = renderChartSection(charts);
});
