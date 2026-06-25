const ticker = document.getElementById("ticker");
const tickerTrack = document.getElementById("ticker-track");

let position = 0;
let speed = 0.45;
let isPaused = false;
let isDragging = false;
let isDetailOpen = false;
let isLoadingMore = false;
let lastX = 0;
let resumeTimer = null;
let endIdleTimer = null;

const END_IDLE_RESET_MS = 30 * 1000;
const rankingPages = {
    up: 1,
    dividend: 1,
    favorites: 1,
};


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


function getRightLimit() {
    if (!ticker || !tickerTrack) {
        return 0;
    }

    const style = window.getComputedStyle(ticker);
    const horizontalPadding =
        parseFloat(style.paddingLeft || 0) + parseFloat(style.paddingRight || 0);
    const visibleWidth = ticker.clientWidth - horizontalPadding;

    return Math.min(0, visibleWidth - tickerTrack.scrollWidth);
}


function clampPosition() {
    const rightLimit = getRightLimit();

    if (position > 0) {
        position = 0;
    }

    if (position < rightLimit) {
        position = rightLimit;
    }
}


function renderTicker() {
    if (!tickerTrack) {
        return;
    }

    tickerTrack.style.transform = `translateX(${position}px)`;
    watchEndIdleReset();
}


function animateTicker() {
    if (!isPaused && !isDragging && !isDetailOpen) {
        position -= speed;
        clampPosition();
        renderTicker();
    }

    requestAnimationFrame(animateTicker);
}


function isAtRightEnd() {
    const rightLimit = getRightLimit();
    return rightLimit < 0 && Math.abs(position - rightLimit) <= 2;
}


function clearEndIdleTimer() {
    if (endIdleTimer) {
        clearTimeout(endIdleTimer);
        endIdleTimer = null;
    }
}


function watchEndIdleReset() {
    if (isAtRightEnd() && !isDragging && !isDetailOpen && !isLoadingMore) {
        scheduleEndIdleReset();
        return;
    }

    clearEndIdleTimer();
}


function scheduleEndIdleReset() {
    if (endIdleTimer) {
        return;
    }

    endIdleTimer = setTimeout(() => {
        if (!isAtRightEnd() || isDragging || isDetailOpen || isLoadingMore) {
            clearEndIdleTimer();
            return;
        }

        position = 0;
        isPaused = false;
        clearEndIdleTimer();
        renderTicker();
    }, END_IDLE_RESET_MS);
}


function pauseTicker() {
    isPaused = true;
    clearEndIdleTimer();

    if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
    }
}


function resumeTickerLater() {
    if (isDetailOpen) {
        return;
    }

    if (resumeTimer) {
        clearTimeout(resumeTimer);
    }

    resumeTimer = setTimeout(() => {
        isPaused = false;
    }, 4000);
}


function getClientX(event) {
    if (event.touches && event.touches.length > 0) {
        return event.touches[0].clientX;
    }

    return event.clientX;
}


function startDrag(event) {
    if (isDetailOpen) {
        return;
    }

    clearEndIdleTimer();
    pauseTicker();
    isDragging = true;
    lastX = getClientX(event);
    ticker.classList.add("dragging");
}


function moveDrag(event) {
    if (!isDragging) {
        return;
    }

    const currentX = getClientX(event);
    const deltaX = currentX - lastX;

    position += deltaX;
    clampPosition();
    renderTicker();

    lastX = currentX;
    event.preventDefault();
}


function endDrag() {
    if (!isDragging) {
        return;
    }

    isDragging = false;
    ticker.classList.remove("dragging");
    resumeTickerLater();
    watchEndIdleReset();
}


