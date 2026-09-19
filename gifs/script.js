const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8CIQQhD3_8ZUHFTjfBpVRHg80thTHSu-gZFH37f-PNOGEeYjM7Bu_2ZinK59tVDYxrJM5lpkue8Iy/pub?gid=1913411064&single=true&output=csv";

const categories = [
	"Nom",
	"Location",
	"Time",
	"Item",
	"Feeling",
	"Action"
];

const results = document.getElementById("results");
const filters = document.getElementById("filters");
const search = document.getElementById("search");
const count = document.getElementById("count");
const empty = document.getElementById("empty");

let gifs = [];
let activeFilters = {};


/* ─────────────────────────────
   CSV
───────────────────────────── */

function parseCSV(text) {

	const rows = [];
	let row = [];
	let cell = "";
	let quoted = false;

	for (let i = 0; i < text.length; i++) {

		const char = text[i];
		const next = text[i + 1];

		if (char === '"' && quoted && next === '"') {
			cell += '"';
			i++;
			continue;
		}

		if (char === '"') {
			quoted = !quoted;
			continue;
		}

		if (char === "," && !quoted) {
			row.push(cell.trim());
			cell = "";
			continue;
		}

		if ((char === "\n" || char === "\r") && !quoted) {

			if (char === "\r" && next === "\n") {
				i++;
			}

			row.push(cell.trim());
			cell = "";

			if (row.some(value => value !== "")) {
				rows.push(row);
			}

			row = [];
			continue;
		}

		cell += char;
	}

	if (cell || row.length) {
		row.push(cell.trim());
		rows.push(row);
	}

	return rows;
}


/* ─────────────────────────────
   NORMALISATION
───────────────────────────── */

function normalize(value) {

	return String(value || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();

}


function splitTags(value) {

	return String(value || "")
		.split(",")
		.map(tag => normalize(tag))
		.filter(Boolean);

}


/* ─────────────────────────────
   CHARGEMENT
───────────────────────────── */

async function loadData() {

	try {

		const response = await fetch(CSV_URL);

		if (!response.ok) {
			throw new Error("CSV loading error");
		}

		const text = await response.text();
		const rows = parseCSV(text);

		if (!rows.length) {
			return;
		}

		const headers = rows[0].map(normalize);

		gifs = rows.slice(1)
			.map(row => {

				const gif = {};

				headers.forEach((header, index) => {
					gif[header] = row[index] || "";
				});

				categories.forEach(category => {

					const key = normalize(category);

					gif[key] = splitTags(gif[key]);

				});

				return gif;

			})
			.filter(gif => gif.gif);

		createFilters();
		render();

	} catch (error) {

		console.error(error);

		count.textContent = "Unable to load GIFs.";

	}

}


/* ─────────────────────────────
   FILTRES
───────────────────────────── */

function createFilters() {

	filters.innerHTML = "";

	categories.forEach(category => {

		const key = normalize(category);

		const values = new Set();

		gifs.forEach(gif => {

			(gif[key] || []).forEach(value => {
				values.add(value);
			});

		});

		if (!values.size) {
			return;
		}

		const categoryElement = document.createElement("div");

		categoryElement.className = "filter-category";


		const title = document.createElement("div");

		title.className = "filter-category-title";

		title.textContent = category;

		categoryElement.appendChild(title);


		[...values]
			.sort((a, b) => a.localeCompare(b))
			.forEach(value => {

				const button = document.createElement("button");

				button.className = "filter-button";

				button.textContent = value;

				button.dataset.category = key;
				button.dataset.value = value;


				button.addEventListener("click", () => {

					const current = activeFilters[key];

					if (current === value) {

						delete activeFilters[key];

						button.classList.remove("active");

					} else {

						categoryElement
							.querySelectorAll(".filter-button")
							.forEach(button => {
								button.classList.remove("active");
							});

						activeFilters[key] = value;

						button.classList.add("active");

					}

					render();

				});


				categoryElement.appendChild(button);

			});


		filters.appendChild(categoryElement);

	});

}


/* ─────────────────────────────
   RECHERCHE
───────────────────────────── */

function matchesSearch(gif) {

	const words = normalize(search.value)
		.split(/\s+/)
		.filter(Boolean);

	if (!words.length) {
		return true;
	}


	const searchable = categories
		.flatMap(category => gif[normalize(category)] || [])
		.join(" ");


	return words.every(word =>
		searchable.includes(word)
	);

}


/* ─────────────────────────────
   FILTRES ACTIFS
───────────────────────────── */

function matchesFilters(gif) {

	return Object.entries(activeFilters)
		.every(([category, value]) => {

			return (gif[category] || [])
				.includes(value);

		});

}


/* ─────────────────────────────
   RÉSULTATS
───────────────────────────── */

function getResults() {

	return gifs.filter(gif => {

		return matchesSearch(gif)
			&& matchesFilters(gif);

	});

}


/* ─────────────────────────────
   CARTE GIF
───────────────────────────── */

function createCard(gif) {

	const card = document.createElement("article");

	card.className = "gif-card";


	const image = document.createElement("img");

	image.className = "gif-image";

	image.alt = "";


	/*
		Le GIF n'est pas chargé immédiatement.
	*/

	image.dataset.src = gif.gif;


	/*
		IntersectionObserver :
		on ne prépare que les GIFs réellement
		visibles dans la page.
	*/

	image.addEventListener("mouseenter", () => {

		if (!image.src) {
			image.src = image.dataset.src;
		}

	});


	const tagContainer = document.createElement("div");

	tagContainer.className = "gif-tags";


	const visibleTags = categories
		.flatMap(category => gif[normalize(category)] || []);


	[...new Set(visibleTags)]
		.forEach(tag => {

			const element = document.createElement("span");

			element.className = "gif-tag";

			element.textContent = tag;

			tagContainer.appendChild(element);

		});


	card.appendChild(image);
	card.appendChild(tagContainer);


	return card;

}


/* ─────────────────────────────
   AFFICHAGE
───────────────────────────── */

function render() {

	const filtered = getResults();

	results.innerHTML = "";

	filtered.forEach(gif => {

		results.appendChild(
			createCard(gif)
		);

	});


	count.textContent =
		filtered.length +
		" GIF" +
		(filtered.length > 1 ? "s" : "");


	empty.classList.toggle(
		"visible",
		filtered.length === 0
	);

}


/* ─────────────────────────────
   RECHERCHE LIVE
───────────────────────────── */

search.addEventListener("input", render);


/* ─────────────────────────────
   DÉMARRAGE
───────────────────────────── */

loadData();
