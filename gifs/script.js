function createPagination() {
    const container = document.getElementById("pagination");

    if (!container) return;

    container.innerHTML = "";

    const multipleNames = filteredGifs.filter(
        gif => gif.Nom.length >= 2
    );

    const singleNames = filteredGifs.filter(
        gif => gif.Nom.length < 2
    );

    const totalPages = multipleNames.length > 0
        ? 1 + Math.ceil(singleNames.length / GIFS_PER_PAGE)
        : Math.max(1, Math.ceil(singleNames.length / GIFS_PER_PAGE));

    if (totalPages <= 1) return;

    const previous = document.createElement("button");
    previous.textContent = "‹";
    previous.disabled = currentPage === 1;

    previous.addEventListener("click", () => {
        if (currentPage <= 1) return;

        currentPage--;
        render();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    container.appendChild(previous);

    for (let page = 1; page <= totalPages; page++) {
        const button = document.createElement("button");

        button.textContent = page;
        button.className = page === currentPage ? "active" : "";

        button.addEventListener("click", () => {
            currentPage = page;
            render();

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });

        container.appendChild(button);
    }

    const next = document.createElement("button");
    next.textContent = "›";
    next.disabled = currentPage === totalPages;

    next.addEventListener("click", () => {
        if (currentPage >= totalPages) return;

        currentPage++;
        render();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    container.appendChild(next);
}

function render() {
    const container = document.getElementById("gif-container");

    if (!container) return;

    container.innerHTML = "";

    const multipleNames = filteredGifs.filter(
        gif => gif.Nom.length >= 2
    );

    const singleNames = filteredGifs.filter(
        gif => gif.Nom.length < 2
    );

    let pageGifs;

    if (multipleNames.length > 0) {
        if (currentPage === 1) {
            pageGifs = multipleNames;
        } else {
            const start = (currentPage - 2) * GIFS_PER_PAGE;

            pageGifs = singleNames.slice(
                start,
                start + GIFS_PER_PAGE
            );
        }
    } else {
        const start = (currentPage - 1) * GIFS_PER_PAGE;

        pageGifs = singleNames.slice(
            start,
            start + GIFS_PER_PAGE
        );
    }

    pageGifs.forEach(gif => {
        container.appendChild(createCard(gif));
    });

    createPagination();
}

function applyFilters() {
    const searchInput = document.getElementById("search");
    const search = searchInput ? searchInput.value : "";

    filteredGifs = gifs.filter(gif => {
        return (
            matchesSearch(gif, search) &&
            matchesFilters(gif)
        );
    });

    const multipleNames = filteredGifs.filter(
        gif => gif.Nom.length >= 2
    );

    const singleNames = filteredGifs.filter(
        gif => gif.Nom.length < 2
    );

    const totalPages = multipleNames.length > 0
        ? 1 + Math.ceil(singleNames.length / GIFS_PER_PAGE)
        : Math.max(1, Math.ceil(singleNames.length / GIFS_PER_PAGE));

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    render();
}
