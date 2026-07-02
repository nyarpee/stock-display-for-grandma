const FAVORITES_STORAGE_KEY = "stock-display-favorites-v1";

let favoriteStocks = [];
let favoritesReady = null;


function normalizePreviousDayChange(change) {
    const text = String(change ?? "").trim();
    const percentMatch = text.match(/[+-]?\d+(?:\.\d+)?%/);
    return percentMatch ? percentMatch[0] : text;
}


function normalizeFavoriteStock(stock) {
    return {
        code: String(stock?.code || "").trim().toUpperCase(),
        name: String(stock?.name || stock?.code || "").trim(),
        price: String(stock?.price ?? "").trim(),
        change: normalizePreviousDayChange(stock?.change),
        dividend_yield: String(stock?.dividend_yield ?? stock?.dividendYield ?? "").trim(),
    };
}


async function fetchFavorites() {
    const response = await fetch("/api/favorites");

    if (!response.ok) {
        throw new Error("\u304a\u6c17\u306b\u5165\u308a\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f");
    }

    favoriteStocks = await response.json();
    return favoriteStocks;
}


function getLegacyFavorites() {
    try {
        const favorites = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
        return Array.isArray(favorites) ? favorites.filter(stock => stock && stock.code) : [];
    } catch (_) {
        return [];
    }
}


async function migrateLegacyFavorites() {
    const legacyFavorites = getLegacyFavorites();

    if (legacyFavorites.length === 0) {
        return;
    }

    await Promise.all(legacyFavorites.map(stock => saveFavoriteToServer(stock)));
    localStorage.removeItem(FAVORITES_STORAGE_KEY);
}


async function loadFavorites() {
    await migrateLegacyFavorites();
    return fetchFavorites();
}


function ensureFavoritesReady() {
    if (!favoritesReady) {
        favoritesReady = loadFavorites().catch(error => {
            console.error(error);
            favoriteStocks = [];
            return favoriteStocks;
        });
    }

    return favoritesReady;
}


function getFavorites() {
    return favoriteStocks;
}


function isFavorite(code) {
    const normalizedCode = String(code || "").trim().toUpperCase();
    return favoriteStocks.some(stock => stock.code === normalizedCode);
}


async function saveFavoriteToServer(stock) {
    const favorite = normalizeFavoriteStock(stock);

    if (!favorite.code) {
        return null;
    }

    const response = await fetch("/api/favorites", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(favorite),
    });

    if (!response.ok) {
        throw new Error("\u304a\u6c17\u306b\u5165\u308a\u306b\u4fdd\u5b58\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f");
    }

    return response.json();
}


