const statementTitles = [
    "\u640d\u76ca\u8a08\u7b97\u66f8",
    "\u8cb8\u501f\u5bfe\u7167\u8868",
    "\u914d\u5f53\u5c65\u6b74",
    "\u682a\u5f0f\u5206\u5272\u5c65\u6b74",
];

const financialLabels = {
    "Common Stock Dividend Paid": "\u666e\u901a\u682a\u5f0f\u914d\u5f53\u652f\u6255",
    "Gain Loss On Sale Of PPE": "\u6709\u5f62\u56fa\u5b9a\u8cc7\u7523\u58f2\u5374\u640d\u76ca",
    "Short Term Debt Issuance": "\u77ed\u671f\u501f\u5165\u91d1\u306e\u8abf\u9054",
    "Short Term Debt Payments": "\u77ed\u671f\u501f\u5165\u91d1\u306e\u8fd4\u6e08",
    "Restructuring And Mergern Acquisition": "\u4e8b\u696d\u518d\u7de8\u30fbM&A\u8cbb\u7528",
    "General And Administrative Expense": "\u4e00\u822c\u7ba1\u7406\u8cbb",
    "Research And Development": "\u7814\u7a76\u958b\u767a\u8cbb",
    "Other Investments": "\u305d\u306e\u4ed6\u6295\u8cc7",
    "Other Short Term Investments": "\u305d\u306e\u4ed6\u77ed\u671f\u6295\u8cc7",
    "Taxes Receivable": "\u672a\u53ce\u7a0e\u91d1",
    "Tradeand Other Payables Non Current": "\u9577\u671f\u55b6\u696d\u50b5\u52d9\u53ca\u3073\u305d\u306e\u4ed6\u50b5\u52d9",
    "Non Current Prepaid Assets": "\u9577\u671f\u524d\u6255\u8cc7\u7523",
};


async function openDetail(code, preferredName = "", preferredDividendYield = "") {
    isDetailOpen = true;
    clearEndIdleTimer();
    pauseTicker();

    const detail = document.getElementById("detail");
    const content = document.getElementById("detail-content");
    const scrollArea = detail.querySelector(".detail-scroll");

    detail.classList.remove("hidden");
    if (scrollArea) {
        scrollArea.scrollTop = 0;
    }

    document.getElementById("detail-title").textContent = "\u8aad\u307f\u8fbc\u307f\u4e2d...";
    document.getElementById("detail-subtitle").textContent = "";
    content.innerHTML = renderDetailLoading(code);

    try {
        const response = await fetch(`/api/stock/${code}`);

        if (!response.ok) {
            throw new Error("\u8a73\u3057\u3044\u60c5\u5831\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f");
        }

        const data = await response.json();
        const companyName = preferredName || data.summary?.name || getCompanyName(data) || data.symbol || code;
        if (preferredDividendYield && data.dividend) {
            data.dividend["\u914d\u5f53\u5229\u56de\u308a"] = preferredDividendYield;
        }

        activeChartData = data.charts || {};
        window.currentDetailFavoriteStock = {
            code: data.summary?.code || data.code || data.symbol || code,
            name: companyName,
            price: data.summary?.current_price ?? "",
            change: data.summary?.change ?? "",
            dividend_yield: preferredDividendYield,
        };

        document.getElementById("detail-title").textContent = companyName;
        document.getElementById("detail-subtitle").textContent = data.symbol || code;

        content.innerHTML = `
            ${renderDetailSummary(data, companyName)}
            ${renderChartSection(activeChartData)}
            ${renderSection("\u57fa\u672c\u60c5\u5831", data.basic)}
            ${renderProfileSummaries(data.profile_text)}
            ${renderSection("\u682a\u4fa1\u60c5\u5831", data.price, { yen: true, excludeYenKeys: ["\u51fa\u6765\u9ad8"] })}
            ${renderSection("\u6307\u6a19", data.valuation)}
            ${renderSection("\u914d\u5f53", data.dividend, { dividend: true })}
            ${renderSection("\u8ca1\u52d9\u6982\u8981", data.financials, { yen: true })}
            ${renderAllStatementTables(data.statements)}
        `;

        if (typeof refreshFavoriteButtons === "function") {
            refreshFavoriteButtons();
        }
        if (typeof recordFavoriteOpen === "function") {
            recordFavoriteOpen(window.currentDetailFavoriteStock.code);
        }
    } catch (error) {
        document.getElementById("detail-title").textContent = "\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f";
        content.innerHTML = `<p class="detail-summary">${error.message}</p>`;
    }
}


