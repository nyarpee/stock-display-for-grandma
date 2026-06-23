const RANKING_REFRESH_MS = 60 * 60 * 1000;


function getCurrentRanking() {
    const params = new URLSearchParams(window.location.search);
    return params.get("ranking") || "up";
}


function getRefreshStorageKey(ranking) {
    return `stock-display-last-refresh-${ranking}`;
}


function getOtherRanking(ranking) {
    return ranking === "dividend" ? "up" : "dividend";
}


function getLastRankingRefresh(ranking) {
    return Number(localStorage.getItem(getRefreshStorageKey(ranking)) || 0);
}


function markRankingRefreshed(ranking) {
    localStorage.setItem(getRefreshStorageKey(ranking), String(Date.now()));
}


function isRankingStale(ranking) {
    return Date.now() - getLastRankingRefresh(ranking) >= RANKING_REFRESH_MS;
}


function buildRankingUrl(ranking, forceRefresh) {
    const url = new URL(window.location.href);
    url.searchParams.set("ranking", ranking);

    if (forceRefresh) {
        url.searchParams.set("refresh", String(Date.now()));
    } else {
        url.searchParams.delete("refresh");
    }

    return `${url.pathname}${url.search}`;
}


function setupHourlyRankingRefresh() {
    markRankingRefreshed(getCurrentRanking());

    setInterval(() => {
        const nextRanking = getOtherRanking(getCurrentRanking());
        window.location.href = buildRankingUrl(nextRanking, true);
    }, RANKING_REFRESH_MS);
}


function setupRankingTabRefresh() {
    document.querySelectorAll(".ranking-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const url = new URL(tab.href);
            const targetRanking = url.searchParams.get("ranking") || "up";
            tab.href = buildRankingUrl(targetRanking, isRankingStale(targetRanking));
        });
    });
}


setupHourlyRankingRefresh();
setupRankingTabRefresh();
