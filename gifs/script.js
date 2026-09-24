const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8CIQQhD3_8ZUHFTjfBpVRHg80thTHSu-gZFH37f-PNOGEeYjM7Bu_2ZinK59tVDYxrJM5lpkue8Iy/pub?gid=1913411064&single=true&output=csv";

const CATEGORIES = [
    "Nom",
    "Location",
    "Time",
    "Item",
    "Feeling",
    "Action"
];

let gifs = [];
let activeFilters = {};

function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && insideQuotes && next === '"') {
            cell += '"';
            i++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
            row.push(cell);
            cell = "";
        } else if ((char === "\n" || char === "\r") && !insideQuotes) {
            if (char === "\r" && next === "\n") {
                i++;
            }

            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
        } else {
            cell += char;
        }
    }

    if (cell || row.length) {
        row.push(cell);
        rows.push(row);
    }

    return rows;
}

function normalize(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function splitTags(value) {
    if (!value) {
        return [];
    }

    return value
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean);
}

async function loadData() {
    const response = await fetch(CSV_URL);
    const text = await response.text();

    const rows = parseCSV(text);
    const headers = rows.shift().map(header => header.trim());

    gifs = rows
        .map(row => {
            const item = {};

            headers.forEach((header, index) => {
                item[header] = row[index] || "";
            });

            CATEGORIES.forEach(category => {
                item[category] = splitTags(item[category]);
            });

            return item;
        })
        .filter(item => item.GIF);

    createFilters();
    render();
}

function createFilters() {
    const container = document.querySelector("#filters");

    container.innerHTML = "";

    CATEGORIES.forEach(category => {
        const values = new Set();

        gifs.forEach(gif => {
            gif[category].forEach(tag => values.add(tag));
        });

        if (!values.size) {
            return;
        }

        const group = document.createElement("div");
        group.className = "filter-group";

        const title = document.createElement("strong");
        title.textContent = category;

        group.appendChild(title);

        [...values]
            .sort((a, b) => a.localeCompare(b))
            .forEach(value => {
                const button = document.createElement("button");

                button.textContent = value;
                button.dataset.category = category;
                button.dataset.value = normalize(value);

                button.addEventListener("click", () => {
                    const key = normalize(value);

                    if (activeFilters[category] === key) {
                        delete activeFilters[category];
                        button.classList.remove("active");
                    } else {
                        activeFilters[category] = key;

                        group.querySelectorAll("button").forEach(btn => {
                            btn.classList.remove("active");
                        });

                        button.classList.add("active");
                    }

                    render();
                });

                group.appendChild(button);
            });

        container.appendChild(group);
    });
}

function matchesSearch(gif, search) {
    if (!search) {
        return true;
    }

    const words = normalize(search)
        .split(/\s+/)
        .filter(Boolean);

    const content = CATEGORIES
        .flatMap(category => gif[category])
        .map(normalize)
        .join(" ");

    return words.every(word => content.includes(word));
}

function matchesFilters(gif) {
    return Object.entries(activeFilters).every(([category, value]) => {
        return gif[category].some(tag => normalize(tag) === value);
    });
}

function createCard(gif) {
    const card = document.createElement("article");
    card.className = "gif-card";

    const image = document.createElement("img");
    image.className = "gif-image";
    image.src = gif.GIF;
    image.alt = gif.Nom.join(", ");

    const tags = document.createElement("div");
    tags.className = "gif-tags";

    CATEGORIES.forEach(category => {
        gif[category].forEach(tag => {
            const span = document.createElement("span");

            span.className = `tag tag-${normalize(category)}`;
            span.textContent = tag;

            tags.appendChild(span);
        });
    });

    card.appendChild(image);
    card.appendChild(tags);

    return card;
}

function render() {
    const search = document.querySelector("#search").value;

    const results = gifs.filter(gif => {
        return matchesSearch(gif, search) && matchesFilters(gif);
    });

    const container = document.querySelector("#results");
    const count = document.querySelector("#count");
    const empty = document.querySelector("#empty");

    container.innerHTML = "";

    results.forEach(gif => {
        container.appendChild(createCard(gif));
    });

    count.textContent = `${results.length} GIF${results.length > 1 ? "s" : ""}`;

    empty.hidden = results.length > 0;
}

document.querySelector("#search").addEventListener("input", render);

loadData();