async function deleteFavoriteFromServer(code) {
    const response = await fetch(`/api/favorites/${encodeURIComponent(code)}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error("\u304a\u6c17\u306b\u5165\u308a\u3092\u5916\u305b\u307e\u305b\u3093\u3067\u3057\u305f");
    }
}


async function toggleFavorite(stock) {
    await ensureFavoritesReady();

    const favorite = normalizeFavoriteStock(stock);
    if (!favorite.code) {
        return false;
    }

    if (isFavorite(favorite.code)) {
        await deleteFavoriteFromServer(favorite.code);
        favoriteStocks = favoriteStocks.filter(item => item.code !== favorite.code);
        return false;
    }

    const savedFavorite = await saveFavoriteToServer(favorite);
    favoriteStocks.push(savedFavorite || favorite);
    return true;
}


function getStockFromTile(tile) {
    return {
        code: tile?.dataset.code,
        name: tile?.dataset.name,
        price: tile?.dataset.price,
        change: tile?.dataset.change,
        dividend_yield: tile?.dataset.dividendYield,
    };
}


async function toggleFavoriteFromTile(event, tile) {
    event.stopPropagation();
    await toggleFavorite(getStockFromTile(tile));
    refreshFavoriteButtons();

    if (getCurrentRanking() === "favorites") {
        renderFavoritesPage();
    }
}


async function toggleFavoriteFromCurrentDetail(event) {
    event.stopPropagation();
    await toggleFavorite(window.currentDetailFavoriteStock || {});
    refreshFavoriteButtons();

    if (getCurrentRanking() === "favorites") {
        renderFavoritesPage();
    }
}


async function recordFavoriteOpen(code) {
    const normalizedCode = String(code || "").trim().toUpperCase();

    if (!normalizedCode || !isFavorite(normalizedCode)) {
        return;
    }

    try {
        await fetch(`/api/favorites/${encodeURIComponent(normalizedCode)}/open`, {
            method: "POST",
        });

        favoriteStocks = favoriteStocks.map(stock => {
            if (stock.code !== normalizedCode) {
                return stock;
            }

            return {
                ...stock,
                open_count: Number(stock.open_count || 0) + 1,
                last_opened_at: Date.now() / 1000,
            };
        });
    } catch (_) {
        // Opening detail should never fail because the usage counter could not be saved.
    }
}


function refreshFavoriteButtons() {
    document.querySelectorAll(".stock-tile[data-code]").forEach(tile => {
        const button = tile.querySelector(".favorite-button");
        const active = isFavorite(tile.dataset.code);
        tile.classList.toggle("favorite-stock-tile", active);

        if (button) {
            button.classList.toggle("active", active);
            button.textContent = active ? "\u2605" : "\u2606";
            button.setAttribute("aria-pressed", active ? "true" : "false");
        }
    });

    const detailButton = document.querySelector(".detail-favorite-button");
    const detailCode = window.currentDetailFavoriteStock?.code;
    if (detailButton && detailCode) {
        const active = isFavorite(detailCode);
        detailButton.classList.toggle("active", active);
        detailButton.textContent = active ? "\u2605" : "\u2606";
        detailButton.setAttribute("aria-pressed", active ? "true" : "false");
    }
}


function setFavoritesEmptyTile(loadMoreTile, hasFavorites) {
    loadMoreTile.disabled = true;
    loadMoreTile.onclick = null;
    loadMoreTile.classList.add("disabled");
    loadMoreTile.querySelector(".load-more-plus").textContent = hasFavorites ? "\u2605" : "+";
    loadMoreTile.querySelector(".load-more-main").textContent =
        hasFavorites ? "\u304a\u6c17\u306b\u5165\u308a\u306f\u3053\u3053\u307e\u3067" : "\u304a\u6c17\u306b\u5165\u308a\u306a\u3057";
    loadMoreTile.querySelector(".load-more-sub").textContent =
        hasFavorites ? "\u661f\u3092\u5916\u3059\u3068\u3053\u3053\u304b\u3089\u6d88\u3048\u307e\u3059" : "\u6c17\u306b\u306a\u308b\u682a\u306e\u661f\u3092\u62bc\u3059\u3068\u8868\u793a\u3055\u308c\u307e\u3059";
}


async function fetchFreshFavoriteCard(stock) {
    const favorite = normalizeFavoriteStock(stock);

    if (!favorite.code) {
        return favorite;
    }

    try {
        const response = await fetch(`/api/stock-card/${encodeURIComponent(favorite.code)}`);

        if (!response.ok) {
            throw new Error();
        }

        const latestStock = normalizeFavoriteStock(await response.json());
        const mergedStock = normalizeFavoriteStock({
            ...favorite,
            ...latestStock,
            name: latestStock.name || favorite.name,
        });

        await saveFavoriteToServer(mergedStock);
        return mergedStock;
    } catch (_) {
        return favorite;
    }
}


async function refreshFavoriteCards() {
    if (favoriteStocks.length === 0) {
        return favoriteStocks;
    }

    favoriteStocks = await Promise.all(favoriteStocks.map(stock => fetchFreshFavoriteCard(stock)));
    return favoriteStocks;
}


async function renderFavoritesPage() {
    if (getCurrentRanking() !== "favorites" || !tickerTrack) {
        return;
    }

    await ensureFavoritesReady();

    const loadMoreTile = document.getElementById("load-more-tile");
    tickerTrack.querySelectorAll(".stock-tile:not(#load-more-tile)").forEach(tile => tile.remove());
    loadMoreTile.querySelector(".load-more-main").textContent = "\u66f4\u65b0\u4e2d";
    loadMoreTile.querySelector(".load-more-sub").textContent = "\u304a\u6c17\u306b\u5165\u308a\u306e\u524d\u65e5\u6bd4\u3092\u78ba\u8a8d\u3057\u3066\u3044\u307e\u3059";

    const favorites = await refreshFavoriteCards();
    favorites.forEach((stock, index) => {
        const tile = createStockTile(stock, index + 1, "favorites");
        tickerTrack.insertBefore(tile, loadMoreTile);
    });

    setFavoritesEmptyTile(loadMoreTile, favorites.length > 0);
    refreshFavoriteButtons();
    position = 0;
    clampPosition();
    renderTicker();
}


document.addEventListener("DOMContentLoaded", async () => {
    await ensureFavoritesReady();

    if (getCurrentRanking() === "favorites") {
        renderFavoritesPage();
        return;
    }

    refreshFavoriteButtons();
});
