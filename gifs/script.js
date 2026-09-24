const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8CIQQhD3_8ZUHFTjfBpVRHg80thTHSu-gZFH37f-PNOGEeYjM7Bu_2ZinK59tVDYxrJM5lpkue8Iy/pub?gid=1913411064&single=true&output=csv";

const CATEGORIES = [
    "Nom",
    "Location",
    "Time",
    "Item",
    "Feeling",
    "Action"
];

const GIFS_PER_PAGE = 50;

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

/* MD5 fiable */
function md5(string) {
    function rotateLeft(value, shift) {
        return (value << shift) | (value >>> (32 - shift));
    }

    function addUnsigned(a, b) {
        const a4 = a & 0x40000000;
        const b4 = b & 0x40000000;
        const a8 = a & 0x80000000;
        const b8 = b & 0x80000000;

        const result = (a & 0x3fffffff) + (b & 0x3fffffff);

        if (a4 & b4) {
            return result ^ 0x80000000 ^ a8 ^ b8;
        }

        if (a4 | b4) {
            if (result & 0x40000000) {
                return result ^ 0xc0000000 ^ a8 ^ b8;
            }

            return result ^ 0x40000000 ^ a8 ^ b8;
        }

        return result ^ a8 ^ b8;
    }

    function F(x, y, z) {
        return (x & y) | (~x & z);
    }

    function G(x, y, z) {
        return (x & z) | (y & ~z);
    }

    function H(x, y, z) {
        return x ^ y ^ z;
    }

    function I(x, y, z) {
        return y ^ (x | ~z);
    }

    function FF(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function GG(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function HH(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function II(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function convertToWordArray(input) {
        const utf8 = unescape(encodeURIComponent(input));
        const messageLength = utf8.length;

        const numberOfWords = (((messageLength + 8) >>> 6) + 1) * 16;
        const wordArray = new Array(numberOfWords).fill(0);

        for (let i = 0; i < messageLength; i++) {
            wordArray[i >> 2] |=
                utf8.charCodeAt(i) << ((i % 4) * 8);
        }

        wordArray[messageLength >> 2] |=
            0x80 << ((messageLength % 4) * 8);

        wordArray[numberOfWords - 2] = messageLength << 3;
        wordArray[numberOfWords - 1] = messageLength >>> 29;

        return wordArray;
    }

    function wordToHex(value) {
        let output = "";

        for (let i = 0; i <= 3; i++) {
            const byte = (value >>> (i * 8)) & 255;
            output += ("0" + byte.toString(16)).slice(-2);
        }

        return output;
    }

    const x = convertToWordArray(string);

    let a = 0x67452301;
    let b = 0xefcdab89;
    let c = 0x98badcfe;
    let d = 0x10325476;

    for (let k = 0; k < x.length; k += 16) {
        const AA = a;
        const BB = b;
        const CC = c;
        const DD = d;

        a = FF(a, b, c, d, x[k + 0], 7, 0xd76aa478);
        d = FF(d, a, b, c, x[k + 1], 12, 0xe8c7b756);
        c = FF(c, d, a, b, x[k + 2], 17, 0x242070db);
        b = FF(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
        a = FF(a, b, c, d, x[k + 4], 7, 0xf57c0faf);
        d = FF(d, a, b, c, x[k + 5], 12, 0x4787c62a);
        c = FF(c, d, a, b, x[k + 6], 17, 0xa8304613);
        b = FF(b, c, d, a, x[k + 7], 22, 0xfd469501);
        a = FF(a, b, c, d, x[k + 8], 7, 0x698098d8);
        d = FF(d, a, b, c, x[k + 9], 12, 0x8b44f7af);
        c = FF(c, d, a, b, x[k + 10], 17, 0xffff5bb1);
        b = FF(b, c, d, a, x[k + 11], 22, 0x895cd7be);
        a = FF(a, b, c, d, x[k + 12], 7, 0x6b901122);
        d = FF(d, a, b, c, x[k + 13], 12, 0xfd987193);
        c = FF(c, d, a, b, x[k + 14], 17, 0xa679438e);
        b = FF(b, c, d, a, x[k + 15], 22, 0x49b40821);

        a = GG(a, b, c, d, x[k + 1], 5, 0xf61e2562);
        d = GG(d, a, b, c, x[k + 6], 9, 0xc040b340);
        c = GG(c, d, a, b, x[k + 11], 14, 0x265e5a51);
        b = GG(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
        a = GG(a, b, c, d, x[k + 5], 5, 0xd62f105d);
        d = GG(d, a, b, c, x[k + 10], 9, 0x02441453);
        c = GG(c, d, a, b, x[k + 15], 14, 0xd8a1e681);
        b = GG(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
        a = GG(a, b, c, d, x[k + 9], 5, 0x21e1cde6);
        d = GG(d, a, b, c, x[k + 14], 9, 0xc33707d6);
        c = GG(c, d, a, b, x[k + 3], 14, 0xf4d50d87);
        b = GG(b, c, d, a, x[k + 8], 20, 0x455a14ed);
        a = GG(a, b, c, d, x[k + 13], 5, 0xa9e3e905);
        d = GG(d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
        c = GG(c, d, a, b, x[k + 7], 14, 0x676f02d9);
        b = GG(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);

        a = HH(a, b, c, d, x[k + 5], 4, 0xfffa3942);
        d = HH(d, a, b, c, x[k + 8], 11, 0x8771f681);
        c = HH(c, d, a, b, x[k + 11], 16, 0x6d9d6122);
        b = HH(b, c, d, a, x[k + 14], 23, 0xfde5380c);
        a = HH(a, b, c, d, x[k + 1], 4, 0xa4beea44);
        d = HH(d, a, b, c, x[k + 4], 11, 0x4bdecfa9);
        c = HH(c, d, a, b, x[k + 7], 16, 0xf6bb4b60);
        b = HH(b, c, d, a, x[k + 10], 23, 0xbebfbc70);
        a = HH(a, b, c, d, x[k + 13], 4, 0x289b7ec6);
        d = HH(d, a, b, c, x[k + 0], 11, 0xeaa127fa);
        c = HH(c, d, a, b, x[k + 3], 16, 0xd4ef3085);
        b = HH(b, c, d, a, x[k + 6], 23, 0x04881d05);
        a = HH(a, b, c, d, x[k + 9], 4, 0xd9d4d039);
        d = HH(d, a, b, c, x[k + 12], 11, 0xe6db99e5);
        c = HH(c, d, a, b, x[k + 15], 16, 0x1fa27cf8);
        b = HH(b, c, d, a, x[k + 2], 23, 0xc4ac5665);

        a = II(a, b, c, d, x[k + 0], 6, 0xf4292244);
        d = II(d, a, b, c, x[k + 7], 10, 0x432aff97);
        c = II(c, d, a, b, x[k + 14], 15, 0xab9423a7);
        b = II(b, c, d, a, x[k + 5], 21, 0xfc93a039);
        a = II(a, b, c, d, x[k + 12], 6, 0x655b59c3);
        d = II(d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
        c = II(c, d, a, b, x[k + 10], 15, 0xffeff47d);
        b = II(b, c, d, a, x[k + 1], 21, 0x85845dd1);
        a = II(a, b, c, d, x[k + 8], 6, 0x6fa87e4f);
        d = II(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
        c = II(c, d, a, b, x[k + 6], 15, 0xa3014314);
        b = II(b, c, d, a, x[k + 13], 21, 0x4e0811a1);
        a = II(a, b, c, d, x[k + 4], 6, 0xf7537e82);
        d = II(d, a, b, c, x[k + 11], 10, 0xbd3af235);
        c = II(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb);
        b = II(b, c, d, a, x[k + 9], 21, 0xeb86d391);

        a = addUnsigned(a, AA);
        b = addUnsigned(b, BB);
        c = addUnsigned(c, CC);
        d = addUnsigned(d, DD);
    }

    return (
        wordToHex(a) +
        wordToHex(b) +
        wordToHex(c) +
        wordToHex(d)
    ).toLowerCase();
}

function getPreviewURL(gifURL) {
    const hash = md5(gifURL);
    return `/itchytasty/gifs/previews/${hash}.jpg`;
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

        const title = document.createElement("div");
        title.className = "filter-title";
        title.textContent = category;

        const select = document.createElement("select");
        select.dataset.category = category;

        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "Tous";

        select.appendChild(allOption);

        [...values]
            .sort((a, b) =>
                normalize(a).localeCompare(normalize(b))
            )
            .forEach(value => {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value;
                select.appendChild(option);
            });

        select.addEventListener("change", () => {
            currentPage = 1;
            applyFilters();
        });

        wrapper.appendChild(title);
        wrapper.appendChild(select);
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
    const selects = document.querySelectorAll(
        "#filters select[data-category]"
    );

    return [...selects].every(select => {
        const value = select.value;

        if (!value) return true;

        return gif[select.dataset.category].some(
            tag => normalize(tag) === normalize(value)
        );
    });
}

function createCard(gif) {
    const card = document.createElement("article");
    card.className = "gif-card";

    const image = document.createElement("img");
    image.className = "gif-image";
    image.src = getPreviewURL(gif.GIF);
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

    const previewURL = getPreviewURL(gif.GIF);

    card.addEventListener("mouseenter", () => {
        image.src = gif.GIF;
    });

    card.addEventListener("mouseleave", () => {
        image.src = previewURL;
    });

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

    const totalPages = Math.ceil(
        filteredGifs.length / GIFS_PER_PAGE
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

    const start = (currentPage - 1) * GIFS_PER_PAGE;
    const end = start + GIFS_PER_PAGE;

    const pageGifs = filteredGifs.slice(start, end);

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

    const totalPages = Math.max(
        1,
        Math.ceil(filteredGifs.length / GIFS_PER_PAGE)
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
