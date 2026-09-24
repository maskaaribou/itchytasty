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

function getPreviewURL(gifURL) {
    const hash = md5(gifURL);

    return `previews/${hash}.jpg`;
}

function md5(string) {
    function rotateLeft(value, amount) {
        return (value << amount) | (value >>> (32 - amount));
    }

    function addUnsigned(x, y) {
        const low = (x & 0xFFFF) + (y & 0xFFFF);
        const high = (x >>> 16) + (y >>> 16) + (low >>> 16);

        return (high << 16) | (low & 0xFFFF);
    }

    function md5cmn(q, a, b, x, s, t) {
        return addUnsigned(
            rotateLeft(
                addUnsigned(
                    addUnsigned(a, q),
                    addUnsigned(x, t)
                ),
                s
            ),
            b
        );
    }

    function md5ff(a, b, c, d, x, s, t) {
        return md5cmn((b & c) | (~b & d), a, b, x, s, t);
    }

    function md5gg(a, b, c, d, x, s, t) {
        return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
    }

    function md5hh(a, b, c, d, x, s, t) {
        return md5cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function md5ii(a, b, c, d, x, s, t) {
        return md5cmn(c ^ (b | ~d), a, b, x, s, t);
    }

    function convertToWordArray(string) {
        const messageLength = string.length;
        const numberOfWords = (((messageLength + 8) >>> 6) + 1) * 16;
        const words = new Array(numberOfWords).fill(0);

        for (let i = 0; i < messageLength; i++) {
            words[i >> 2] |= string.charCodeAt(i) << ((i % 4) * 8);
        }

        words[messageLength >> 2] |= 0x80 << ((messageLength % 4) * 8);
        words[numberOfWords - 2] = messageLength << 3;
        words[numberOfWords - 1] = messageLength >>> 29;

        return words;
    }

    const x = convertToWordArray(string);

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

    for (let i = 0; i < x.length; i += 16) {
        const oldA = a;
        const oldB = b;
        const oldC = c;
        const oldD = d;

        a = md5ff(a, b, c, d, x[i], S11, 0xD76AA478);
        d = md5ff(d, a, b, c, x[i + 1], S12, 0xE8C7B756);
        c = md5ff(c, d, a, b, x[i + 2], S13, 0x242070DB);
        b = md5ff(b, c, d, a, x[i + 3], S14, 0xC1BDCEEE);

        a = md5ff(a, b, c, d, x[i + 4], S11, 0xF57C0FAF);
        d = md5ff(d, a, b, c, x[i + 5], S12, 0x4787C62A);
        c = md5ff(c, d, a, b, x[i + 6], S13, 0xA8304613);
        b = md5ff(b, c, d, a, x[i + 7], S14, 0xFD469501);

        a = md5ff(a, b, c, d, x[i + 8], S11, 0x698098D8);
        d = md5ff(d, a, b, c, x[i + 9], S12, 0x8B44F7AF);
        c = md5ff(c, d, a, b, x[i + 10], S13, 0xFFFF5BB1);
        b = md5ff(b, c, d, a, x[i + 11], S14, 0x895CD7BE);

        a = md5ff(a, b, c, d, x[i + 12], S11, 0x6B901122);
        d = md5ff(d, a, b, c, x[i + 13], S12, 0xFD987193);
        c = md5ff(c, d, a, b, x[i + 14], S13, 0xA679438E);
        b = md5ff(b, c, d, a, x[i + 15], S14, 0x49B40821);

        a = md5gg(a, b, c, d, x[i + 1], S21, 0xF61E2562);
        d = md5gg(d, a, b, c, x[i + 6], S22, 0xC040B340);
        c = md5gg(c, d, a, b, x[i + 11], S23, 0x265E5A51);
        b = md5gg(b, c, d, a, x[i], S24, 0xE9B6C7AA);

        a = md5gg(a, b, c, d, x[i + 5], S21, 0xD62F105D);
        d = md5gg(d, a, b, c, x[i + 10], S22, 0x02441453);
        c = md5gg(c, d, a, b, x[i + 15], S23, 0xD8A1E681);
        b = md5gg(b, c, d, a, x[i + 4], S24, 0xE7D3FBC8);

        a = md5gg(a, b, c, d, x[i + 9], S21, 0x21E1CDE6);
        d = md5gg(d, a, b, c, x[i + 14], S22, 0xC33707D6);
        c = md5gg(c, d, a, b, x[i + 3], S23, 0xF4D50D87);
        b = md5gg(b, c, d, a, x[i + 8], S24, 0x455A14ED);

        a = md5gg(a, b, c, d, x[i + 13], S21, 0xA9E3E905);
        d = md5gg(d, a, b, c, x[i + 2], S22, 0xFCEFA3F8);
        c = md5gg(c, d, a, b, x[i + 7], S23, 0x676F02D9);
        b = md5gg(b, c, d, a, x[i + 12], S24, 0x8D2A4C8A);

        a = md5hh(a, b, c, d, x[i + 5], S31, 0xFFFA3942);
        d = md5hh(d, a, b, c, x[i + 8], S32, 0x8771F681);
        c = md5hh(c, d, a, b, x[i + 11], S33, 0x6D9D6122);
        b = md5hh(b, c, d, a, x[i + 14], S34, 0xFDE5380C);

        a = md5hh(a, b, c, d, x[i + 1], S31, 0xA4BEEA44);
        d = md5hh(d, a, b, c, x[i + 4], S32, 0x4BDECFA9);
        c = md5hh(c, d, a, b, x[i + 7], S33, 0xF6BB4B60);
        b = md5hh(b, c, d, a, x[i + 10], S34, 0xBEBFBC70);

        a = md5hh(a, b, c, d, x[i + 13], S31, 0x289B7EC6);
        d = md5hh(d, a, b, c, x[i], S32, 0xEAA127FA);
        c = md5hh(c, d, a, b, x[i + 3], S33, 0xD4EF3085);
        b = md5hh(b, c, d, a, x[i + 6], S34, 0x04881D05);

        a = md5hh(a, b, c, d, x[i + 9], S31, 0xD9D4D039);
        d = md5hh(d, a, b, c, x[i + 12], S32, 0xE6DB99E5);
        c = md5hh(c, d, a, b, x[i + 15], S33, 0x1FA27CF8);
        b = md5hh(b, c, d, a, x[i + 2], S34, 0xC4AC5665);

        a = md5ii(a, b, c, d, x[i], S41, 0xF4292244);
        d = md5ii(d, a, b, c, x[i + 7], S42, 0x432AFF97);
        c = md5ii(c, d, a, b, x[i + 14], S43, 0xAB9423A7);
        b = md5ii(b, c, d, a, x[i + 5], S44, 0xFC93A039);

        a = md5ii(a, b, c, d, x[i + 12], S41, 0x655B59C3);
        d = md5ii(d, a, b, c, x[i + 3], S42, 0x8F0CCC92);
        c = md5ii(c, d, a, b, x[i + 10], S43, 0xFFEFF47D);
        b = md5ii(b, c, d, a, x[i + 1], S44, 0x85845DD1);

        a = md5ii(a, b, c, d, x[i + 8], S41, 0x6FA87E4F);
        d = md5ii(d, a, b, c, x[i + 15], S42, 0xFE2CE6E0);
        c = md5ii(c, d, a, b, x[i + 6], S43, 0xA3014314);
        b = md5ii(b, c, d, a, x[i + 13], S44, 0x4E0811A1);

        a = addUnsigned(a, oldA);
        b = addUnsigned(b, oldB);
        c = addUnsigned(c, oldC);
        d = addUnsigned(d, oldD);
    }

    return [a, b, c, d]
        .map(value => {
            let result = "";

            for (let i = 0; i < 4; i++) {
                result += ("0" + ((value >> (i * 8)) & 0xFF).toString(16)).slice(-2);
            }

            return result;
        })
        .join("");
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

    const imageWrapper = document.createElement("div");
    imageWrapper.className = "gif-preview";

    const image = document.createElement("img");
    image.className = "gif-image";
    image.src = getPreviewURL(gif.GIF);
    image.alt = gif.Nom.join(", ");

    imageWrapper.appendChild(image);

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

    card.appendChild(imageWrapper);
    card.appendChild(tags);

    let animated = false;

    card.addEventListener("mouseenter", () => {
        if (animated) {
            return;
        }

        animated = true;

        const gifImage = document.createElement("img");

        gifImage.className = "gif-image";
        gifImage.src = gif.GIF;
        gifImage.alt = image.alt;

        image.replaceWith(gifImage);
    });

    card.addEventListener("mouseleave", () => {
        const currentImage = card.querySelector(".gif-image");

        if (!currentImage) {
            return;
        }

        const preview = document.createElement("img");

        preview.className = "gif-image";
        preview.src = getPreviewURL(gif.GIF);
        preview.alt = image.alt;

        currentImage.replaceWith(preview);

        animated = false;
    });

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
