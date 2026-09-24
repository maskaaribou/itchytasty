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


/* =========================
   CSV
========================= */

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

    if (cell !== "" || row.length) {
        row.push(cell);
        rows.push(row);
    }

    return rows;
}


/* =========================
   NORMALIZE
========================= */

function normalize(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


/* =========================
   TAGS
========================= */

function splitTags(value) {
    if (!value) return [];

    return String(value)
        .split(/[,;|]/)
        .map(tag => tag.trim())
        .filter(Boolean);
}


/* =========================
   MD5
========================= */

function md5(string) {
    function rotateLeft(lValue, iShiftBits) {
        return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }

    function addUnsigned(lX, lY) {
        const lX4 = lX & 0x40000000;
        const lY4 = lY & 0x40000000;
        const lX8 = lX & 0x80000000;
        const lY8 = lY & 0x80000000;
        const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);

        if (lX4 & lY4) {
            return lResult ^ 0x80000000 ^ lX8 ^ lY8;
        }

        if (lX4 | lY4) {
            if (lResult & 0x40000000) {
                return lResult ^ 0xC0000000 ^ lX8 ^ lY8;
            }

            return lResult ^ 0x40000000 ^ lX8 ^ lY8;
        }

        return lResult ^ lX8 ^ lY8;
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

    function convertToWordArray(string) {
        const lWordCount = (((string.length + 8) >> 6) + 1) * 16;
        const lWordArray = new Array(lWordCount - 1);
        let lBytePosition = 0;
        let lByteCount = 0;

        while (lByteCount < string.length) {
            const lWordCount = lBytePosition >> 2;

            lWordArray[lWordCount] =
                (lWordArray[lWordCount] || 0) |
                (string.charCodeAt(lByteCount) << ((lBytePosition % 4) * 8));

            lBytePosition++;
            lByteCount++;
        }

        const lWordCount = lBytePosition >> 2;

        lWordArray[lWordCount] =
            (lWordArray[lWordCount] || 0) |
            (0x80 << ((lBytePosition % 4) * 8));

        lWordArray[lWordCount - 1] = string.length << 3;
        lWordArray[lWordCount - 2] = string.length >>> 29;

        return lWordArray;
    }

    function wordToHex(lValue) {
        let wordToHexValue = "";
        for (let lCount = 0; lCount <= 3; lCount++) {
            const byte = (lValue >>> (lCount * 8)) & 255;

            wordToHexValue +=
                ("0" + byte.toString(16)).slice(-2);
        }

        return wordToHexValue;
    }

    const x = convertToWordArray(unescape(encodeURIComponent(string)));

    let a = 0x67452301;
    let b = 0xEFCDAB89;
    let c = 0x98BADCFE;
    let d = 0x10325476;

    const S11 = 7;
    const S12 = 12;
    const S13 = 17;
    const S14 = 22;

    const S21 = 5;
    const S22 = 9;
    const S23 = 14;
    const S24 = 20;

    const S31 = 4;
    const S32 = 11;
    const S33 = 16;
    const S34 = 23;

    const S41 = 6;
    const S42 = 10;
    const S43 = 15;
    const S44 = 21;

    for (let k = 0; k < x.length; k += 16) {
        const AA = a;
        const BB = b;
        const CC = c;
        const DD = d;

        a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
        d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
        c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
        b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);

        a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
        d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
        c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
        b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);

        a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
        d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
        c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
        b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);

        a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
        d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
        c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
        b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);

        a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
        d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
        c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
        b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);

        a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
        d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
        c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
        b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);

        a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
        d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
        c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
        b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);

        a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
        d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
        c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
        b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);

        a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
        d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
        c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
        b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);

        a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
        d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
        c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
        b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);

        a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
        d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
        c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
        b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);

        a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
        d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
        c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
        b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);

        a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
        d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
        c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
        b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);

        a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
        d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
        c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
        b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);

        a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
        d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
        c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
        b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);

        a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
        d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
        c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
        b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);

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


/* =========================
   PREVIEW
========================= */

