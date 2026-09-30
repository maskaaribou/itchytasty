const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8CIQQhD3_8ZUHFTjfBpVRHg80thTHSu-gZFH37f-PNOGEeYjM7Bu_2ZinK59tVDYxrJM5lpkue8Iy/pub?gid=1913411064&single=true&output=csv";

const CATEGORIES = [
    "Nom",
    "Location",
    "Time",
    "Item",
    "Feeling",
    "Action"
];

const GIFS_PER_PAGE = 36;

let gifs = [];
let filteredGifs = [];
let currentPage = 1;

function parseCSV(text) {
    const rows = [];
    let row = [];
    let value = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && quoted && next === '"') {
            value += '"';
            i++;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (char === "," && !quoted) {
            row.push(value);
            value = "";
        } else if ((char === "\n" || char === "\r") && !quoted) {
            if (char === "\r" && next === "\n") i++;

            row.push(value);
            value = "";

            if (row.some(cell => cell !== "")) {
                rows.push(row);
            }

            row = [];
        } else {
            value += char;
        }
    }

    if (value !== "" || row.length) {
        row.push(value);

        if (row.some(cell => cell !== "")) {
            rows.push(row);
        }
    }

    return rows;
}

function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function splitTags(value) {
    if (!value) return [];

    return String(value)
        .split(",")
        .map(value => value.trim())
        .filter(Boolean);
}

async function loadData() {
    const response = await fetch(CSV_URL);

    if (!response.ok) {
        throw new Error("Impossible de charger le CSV.");
    }

    const text = await response.text();
    const rows = parseCSV(text);

    if (!rows.length) return;

    const headers = rows[0].map(header => header.trim());

    gifs = rows.slice(1).map(row => {
        const gif = {};

        headers.forEach((header, index) => {
            gif[header] = row[index] || "";
        });

        CATEGORIES.forEach(category => {
            gif[category] = splitTags(gif[category]);
        });

        return gif;
    }).filter(gif => gif.GIF);

    createFilters();
    applyFilters();
}

function createFilters() {
    const container = document.getElementById("filters");

    if (!container) return;

    container.innerHTML = "";

    CATEGORIES.forEach(category => {
        const values = new Set();

        gifs.forEach(gif => {
            gif[category].forEach(value => {
                values.add(value);
            });
        });

        if (!values.size) return;

        const wrapper = document.createElement("div");
        wrapper.className = "filter-group";

        const title = document.createElement("button");
        title.type = "button";
        title.className = "filter-title";
        title.textContent = category;

        const menu = document.createElement("div");
        menu.className = "filter-menu";

        [...values]
            .sort((a, b) =>
                normalize(a).localeCompare(normalize(b))
            )
            .forEach(value => {
                const label = document.createElement("label");

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = value;
                checkbox.dataset.category = category;

                checkbox.addEventListener("change", () => {
                    currentPage = 1;
                    applyFilters();
                });

                label.appendChild(checkbox);
                label.appendChild(
                    document.createTextNode(" " + value)
                );

                menu.appendChild(label);
            });

        title.addEventListener("click", () => {
            wrapper.classList.toggle("open");
        });

        wrapper.appendChild(title);
        wrapper.appendChild(menu);
        container.appendChild(wrapper);
    });
}

function matchesSearch(gif, search) {
    if (!search) return true;

    const searchable = [
        gif.GIF,
        ...CATEGORIES.flatMap(category => gif[category])
    ]
        .join(" ")
        .toLowerCase();

    return normalize(searchable).includes(normalize(search));
}

function matchesFilters(gif) {
    const groups = document.querySelectorAll(".filter-group");

    return [...groups].every(group => {
        const checked = group.querySelectorAll(
            'input[type="checkbox"]:checked'
        );

        if (!checked.length) return true;

        return [...checked].every(checkbox => {
            return gif[checkbox.dataset.category].some(
                tag =>
                    normalize(tag) === normalize(checkbox.value)
            );
        });
    });
}

function createCard(gif) {
    const card = document.createElement("article");
    card.className = "gif-card";

    const image = document.createElement("img");
    image.className = "gif-image";
    image.src = gif.GIF;
    image.alt = gif.Nom.join(", ");
    image.loading = "lazy";
    image.decoding = "async";

    const tags = document.createElement("div");
    tags.className = "gif-tags";

    CATEGORIES.forEach(category => {
        gif[category].forEach(value => {
            const tag = document.createElement("span");

            tag.className =
                "tag tag-" +
                normalize(category).replace(/\s+/g, "-");

            tag.textContent = value;

            tags.appendChild(tag);
        });
    });

    card.appendChild(image);
    card.appendChild(tags);

    card.addEventListener("click", async () => {
        card.classList.add("clicked");

        setTimeout(() => {
            card.classList.remove("clicked");
        }, 300);

        try {
            await navigator.clipboard.writeText(gif.GIF);
        } catch {
            const textarea = document.createElement("textarea");

            textarea.value = gif.GIF;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";

            document.body.appendChild(textarea);

            textarea.select();
            document.execCommand("copy");

            textarea.remove();
        }
    });

    return card;
}

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

    const multiplePages = Math.ceil(
        multipleNames.length / GIFS_PER_PAGE
    );

    const singlePages = Math.ceil(
        singleNames.length / GIFS_PER_PAGE
    );

    const totalPages = Math.max(
        1,
        multiplePages + singlePages
    );

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
        button.className =
            page === currentPage ? "active" : "";

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
    const results = document.getElementById("results");
    const empty = document.getElementById("empty");
    const count = document.getElementById("count");

    if (!results) return;

    results.innerHTML = "";

    const multipleNames = filteredGifs.filter(
        gif => gif.Nom.length >= 2
    );

    const singleNames = filteredGifs.filter(
        gif => gif.Nom.length < 2
    );

    let pageGifs = [];

    if (multipleNames.length > 0) {
        const multiplePages = Math.ceil(
            multipleNames.length / GIFS_PER_PAGE
        );

        if (currentPage <= multiplePages) {
            const start =
                (currentPage - 1) * GIFS_PER_PAGE;

            pageGifs = multipleNames.slice(
                start,
                start + GIFS_PER_PAGE
            );
        } else {
            const singlePage =
                currentPage - multiplePages - 1;

            const start =
                singlePage * GIFS_PER_PAGE;

            pageGifs = singleNames.slice(
                start,
                start + GIFS_PER_PAGE
            );
        }
    } else {
        const start =
            (currentPage - 1) * GIFS_PER_PAGE;

        pageGifs = singleNames.slice(
            start,
            start + GIFS_PER_PAGE
        );
    }

    pageGifs.forEach(gif => {
        results.appendChild(createCard(gif));
    });

    if (empty) {
        empty.hidden = filteredGifs.length !== 0;
    }

    if (count) {
        count.textContent =
            `${filteredGifs.length} GIF${filteredGifs.length > 1 ? "s" : ""}`;
    }

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

    const multiplePages = Math.ceil(
        multipleNames.length / GIFS_PER_PAGE
    );

    const singlePages = Math.ceil(
        singleNames.length / GIFS_PER_PAGE
    );

    const totalPages = Math.max(
        1,
        multiplePages + singlePages
    );

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    render();
}

document.addEventListener("DOMContentLoaded", () => {
    const search = document.getElementById("search");

    if (search) {
        search.addEventListener("input", () => {
            currentPage = 1;
            applyFilters();
        });
    }

    loadData().catch(error => {
        console.error(error);

        const empty = document.getElementById("empty");

        if (empty) {
            empty.hidden = false;
            empty.textContent =
                "Impossible de charger les GIF.";
        }
    });
});
