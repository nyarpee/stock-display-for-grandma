let activeChartData = {};


const chartMetrics = {
    width: 900,
    height: 330,
    plotTop: 24,
    plotBottom: 248,
    plotLeft: 48,
    plotRight: 852,
    labelY: 296,
};


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
    updateChartCursor(range, getValidPoints(chart).length - 1);
}


function getValidPoints(chart) {
    return (chart?.points || []).filter(point => Number.isFinite(Number(point.close)));
}


function getChartRangeKey(chart) {
    return Object.entries(activeChartData).find(([, value]) => value === chart)?.[0] || "";
}


function getChartX(index, total) {
    if (total <= 1) {
        return chartMetrics.plotLeft;
    }

    return chartMetrics.plotLeft + (index / (total - 1)) * (chartMetrics.plotRight - chartMetrics.plotLeft);
}


function getChartY(value, min, max) {
    const range = max - min || 1;
    return chartMetrics.plotBottom - ((value - min) / range) * (chartMetrics.plotBottom - chartMetrics.plotTop);
}


function formatChartPrice(value) {
    return `${Math.round(Number(value)).toLocaleString()}\u5186`;
}


function formatChartDate(value, range = "", compact = false) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value || "");
    }

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    if (range === "1d") {
        return `${hour}:${minute}`;
    }

    if (compact || range === "1y" || range === "6m") {
        return `${month}/${day}`;
    }

    return `${month}/${day} ${hour}:${minute}`;
}


function getAxisLabelIndexes(points, range) {
    const maxLabels = range === "1d" ? 9 : range === "1m" ? 8 : 7;
    const count = Math.min(maxLabels, points.length);
    const indexes = new Set();

    for (let i = 0; i < count; i += 1) {
        indexes.add(Math.round((i / (count - 1 || 1)) * (points.length - 1)));
    }

    indexes.add(0);
    indexes.add(points.length - 1);
    return Array.from(indexes).sort((a, b) => a - b);
}


function renderAxisLabels(points, range) {
    return getAxisLabelIndexes(points, range).map(index => {
        const x = getChartX(index, points.length);
        const anchor = index === 0 ? "start" : index === points.length - 1 ? "end" : "middle";
        const label = formatChartDate(points[index].date, range, true);

        return `
            <line class="chart-grid-line" x1="${x.toFixed(2)}" y1="${chartMetrics.plotTop}" x2="${x.toFixed(2)}" y2="${chartMetrics.plotBottom}" />
            <text class="chart-axis-label" x="${x.toFixed(2)}" y="${chartMetrics.labelY}" text-anchor="${anchor}">${label}</text>
        `;
    }).join("");
}


function renderChartCursorMarkup(point, index, points, min, max, directionClass, range) {
    const x = getChartX(index, points.length);
    const y = getChartY(Number(point.close), min, max);
    const nearRight = x > chartMetrics.width - 250;
    const nearLeft = x < 250;
    const labelWidth = range === "1d" ? 210 : 238;
    const labelHeight = 74;
    const labelX = nearRight ? x - labelWidth - 14 : nearLeft ? x + 14 : x - labelWidth / 2;
    const labelY = Math.max(8, y - labelHeight - 16);
    const dateText = formatChartDate(point.date, range);
    const priceText = formatChartPrice(point.close);

    return `
        <line class="chart-cursor-line" x1="${x.toFixed(2)}" y1="${chartMetrics.plotTop}" x2="${x.toFixed(2)}" y2="${chartMetrics.plotBottom}" />
        <circle class="chart-cursor-dot ${directionClass}" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="8" />
        <g class="chart-cursor-label" transform="translate(${labelX.toFixed(2)} ${labelY.toFixed(2)})">
            <rect width="${labelWidth}" height="${labelHeight}" rx="14" />
            <text x="16" y="28">${dateText}</text>
            <text class="chart-cursor-price ${directionClass}" x="16" y="57">${priceText}</text>
        </g>
    `;
}


