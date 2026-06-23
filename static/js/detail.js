const statementTitles = [
    "\u640d\u76ca\u8a08\u7b97\u66f8",
    "\u8cb8\u501f\u5bfe\u7167\u8868",
    "\u30ad\u30e3\u30c3\u30b7\u30e5\u30d5\u30ed\u30fc",
    "\u914d\u5f53\u5c65\u6b74",
    "\u682a\u5f0f\u5206\u5272\u5c65\u6b74",
];


async function openDetail(code) {
    isDetailOpen = true;
    clearEndIdleTimer();
    pauseTicker();

    const detail = document.getElementById("detail");
    const content = document.getElementById("detail-content");

    detail.classList.remove("hidden");
    document.getElementById("detail-title").textContent = "\u8aad\u307f\u8fbc\u307f\u4e2d...";
    document.getElementById("detail-subtitle").textContent = "";
    content.innerHTML = "";

    try {
        const response = await fetch(`/api/stock/${code}`);

        if (!response.ok) {
            throw new Error("\u8a73\u3057\u3044\u60c5\u5831\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f");
        }

        const data = await response.json();
        const companyName = data.summary?.name || getCompanyName(data) || data.symbol || code;
        activeChartData = data.charts || {};

        document.getElementById("detail-title").textContent = companyName;
        document.getElementById("detail-subtitle").textContent = data.symbol || code;

        content.innerHTML = `
            ${renderDetailSummary(data, companyName)}
            ${renderChartSection(activeChartData)}
            ${renderSection("\u57fa\u672c\u60c5\u5831", data.basic)}
            ${renderProfileSummaries(data.profile_text)}
            ${renderSection("\u682a\u4fa1\u60c5\u5831", data.price)}
            ${renderSection("\u6307\u6a19", data.valuation)}
            ${renderSection("\u914d\u5f53", data.dividend)}
            ${renderSection("\u8ca1\u52d9\u6982\u8981", data.financials)}
            ${renderAllStatementTables(data.statements)}
        `;
    } catch (error) {
        document.getElementById("detail-title").textContent = "\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f";
        content.innerHTML = `<p class="detail-summary">${error.message}</p>`;
    }
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
            </div>
        </section>
    `;
}


function renderSection(title, obj) {
    if (!obj) return "";

    const items = Object.entries(obj)
        .filter(([_, value]) => value !== null && value !== undefined && value !== "")
        .map(([key, value]) => `
            <div class="detail-item">
                <div class="detail-key">${key}</div>
                <div class="detail-value">${formatDisplayValue(value)}</div>
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


function formatDisplayValue(value) {
    if (value === null || value === undefined || value === "") {
        return "\u4e0d\u660e";
    }

    if (typeof value === "number") {
        return value.toLocaleString();
    }

    return value;
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
                                    <td>${formatDisplayValue(statement[date][row])}</td>
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
                <td>${formatDisplayValue(value)}</td>
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
    return key;
}
