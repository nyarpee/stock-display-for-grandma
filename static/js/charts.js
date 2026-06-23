let activeChartData = {};


function renderChartSection(charts) {
    const activeRange = getInitialChartRange(charts);

    if (!activeRange) {
        return `
            <section class="detail-section chart-section">
                <h3>\u5024\u52d5\u304d</h3>
                <p class="detail-summary">\u30c1\u30e3\u30fc\u30c8\u30c7\u30fc\u30bf\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f</p>
            </section>
        `;
    }

    return `
        <section class="detail-section chart-section">
            <div class="chart-heading">
                <h3>\u5024\u52d5\u304d</h3>
                <div class="chart-tabs">
                    ${Object.entries(charts).map(([range, chart]) => `
                        <button
                            class="chart-tab ${range === activeRange ? "active" : ""}"
                            type="button"
                            onclick="selectChartRange('${range}')"
                        >
                            ${chart.label || range}
                        </button>
                    `).join("")}
                </div>
            </div>
            <div id="price-chart" class="price-chart">
                ${renderPriceChart(charts[activeRange])}
            </div>
        </section>
    `;
}


function getInitialChartRange(charts) {
    const preferred = ["1d", "1w", "1m", "6m", "1y"];
    return preferred.find(range => charts?.[range]?.points?.length > 1) || "";
}


function selectChartRange(range) {
    const chart = activeChartData[range];
    const chartEl = document.getElementById("price-chart");

    if (!chartEl || !chart) {
        return;
    }

    document.querySelectorAll(".chart-tab").forEach(tab => {
        tab.classList.toggle("active", tab.getAttribute("onclick") === `selectChartRange('${range}')`);
    });

    chartEl.innerHTML = renderPriceChart(chart);
}


function renderPriceChart(chart) {
    const points = chart?.points || [];

    if (points.length < 2) {
        return `<div class="chart-empty">\u5024\u52d5\u304d\u30c7\u30fc\u30bf\u304c\u307e\u3060\u3042\u308a\u307e\u305b\u3093</div>`;
    }

    const width = 900;
    const height = 260;
    const padding = 24;
    const values = points.map(point => Number(point.close)).filter(value => Number.isFinite(value));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const path = points.map((point, index) => {
        const x = padding + (index / (points.length - 1)) * (width - padding * 2);
        const y = height - padding - ((Number(point.close) - min) / range) * (height - padding * 2);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");

    const first = Number(points[0].close);
    const last = Number(points[points.length - 1].close);
    const directionClass = last >= first ? "up" : "down";

    return `
        <svg class="chart-svg ${directionClass}" viewBox="0 0 ${width} ${height}" role="img" aria-label="\u5024\u52d5\u304d\u30c1\u30e3\u30fc\u30c8">
            <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
            <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
            <path d="${path}" />
        </svg>
        <div class="chart-values">
            <span>\u6700\u5b89 ${min.toLocaleString()}\u5186</span>
            <strong class="${directionClass}">\u76f4\u8fd1 ${last.toLocaleString()}\u5186</strong>
            <span>\u6700\u9ad8 ${max.toLocaleString()}\u5186</span>
        </div>
    `;
}