async function loadMoreStocks() {
    if (!tickerTrack) {
        return;
    }

    if (isLoadingMore) {
        return;
    }

    clearEndIdleTimer();
    const ranking = getCurrentRanking();
    if (ranking === "favorites" || ranking === "search") {
        return;
    }

    const nextPage = (rankingPages[ranking] || 1) + 1;
    const loadMoreTile = document.getElementById("load-more-tile");

    isLoadingMore = true;
    loadMoreTile.disabled = true;
    loadMoreTile.classList.add("loading");
    loadMoreTile.querySelector(".load-more-main").textContent = "\u8aad\u307f\u8fbc\u307f\u4e2d";

    try {
        const response = await fetch(`/api/ranking?ranking=${ranking}&page=${nextPage}`);

        if (!response.ok) {
            throw new Error("\u30e9\u30f3\u30ad\u30f3\u30b0\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f");
        }

        const stocks = await response.json();

        if (!stocks || stocks.length === 0) {
            disableLoadMoreTile(loadMoreTile);
            return;
        }

        stocks.forEach((stock, index) => {
            const rankNumber = (nextPage - 1) * 10 + index + 1;
            const tile = createStockTile(stock, rankNumber, ranking);
            tickerTrack.insertBefore(tile, loadMoreTile);
        });

        if (typeof refreshFavoriteButtons === "function") {
            refreshFavoriteButtons();
        }

        rankingPages[ranking] = nextPage;
        loadMoreTile.querySelector(".load-more-main").textContent = "\u3055\u3089\u306b10\u4ef6";
        loadMoreTile.querySelector(".load-more-sub").textContent =
            ranking === "dividend"
                ? "\u914d\u5f53\u5229\u56de\u308a\u30e9\u30f3\u30ad\u30f3\u30b0\u306e\u7d9a\u304d\u3092\u898b\u308b"
                : "\u5024\u4e0a\u304c\u308a\u30e9\u30f3\u30ad\u30f3\u30b0\u306e\u7d9a\u304d\u3092\u898b\u308b";
    } catch (error) {
        loadMoreTile.querySelector(".load-more-main").textContent = "\u3082\u3046\u4e00\u5ea6\u898b\u308b";
        loadMoreTile.querySelector(".load-more-sub").textContent = error.message;
    } finally {
        isLoadingMore = false;

        if (!loadMoreTile.classList.contains("disabled")) {
            loadMoreTile.disabled = false;
            loadMoreTile.classList.remove("loading");
        }

        clampPosition();
        renderTicker();
    }
}


function disableLoadMoreTile(loadMoreTile) {
    loadMoreTile.classList.remove("loading");
    loadMoreTile.classList.add("disabled");
    loadMoreTile.disabled = true;
    loadMoreTile.onclick = null;
    loadMoreTile.querySelector(".load-more-main").textContent = "\u3053\u308c\u4ee5\u4e0a\u3042\u308a\u307e\u305b\u3093";
    loadMoreTile.querySelector(".load-more-sub").textContent = "\u3053\u3053\u307e\u3067\u3067\u5168\u90e8\u3067\u3059";
}


function openDetailFromTile(tile) {
    if (!tile) {
        return;
    }

    openDetail(tile.dataset.code, tile.dataset.name, tile.dataset.dividendYield);
}


function createStockTile(stock, rankNumber, ranking) {
    const tile = document.createElement("div");
    tile.className = "stock-tile";
    tile.dataset.code = stock.code || "";
    tile.dataset.name = stock.name || "";
    tile.dataset.price = stock.price || "";
    tile.dataset.change = stock.change || "";
    tile.dataset.dividendYield = stock.dividend_yield || "";
    tile.onclick = () => openDetail(stock.code, stock.name, stock.dividend_yield);

    const mainLabel = ranking === "dividend" ? "\u914d\u5f53\u5229\u56de\u308a" : "\u73fe\u5728\u5024";
    const mainValue = ranking === "dividend"
        ? stock.dividend_yield
        : stock.price
            ? `${stock.price}\u5186`
            : "\u4e0d\u660e";
    const sideValue = ranking === "dividend" ? `${stock.price}\u5186` : stock.change;
    const rankText = ranking === "favorites" ? "\u2605" : ranking === "search" ? "\u691c\u7d22" : `#${rankNumber}`;
    const changeClass = String(sideValue || "").trim().startsWith("-") ? "down-text" : "up-text";

    tile.innerHTML = `
        <div class="tile-top">
            <span class="rank">${rankText}</span>
            <div class="tile-actions">
                <span class="code">${escapeHtml(stock.code)}</span>
                <button class="favorite-button" type="button" aria-label="\u304a\u6c17\u306b\u5165\u308a" onclick="toggleFavoriteFromTile(event, this.closest('.stock-tile'))">\u2606</button>
            </div>
        </div>
        <div class="name">${escapeHtml(stock.name)}</div>
        <div class="tile-bottom">
            <div>
                <p class="small">${mainLabel}</p>
                <p class="price">${escapeHtml(mainValue)}</p>
            </div>
            <div class="change ${changeClass}">${escapeHtml(sideValue)}</div>
        </div>
    `;

    return tile;
}


if (ticker && tickerTrack) {
    ticker.addEventListener("mousedown", startDrag);
    window.addEventListener("mousemove", moveDrag);
    window.addEventListener("mouseup", endDrag);
    ticker.addEventListener("touchstart", startDrag, { passive: false });
    window.addEventListener("touchmove", moveDrag, { passive: false });
    window.addEventListener("touchend", endDrag);
    ticker.addEventListener("mouseenter", pauseTicker);
    ticker.addEventListener("mouseleave", () => {
        if (!isDragging) {
            resumeTickerLater();
        }
    });
    window.addEventListener("resize", () => {
        clampPosition();
        renderTicker();
    });

    animateTicker();
}