function getPreviewURL(url) {
    if (!url) return "";

    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=500&q=80`;
}


/* =========================
   LOAD DATA
========================= */

async function loadData() {
    try {
        const response = await fetch(CSV_URL);

        if (!response.ok) {
            throw new Error("Impossible de charger le CSV.");
        }

        const text = await response.text();
        const rows = parseCSV(text);

        if (!rows.length) return;

        const headers = rows[0].map(header => header.trim());

        gifs = rows
            .slice(1)
            .map(row => {
                const gif = {};

                headers.forEach((header, index) => {
                    gif[header] = row[index] || "";
                });

                CATEGORIES.forEach(category => {
                    gif[category] = splitTags(gif[category]);
                });

                return gif;
            })
            .filter(gif => gif.GIF);

        createFilters();
        applyFilters();

    } catch (error) {
        console.error(error);
    }
}


/* =========================
   FILTERS
========================= */

function createFilters() {
    const container = document.getElementById("filters");

    if (!container) return;

    container.innerHTML = "";

    CATEGORIES.forEach(category => {
        const wrapper = document.createElement("div");
        wrapper.className = "filter";

        const button = document.createElement("button");
        button.textContent = category;

        const options = document.createElement("div");
        options.className = "filter-options";

        const values = new Set();

        gifs.forEach(gif => {
            gif[category].forEach(value => {
                values.add(value);
            });
        });

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
                    document.createTextNode(value)
                );

                options.appendChild(label);
            });

        button.addEventListener("click", () => {
            wrapper.classList.toggle("open");
        });

        wrapper.appendChild(button);
        wrapper.appendChild(options);

        container.appendChild(wrapper);
    });
}


/* =========================
   SEARCH
========================= */

function matchesSearch(gif, search) {
    if (!search.trim()) return true;

    const normalizedSearch = normalize(search);

    return CATEGORIES.some(category =>
        gif[category].some(value =>
            normalize(value).includes(normalizedSearch)
        )
    );
}


/* =========================
   FILTER MATCHING
========================= */

function matchesFilters(gif) {
    const checked = document.querySelectorAll(
        "#filters input[type='checkbox']:checked"
    );

    const grouped = {};

    checked.forEach(input => {
        const category = input.dataset.category;

        if (!grouped[category]) {
            grouped[category] = [];
        }

        grouped[category].push(
            normalize(input.value)
        );
    });

    return Object.entries(grouped).every(
        ([category, values]) =>
            values.some(selected =>
                gif[category].some(value =>
                    normalize(value) === selected
                )
            )
    );
}


/* =========================
   CARD
========================= */

function createCard(gif) {
    const card = document.createElement("article");
    card.className = "gif-card";

    const image = document.createElement("img");
    image.className = "gif-image";
    image.src = getPreviewURL(gif.GIF);
    image.alt = gif.Nom.join(", ");

    image.addEventListener("mouseenter", () => {
        image.src = gif.GIF;
    });

    image.addEventListener("mouseleave", () => {
        image.src = getPreviewURL(gif.GIF);
    });

    card.appendChild(image);

    const tags = document.createElement("div");
    tags.className = "gif-tags";

    CATEGORIES.forEach(category => {
        gif[category].forEach(value => {
            const tag = document.createElement("span");

            tag.className = `tag tag-${normalize(category)}`;
            tag.textContent = value;

            tags.appendChild(tag);
        });
    });

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


/* =========================
   PAGINATION
========================= */

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

    const multiplePages = multipleNames.length
        ? Math.ceil(multipleNames.length / GIFS_PER_PAGE)
        : 0;

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


/* =========================
   RENDER
========================= */

function render() {
    const container = document.getElementById("results");
    const empty = document.getElementById("empty");

    if (!container) return;

    container.innerHTML = "";

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
        container.appendChild(createCard(gif));
    });

    if (empty) {
        empty.style.display =
            filteredGifs.length === 0 ? "" : "none";
    }

    createPagination();
}


/* =========================
   APPLY FILTERS
========================= */

function applyFilters() {
    const searchInput = document.getElementById("search");
    const search = searchInput
        ? searchInput.value
        : "";

    filteredGifs = gifs.filter(gif => {
        return (
            matchesSearch(gif, search) &&
            matchesFilters(gif)
        );
    });

    currentPage = Math.max(1, currentPage);

    const multipleNames = filteredGifs.filter(
        gif => gif.Nom.length >= 2
    );

    const singleNames = filteredGifs.filter(
        gif => gif.Nom.length < 2
    );

    const multiplePages = multipleNames.length
        ? Math.ceil(
            multipleNames.length / GIFS_PER_PAGE
        )
        : 0;

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


/* =========================
   SEARCH EVENT
========================= */

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            currentPage = 1;
            applyFilters();
        });
    }

    loadData();
});
