const FAVORITES_STORAGE_KEY = "stock-display-favorites-v1";


function getFavorites() {
    try {
        const favorites = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
        return Array.isArray(favorites) ? favorites.filter(stock => stock && stock.code) : [];
    } catch (_) {
        return [];
    }
}


function saveFavorites(favorites) {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}


function normalizeFavoriteStock(stock) {
    return {
        code: String(stock.code || "").trim(),
        name: String(stock.name || stock.code || "").trim(),
        price: String(stock.price ?? "").trim(),
        change: String(stock.change ?? "").trim(),
        dividend_yield: String(stock.dividend_yield ?? stock.dividendYield ?? "").trim(),
    };
}


function isFavorite(code) {
    const normalizedCode = String(code || "").trim();
    return getFavorites().some(stock => stock.code === normalizedCode);
}


function toggleFavorite(stock) {
    const favorite = normalizeFavoriteStock(stock);
    if (!favorite.code) {
        return false;
    }

    const favorites = getFavorites();
    const existingIndex = favorites.findIndex(item => item.code === favorite.code);

    if (existingIndex >= 0) {
        favorites.splice(existingIndex, 1);
        saveFavorites(favorites);
        return false;
    }

    favorites.push(favorite);
    saveFavorites(favorites);
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


function toggleFavoriteFromTile(event, tile) {
    event.stopPropagation();
    toggleFavorite(getStockFromTile(tile));
    refreshFavoriteButtons();

    if (getCurrentRanking() === "favorites") {
        renderFavoritesPage();
    }
}


function toggleFavoriteFromCurrentDetail(event) {
    event.stopPropagation();
    toggleFavorite(window.currentDetailFavoriteStock || {});
    refreshFavoriteButtons();

    if (getCurrentRanking() === "favorites") {
        renderFavoritesPage();
    }
}


function refreshFavoriteButtons() {
    document.querySelectorAll(".stock-tile[data-code]").forEach(tile => {
        const button = tile.querySelector(".favorite-button");
        if (!button) {
            return;
        }

        const active = isFavorite(tile.dataset.code);
        button.classList.toggle("active", active);
        button.textContent = active ? "\u2605" : "\u2606";
        button.setAttribute("aria-pressed", active ? "true" : "false");
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


function renderFavoritesPage() {
    if (getCurrentRanking() !== "favorites") {
        return;
    }

    const loadMoreTile = document.getElementById("load-more-tile");
    tickerTrack.querySelectorAll(".stock-tile:not(#load-more-tile)").forEach(tile => tile.remove());

    const favorites = getFavorites();
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


document.addEventListener("DOMContentLoaded", () => {
    if (getCurrentRanking() === "favorites") {
        renderFavoritesPage();
        return;
    }

    refreshFavoriteButtons();
});