function updateChartCursor(range, index) {
    const chart = activeChartData[range];
    const points = getValidPoints(chart);
    const cursor = document.querySelector(`.chart-cursor[data-range="${range}"]`);

    if (!cursor || points.length < 2) {
        return;
    }

    const values = points.map(point => Number(point.close));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const first = Number(points[0].close);
    const last = Number(points[points.length - 1].close);
    const directionClass = last >= first ? "up" : "down";
    const selectedIndex = Math.max(0, Math.min(points.length - 1, Number(index) || 0));

    cursor.innerHTML = renderChartCursorMarkup(points[selectedIndex], selectedIndex, points, min, max, directionClass, range);
}


function getChartPointerX(event, svg) {
    const clientX = event.touches?.[0]?.clientX ?? event.clientX;

    if (svg.createSVGPoint && svg.getScreenCTM()) {
        const point = svg.createSVGPoint();
        point.x = clientX;
        point.y = event.touches?.[0]?.clientY ?? event.clientY;
        return point.matrixTransform(svg.getScreenCTM().inverse()).x;
    }

    const rect = svg.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * chartMetrics.width;
}


function moveChartCursor(event, range) {
    event.preventDefault();

    const chart = activeChartData[range];
    const points = getValidPoints(chart);
    const svg = event.currentTarget.querySelector(".chart-svg");

    if (!svg || points.length < 2) {
        return;
    }

    const pointerX = getChartPointerX(event, svg);
    const ratio = (pointerX - chartMetrics.plotLeft) / (chartMetrics.plotRight - chartMetrics.plotLeft);
    const index = Math.round(Math.max(0, Math.min(1, ratio)) * (points.length - 1));

    updateChartCursor(range, index);
}


function renderPriceChart(chart) {
    const points = getValidPoints(chart);

    if (points.length < 2) {
        return `<div class="chart-empty">\u5024\u52d5\u304d\u30c7\u30fc\u30bf\u304c\u307e\u3060\u3042\u308a\u307e\u305b\u3093</div>`;
    }

    const rangeKey = getChartRangeKey(chart);
    const values = points.map(point => Number(point.close));
    const min = Math.min(...values);
    const max = Math.max(...values);

    const path = points.map((point, index) => {
        const x = getChartX(index, points.length);
        const y = getChartY(Number(point.close), min, max);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");

    const first = Number(points[0].close);
    const last = Number(points[points.length - 1].close);
    const directionClass = last >= first ? "up" : "down";
    const lastIndex = points.length - 1;

    return `
        <div class="chart-interactive" onpointerdown="moveChartCursor(event, '${rangeKey}')" onpointermove="moveChartCursor(event, '${rangeKey}')">
            <svg class="chart-svg ${directionClass}" viewBox="0 0 ${chartMetrics.width} ${chartMetrics.height}" role="img" aria-label="\u5024\u52d5\u304d\u30c1\u30e3\u30fc\u30c8">
                <line class="chart-axis-line" x1="${chartMetrics.plotLeft}" y1="${chartMetrics.plotBottom}" x2="${chartMetrics.plotRight}" y2="${chartMetrics.plotBottom}" />
                <line class="chart-axis-line" x1="${chartMetrics.plotLeft}" y1="${chartMetrics.plotTop}" x2="${chartMetrics.plotLeft}" y2="${chartMetrics.plotBottom}" />
                <g class="chart-axis-labels">${renderAxisLabels(points, rangeKey)}</g>
                <path class="chart-price-line" d="${path}" />
                <g class="chart-cursor" data-range="${rangeKey}">
                    ${renderChartCursorMarkup(points[lastIndex], lastIndex, points, min, max, directionClass, rangeKey)}
                </g>
            </svg>
        </div>
        <div class="chart-values">
            <span>\u6700\u5b89 ${min.toLocaleString()}\u5186</span>
            <strong class="${directionClass}">\u76f4\u8fd1 ${last.toLocaleString()}\u5186</strong>
            <span>\u6700\u9ad8 ${max.toLocaleString()}\u5186</span>
        </div>
    `;
}