function renderDetailLoading(code) {
    return `
        <section class="detail-loading">
            <div class="detail-loading-spinner" aria-hidden="true"></div>
            <div>
                <p class="detail-loading-title">\u8a73\u7d30\u3092\u8aad\u307f\u8fbc\u3093\u3067\u3044\u307e\u3059</p>
                <p class="detail-loading-sub">${code}\u306e\u682a\u4fa1\u30fb\u57fa\u672c\u60c5\u5831\u30fb\u30c1\u30e3\u30fc\u30c8\u3092\u53d6\u5f97\u4e2d\u3067\u3059</p>
            </div>
        </section>
    `;
}


function closeDetail() {
    isDetailOpen = false;
    document.getElementById("detail").classList.add("hidden");
    resumeTickerLater();
    watchEndIdleReset();
}


function getCompanyName(data) {
    const basicValues = Object.values(data.basic || {});
    const candidates = [
        ...basicValues,
        data.symbol,
        data.code,
    ];

    return candidates.find(value => {
        if (!value) return false;

        const text = String(value);
        return !text.startsWith("http://") && !text.startsWith("https://");
    }) || "";
}


function getNumericValues(obj) {
    return Object.values(obj || {})
        .map(value => {
            if (typeof value === "number") return value;
            if (typeof value === "string") return Number(value.replace(/,/g, ""));
            return Number(value);
        })
        .filter(value => Number.isFinite(value));
}


function getPriceSummary(data) {
    if (data.summary) {
        return {
            current: normalizeNumber(data.summary.current_price),
            previous: normalizeNumber(data.summary.previous_close),
            diff: normalizeNumber(data.summary.change),
            percent: normalizeNumber(data.summary.change_percent),
        };
    }

    const values = getNumericValues(data.price);
    const current = values[0];
    const previous = values[1];
    const diff = Number.isFinite(current) && Number.isFinite(previous) ? current - previous : null;
    const percent = diff !== null && previous ? (diff / previous) * 100 : null;

    return { current, previous, diff, percent };
}


function normalizeNumber(value) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
        const number = Number(value.replace(/,/g, ""));
        return Number.isFinite(number) ? number : null;
    }

    return null;
}


function renderDetailSummary(data, companyName) {
    const price = getPriceSummary(data);
    const summaryCode = data.summary?.code || data.code || data.symbol || "";
    const currentText = Number.isFinite(price.current)
        ? `${price.current.toLocaleString()}\u5186`
        : "\u4e0d\u660e";
    const diffClass = price.diff === null || price.diff >= 0 ? "up" : "down";
    const diffText = price.diff === null
        ? "\u524d\u65e5\u6bd4\u4e0d\u660e"
        : `${price.diff >= 0 ? "+" : ""}${price.diff.toLocaleString()}\u5186 / ${price.percent >= 0 ? "+" : ""}${price.percent.toFixed(2)}%`;

    return `
        <section class="detail-sticky-summary">
            <div class="detail-summary-name">
                <span class="detail-summary-code">${summaryCode}</span>
                <strong>${companyName}</strong>
            </div>
            <div class="detail-summary-price">
                <span>${currentText}</span>
                <strong class="${diffClass}">${diffText}</strong>
                <button class="favorite-button detail-favorite-button" type="button" aria-label="\u304a\u6c17\u306b\u5165\u308a" onclick="toggleFavoriteFromCurrentDetail(event)">\u2606</button>
            </div>
        </section>
    `;
}


function renderSection(title, obj, options = {}) {
    if (!obj) return "";

    const items = Object.entries(obj)
        .filter(([_, value]) => value !== null && value !== undefined && value !== "")
        .map(([key, value]) => `
            <div class="detail-item">
                <div class="detail-key">${key}</div>
                <div class="detail-value ${getValueClass(value)}">${formatDisplayValue(value, key, options)}</div>
            </div>
        `)
        .join("");

    if (!items) return "";

    return `
        <section class="detail-section">
            <h3>${title}</h3>
            <div class="detail-grid">
                ${items}
            </div>
        </section>
    `;
}


