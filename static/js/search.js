let searchCode = "";
let searchedStockCode = "";
let searchedStockName = "";
let searchRequestId = 0;


function isSearchPage() {
    return getCurrentRanking() === "search";
}


function getCodeDisplay() {
    return document.getElementById("code-display");
}


function getSearchResultCard() {
    return document.getElementById("search-result-card");
}


function updateCodeDisplay() {
    const display = getCodeDisplay();
    if (!display) {
        return;
    }

    display.textContent = searchCode.padEnd(4, "-");
}


function pressCodeCharacter(character) {
    if (!isSearchPage() || searchCode.length >= 4) {
        return;
    }

    const normalizedCharacter = String(character || "").trim().toUpperCase().replace(/[^0-9A-Z]/g, "");

    if (!normalizedCharacter) {
        return;
    }

    searchCode += normalizedCharacter.slice(0, 1);
    updateCodeDisplay();

    if (searchCode.length === 4) {
        searchStockByCode(searchCode);
    } else {
        renderSearchMessage(
            "4\u3051\u305f\u306e\u9298\u67c4\u30b3\u30fc\u30c9\u3092\u5165\u529b",
            "7203\u3084285A\u306a\u3069\u3067\u691c\u7d22\u3067\u304d\u307e\u3059"
        );
    }
}


function pressCodeNumber(number) {
    pressCodeCharacter(number);
}


function pressCodeLetter(letter) {
    pressCodeCharacter(letter);
}


function deleteCodeNumber() {
    if (!isSearchPage()) {
        return;
    }

    searchCode = searchCode.slice(0, -1);
    searchedStockCode = "";
    searchedStockName = "";
    updateCodeDisplay();
    renderSearchMessage(
        searchCode ? "\u7d9a\u304d\u3092\u5165\u529b" : "4\u3051\u305f\u306e\u9298\u67c4\u30b3\u30fc\u30c9\u3092\u5165\u529b",
        "\u898b\u305f\u3044\u682a\u306e\u756a\u53f7\u3084\u82f1\u5b57\u3092\u62bc\u3057\u3066\u304f\u3060\u3055\u3044"
    );
}


function renderSearchMessage(title, message, loading = false) {
    const card = getSearchResultCard();
    if (!card) {
        return;
    }

    card.innerHTML = `
        <div class="${loading ? "search-spinner" : "search-symbol"}">${loading ? "" : "?"}</div>
        <p class="search-empty-main">${title}</p>
        <p class="search-empty-sub">${message}</p>
    `;
}


function renderSearchResult(stock) {
    const card = getSearchResultCard();
    if (!card) {
        return;
    }

    card.innerHTML = "";
    const tile = createStockTile(stock, 1, "search");
    tile.classList.add("search-stock-tile");
    card.appendChild(tile);

    if (typeof refreshFavoriteButtons === "function") {
        refreshFavoriteButtons();
    }
}


async function searchStockByCode(code) {
    const requestId = ++searchRequestId;
    searchedStockCode = "";
    searchedStockName = "";
    renderSearchMessage("\u78ba\u8a8d\u3057\u3066\u3044\u307e\u3059", `${code}\u306e\u60c5\u5831\u3092\u53d6\u5f97\u4e2d\u3067\u3059`, true);

    try {
        const response = await fetch(`/api/stock-card/${encodeURIComponent(code)}`);

        if (!response.ok) {
            throw new Error();
        }

        const stock = await response.json();
        if (requestId !== searchRequestId) {
            return;
        }

        if (!stock.name || stock.name === code) {
            throw new Error();
        }

        searchedStockCode = stock.code;
        searchedStockName = stock.name;
        renderSearchResult(stock);
    } catch (_) {
        if (requestId !== searchRequestId) {
            return;
        }

        renderSearchMessage(
            "\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f",
            "\u9298\u67c4\u30b3\u30fc\u30c9\u3092\u78ba\u8a8d\u3057\u3066\u3001\u3082\u3046\u4e00\u5ea6\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044"
        );
    }
}


function openSearchedStock() {
    if (!isSearchPage()) {
        return;
    }

    if (searchCode.length !== 4) {
        renderSearchMessage(
            "4\u3051\u305f\u306e\u30b3\u30fc\u30c9\u304c\u5fc5\u8981\u3067\u3059",
            "\u4f8b\u3048\u30707203\u3084285A\u306e\u3088\u3046\u306b\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044"
        );
        return;
    }

    openDetail(searchedStockCode || searchCode, searchedStockName, "");
}


document.addEventListener("DOMContentLoaded", () => {
    if (!isSearchPage()) {
        return;
    }

    updateCodeDisplay();
});