function renderProfileSummaries(profileText) {
    if (!profileText) {
        return "";
    }

    const values = Object.values(profileText).filter(value => value);
    const titles = ["\u7279\u8272", "\u95a2\u9023\u4e8b\u696d"];

    return values
        .map((text, index) => renderSummary(titles[index] || "\u4f1a\u793e\u7d39\u4ecb", text))
        .join("");
}


function renderSummary(title, text) {
    if (!text) return "";

    return `
        <section class="detail-section">
            <h3>${title}</h3>
            <p class="detail-summary">${text}</p>
        </section>
    `;
}


function renderAllStatementTables(statements) {
    if (!statements) {
        return "";
    }

    return Object.values(statements)
        .map((statement, index) => renderStatementTable(statementTitles[index] || "\u8cc7\u6599", statement))
        .join("");
}


function formatDisplayValue(value, key = "", options = {}) {
    if (value === null || value === undefined || value === "") {
        return "\u4e0d\u660e";
    }

    const number = normalizeNumber(value);

    if (options.dividend) {
        if (typeof value === "string" && value.includes("%")) {
            return value;
        }

        if (key.includes("\u5229\u56de\u308a") || key.includes("\u6027\u5411")) {
            return Number.isFinite(number) ? formatPercentValue(number) : value;
        }

        if (key.includes("\u914d\u5f53")) {
            return Number.isFinite(number) ? `${number.toLocaleString()}\u5186` : value;
        }
    }

    if (options.yen && !(options.excludeYenKeys || []).includes(key)) {
        return Number.isFinite(number) ? `${number.toLocaleString()}\u5186` : value;
    }

    if (typeof value === "number") {
        return value.toLocaleString();
    }

    return value;
}


function formatPercentValue(number) {
    const percent = Math.abs(number) <= 1 ? number * 100 : number;
    return `${percent.toFixed(2)}%`;
}


function getValueClass(value) {
    const number = normalizeNumber(value);

    if (!Number.isFinite(number) || number === 0) {
        return "";
    }

    return number > 0 ? "positive-value" : "negative-value";
}


function renderStatementTable(title, statement) {
    if (!statement || Object.keys(statement).length === 0) return "";

    const firstValue = Object.values(statement)[0];

    if (!isPlainObject(firstValue)) {
        return renderSeriesTable(title, statement);
    }

    const dates = Object.keys(statement);
    const rows = new Set();

    dates.forEach(date => {
        Object.keys(statement[date]).forEach(key => rows.add(key));
    });

    if (rows.size === 0) return "";

    return `
        <section class="detail-section">
            <h3>${title}</h3>
            <div class="statement-table-wrap">
                <table class="statement-table">
                    <thead>
                        <tr>
                            <th>\u9805\u76ee</th>
                            ${dates.map(date => `<th>${date}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.from(rows).map(row => `
                            <tr>
                                <th>${translateFinancialKey(row)}</th>
                                ${dates.map(date => `
                                    <td class="${getValueClass(statement[date][row])}">${formatDisplayValue(statement[date][row], row, { yen: true })}</td>
                                `).join("")}
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}


function renderSeriesTable(title, series) {
    const rows = Object.entries(series)
        .filter(([_, value]) => value !== null && value !== undefined && value !== "")
        .map(([date, value]) => `
            <tr>
                <th>${date}</th>
                <td class="${getValueClass(value)}">${formatDisplayValue(value, date, { yen: true })}</td>
            </tr>
        `)
        .join("");

    if (!rows) return "";

    return `
        <section class="detail-section">
            <h3>${title}</h3>
            <div class="statement-table-wrap">
                <table class="statement-table">
                    <thead>
                        <tr>
                            <th>\u65e5\u4ed8</th>
                            <th>\u5024</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </section>
    `;
}


function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}


function translateFinancialKey(key) {
    return financialLabels[key] || key;
}
