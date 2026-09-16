const API_BASE = "https://pokeapi.co/api/v2";
const ARTWORK_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
const STORE_BASE = "https://www.pokemoncenter.com/search";

const TYPE_COLORS = {
  normal: "var(--type-normal)",
  fire: "var(--type-fire)",
  water: "var(--type-water)",
  electric: "var(--type-electric)",
  grass: "var(--type-grass)",
  ice: "var(--type-ice)",
  fighting: "var(--type-fighting)",
  poison: "var(--type-poison)",
  ground: "var(--type-ground)",
  flying: "var(--type-flying)",
  psychic: "var(--type-psychic)",
  bug: "var(--type-bug)",
  rock: "var(--type-rock)",
  ghost: "var(--type-ghost)",
  dragon: "var(--type-dragon)",
  dark: "var(--type-dark)",
  steel: "var(--type-steel)",
  fairy: "var(--type-fairy)",
};

/* =========================================================
   Multi-generation setup
   ========================================================= */

const GENERATIONS = [
  { id: 1, roman: "I",    region: "Kanto",  range: [1, 151],   blurb: "The original 151 — where it all began." },
  { id: 2, roman: "II",   region: "Johto",  range: [152, 251], blurb: "Gold & Silver's region, generation II." },
  { id: 3, roman: "III",  region: "Hoenn",  range: [252, 386], blurb: "Ruby & Sapphire's tropical region, generation III." },
  { id: 4, roman: "IV",   region: "Sinnoh", range: [387, 493], blurb: "Diamond & Pearl's region, generation IV." },
  { id: 5, roman: "V",    region: "Unova",  range: [494, 649], blurb: "Black & White's region, generation V." },
  { id: 6, roman: "VI",   region: "Kalos",  range: [650, 721], blurb: "X & Y's region, generation VI." },
  { id: 7, roman: "VII",  region: "Alola",  range: [722, 809], blurb: "Sun & Moon's island region, generation VII." },
  { id: 8, roman: "VIII", region: "Galar",  range: [810, 905], blurb: "Sword & Shield's region, generation VIII." },
  { id: 9, roman: "IX",   region: "Paldea", range: [906, 1025],blurb: "Scarlet & Violet's region, generation IX." },
];

let currentGenId = 1;
const pokemonCache = new Map(); // id -> normalized pokemon

// Each region gets its own palette: four corner-glow colors ("r,g,b" strings),
// a dot-texture tint, and a ground-band color for the jagged strip at page bottom.
const REGION_THEMES = {
  1: { tl: "227,53,13",  tr: "78,150,216",  bl: "111,184,106", br: "255,201,77",  dot: "31,37,68",   ground: "#4B7A5C" }, // Kanto — classic fields
  2: { tl: "122,46,46",  tr: "212,160,23",  bl: "139,94,52",   br: "201,168,88",  dot: "90,60,30",    ground: "#8B5E34" }, // Johto — autumn shrine paths
  3: { tl: "27,154,160", tr: "255,122,89",  bl: "29,111,165",  br: "255,183,94",  dot: "20,110,120",  ground: "#1D6FA5" }, // Hoenn — tropical seas
  4: { tl: "111,184,217",tr: "124,135,152", bl: "169,198,217", br: "210,225,235", dot: "70,110,140",  ground: "#7C93A6" }, // Sinnoh — snowy peaks
  5: { tl: "52,80,107",  tr: "138,95,191",  bl: "75,105,135",  br: "170,140,210", dot: "40,50,80",    ground: "#4B4F58" }, // Unova — city lights
  6: { tl: "232,140,166",tr: "217,180,91",  bl: "183,159,201", br: "240,200,215", dot: "150,90,120",  ground: "#B79FC9" }, // Kalos — elegant Paris
  7: { tl: "47,191,176", tr: "255,140,105", bl: "255,183,120", br: "120,200,190", dot: "20,140,130",  ground: "#E4C28B" }, // Alola — island sunset
  8: { tl: "91,84,112",  tr: "110,139,139", bl: "80,80,100",   br: "150,158,158", dot: "70,65,90",    ground: "#6B6F76" }, // Galar — misty stadiums
  9: { tl: "217,118,68", tr: "138,154,91",  bl: "201,123,74",  br: "190,160,100", dot: "150,90,50",   ground: "#C97B4A" }, // Paldea — Mediterranean
  all:{ tl: "227,53,13", tr: "78,150,216",  bl: "111,184,106", br: "255,201,77",  dot: "31,37,68",    ground: "#4B7A5C" }, // National Dex — a bit of everything
};

function regionSlug(genId) {
  if (genId === "all") return "national";
  const gen = GENERATIONS.find((g) => g.id === genId);
  return gen ? gen.region.toLowerCase() : "kanto";
}

function applyRegionTheme(genId) {
  const theme = REGION_THEMES[genId] || REGION_THEMES[1];
  const root = document.documentElement.style;
  root.setProperty("--theme-tl", theme.tl);
  root.setProperty("--theme-tr", theme.tr);
  root.setProperty("--theme-bl", theme.bl);
  root.setProperty("--theme-br", theme.br);
  root.setProperty("--theme-dot", theme.dot);
  root.setProperty("--theme-ground", theme.ground);
  document.body.dataset.region = regionSlug(genId);
}

function rangeArray(a, b) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

function idsForGen(genId) {
  if (genId === "all") return rangeArray(1, 1025);
  const gen = GENERATIONS.find((g) => g.id === genId);
  return gen ? rangeArray(gen.range[0], gen.range[1]) : [];
}

function renderGenTabs() {
  const tabsEl = document.querySelector("#gen-tabs");
  const chips = GENERATIONS.map(
    (g) => `<button class="gen-tab" data-gen="${g.id}" title="${g.region}">${g.roman}</button>`
  ).join("");
  tabsEl.innerHTML = chips + `<button class="gen-tab" data-gen="all" title="National Dex">All</button>`;

  tabsEl.querySelectorAll(".gen-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const raw = btn.dataset.gen;
      const genId = raw === "all" ? "all" : Number(raw);
      if (genId === currentGenId) return;
      loadGeneration(genId);
    });
  });
}

function updateActiveGenTab() {
  document.querySelectorAll(".gen-tab").forEach((btn) => {
    const raw = btn.dataset.gen;
    const genId = raw === "all" ? "all" : Number(raw);
    btn.classList.toggle("active", genId === currentGenId);
  });
}

function updateHeaderForGen(genId) {
  const titleEl = document.querySelector("#page-title");
  const subtitleEl = document.querySelector("#page-subtitle");
  if (genId === "all") {
    titleEl.textContent = "National Pokédex";
    subtitleEl.textContent = "Every generation, all in one Pokédex.";
  } else {
    const gen = GENERATIONS.find((g) => g.id === genId);
    titleEl.textContent = `${gen.region} Pokédex`;
    subtitleEl.textContent = gen.blurb;
  }
}

/* =========================================================
   World Map — a stylized world view, one island per region.
   Positions are loosely inspired by each region's real-world
   counterpart (Japan, Europe, etc.), not literal geography.
   ========================================================= */

const MAP_LAYOUT = {
  5: { left: 12, top: 48, w: 86, h: 70, radius: "52% 48% 46% 54% / 55% 45% 55% 45%" }, // Unova
  7: { left: 28, top: 78, w: 58, h: 46, radius: "50% 50% 50% 50% / 55% 45% 55% 45%" }, // Alola
  1: { left: 46, top: 42, w: 76, h: 62, radius: "58% 42% 55% 45% / 55% 60% 40% 45%" }, // Kanto
  2: { left: 55, top: 23, w: 64, h: 54, radius: "45% 55% 60% 40% / 50% 45% 55% 50%" }, // Johto
  3: { left: 40, top: 63, w: 68, h: 56, radius: "50% 50% 40% 60% / 45% 55% 45% 55%" }, // Hoenn
  4: { left: 58, top: 9,  w: 72, h: 58, radius: "55% 45% 50% 50% / 60% 40% 60% 40%" }, // Sinnoh
  6: { left: 75, top: 40, w: 74, h: 58, radius: "55% 45% 55% 45% / 50% 50% 50% 50%" }, // Kalos
  8: { left: 71, top: 15, w: 66, h: 54, radius: "48% 52% 48% 52% / 55% 45% 55% 45%" }, // Galar
  9: { left: 86, top: 60, w: 66, h: 52, radius: "52% 48% 52% 48% / 48% 52% 48% 52%" }, // Paldea
};

function renderMapIslands() {
  const ocean = document.querySelector("#map-ocean");
  if (!ocean) return;

  ocean.innerHTML = GENERATIONS.map((gen) => {
    const layout = MAP_LAYOUT[gen.id];
    const theme = REGION_THEMES[gen.id];
    return `
      <button
        class="map-island"
        data-gen="${gen.id}"
        style="
          left:${layout.left}%; top:${layout.top}%;
          width:${layout.w}px; height:${layout.h}px;
          border-radius:${layout.radius};
          background: linear-gradient(155deg, rgb(${theme.tl}) 0%, rgb(${theme.br}) 100%);
          --glow-color: rgba(${theme.tl}, 0.6);
        "
        aria-label="${gen.region}"
      >
        <span class="roman">${gen.roman}</span>
        <span class="region-name">${gen.region}</span>
      </button>
    `;
  }).join("");

  const caption = document.querySelector("#map-caption");
  const defaultCaption = "Hover or tap a region to preview it, then click to jump straight there.";

  ocean.querySelectorAll(".map-island").forEach((island) => {
    const genId = Number(island.dataset.gen);
    const gen = GENERATIONS.find((g) => g.id === genId);

    island.addEventListener("mouseenter", () => {
      caption.textContent = `${gen.region} — ${gen.blurb}`;
    });
    island.addEventListener("focus", () => {
      caption.textContent = `${gen.region} — ${gen.blurb}`;
    });
    island.addEventListener("mouseleave", () => {
      caption.textContent = defaultCaption;
    });
    island.addEventListener("blur", () => {
      caption.textContent = defaultCaption;
    });
    island.addEventListener("click", () => {
      loadGeneration(genId);
      document.querySelector("#map-dialog").close();
    });
  });

  updateMapActiveIsland();
}

function updateMapActiveIsland() {
  document.querySelectorAll(".map-island").forEach((island) => {
    island.classList.toggle("active", Number(island.dataset.gen) === currentGenId);
  });
}

/* =========================================================
   Shared helpers
   ========================================================= */

const grid = document.querySelector("#grid");
const statusEl = document.querySelector("#status");
const searchInput = document.querySelector("#search");
const resultCount = document.querySelector("#result-count");
const dialog = document.querySelector("#detail-dialog");
const closeDetail = document.querySelector("#close-detail");

let pokemonList = [];

function padId(id) {
  return `#${String(id).padStart(3, "0")}`;
}

function titleCase(name) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function artworkUrl(id) {
  return `${ARTWORK_BASE}/${id}.png`;
}

function storeUrl(name) {
  return `${STORE_BASE}/${name}`;
}

function merchLabel(name) {
  return `Find ${titleCase(name)} Merch on Pokémon Center`;
}

function typePills(types) {
  return types
    .map(
      (type) =>
        `<span class="type-pill" style="--pill:${TYPE_COLORS[type] || "var(--accent)"}">${type}</span>`
    )
    .join("");
}

function showStatus(message, visible = true, spinning = false) {
  statusEl.hidden = !visible;
  statusEl.innerHTML = spinning
    ? `<span class="pokeball spin"></span><span>${message}</span>`
    : message;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

async function mapWithConcurrency(items, limit, mapper, onProgress) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current], current);
      completed += 1;
      if (onProgress) onProgress(completed, items.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function normalizePokemon(detail) {
  return {
    id: detail.id,
    name: detail.name,
    types: detail.types.map((entry) => entry.type.name),
    stats: detail.stats.map((entry) => ({
      name: entry.stat.name,
      value: entry.base_stat,
    })),
    abilities: detail.abilities.map((entry) => ({
      name: entry.ability.name,
      hidden: entry.is_hidden,
    })),
    height: detail.height,
    weight: detail.weight,
    // Retro pixel sprite only exists for Pokémon that were in the Gen V games (dex 1–649).
    retroSprite: detail.sprites?.versions?.["generation-v"]?.["black-white"]?.front_default || null,
    // Animated 3D-style sprite (Showdown) — this is what actually moves in 3D mode.
    showdownSprite: detail.sprites?.other?.showdown?.front_default || null,
    // Full move-learn data (kept raw so the detail modal can split it into
    // Level-Up vs TM tables with exact levels/methods).
    movesRaw: (detail.moves || []).map((entry) => ({
      name: entry.move.name,
      details: entry.version_group_details,
    })),
  };
}

// Tracks the user's 2D / 3D sprite preference from the header toggle.
let spriteMode = "3d"; // "3d" | "2d"

// Retro pixel sprites only exist for generations I–V (dex 1–649) — Gens VI–IX
// never had 2D sprite sheets, so the toggle is hidden and 3D is forced there.
function isRetroEligibleGen(genId) {
  return typeof genId === "number" && genId >= 1 && genId <= 5;
}

function isRetroActiveNow() {
  return isRetroEligibleGen(currentGenId) && spriteMode === "2d";
}

// Resolves which sprite to show and whether it should get the retro pixel
// treatment. Retro 2D uses the colored Gen V pixel sprite when the current
// generation actually has one. Otherwise (3D mode, or any gen outside I–V)
// we prefer the animated Showdown sprite so Pokémon visibly move — falling
// back to static official artwork for the rare entry without one.
function resolveSprite(pokemon) {
  if (isRetroActiveNow() && pokemon.retroSprite) {
    return { url: pokemon.retroSprite, retro: true };
  }
  if (pokemon.showdownSprite) {
    return { url: pokemon.showdownSprite, retro: false };
  } else {
    return { url: artworkUrl(pokemon.id), retro: false };
  }
}

function updateSpriteToggleVisibility() {
  const toggleEl = document.querySelector(".sprite-toggle");
  if (!toggleEl) return;
  toggleEl.style.display = isRetroEligibleGen(currentGenId) ? "flex" : "none";
}

/* =========================================================
   Loading a generation
   ========================================================= */

async function loadGeneration(genId) {
  currentGenId = genId;
  updateActiveGenTab();
  updateHeaderForGen(genId);
  applyRegionTheme(genId);
  updateOakProfessor();
  updateMapActiveIsland();
  updateSpriteToggleVisibility();
  searchInput.value = "";

  const ids = idsForGen(genId);
  const missing = ids.filter((id) => !pokemonCache.has(id));

  if (missing.length) {
    const label = genId === "all" ? "the National Dex" : GENERATIONS.find((g) => g.id === genId).region;
    showStatus(`Fetching 0 of ${missing.length} Pokémon from ${label}…`, true, true);
    resultCount.textContent = "Loading…";
    grid.innerHTML = "";

    try {
      await mapWithConcurrency(
        missing,
        24,
        async (id) => {
          const detail = await fetchJson(`${API_BASE}/pokemon/${id}`);
          pokemonCache.set(id, normalizePokemon(detail));
        },
        (done, total) => {
          showStatus(`Fetching ${done} of ${total} Pokémon from ${label}…`, true, true);
        }
      );
    } catch (error) {
      console.error(error);
      showStatus("Could not load Pokémon data. Check your internet connection and refresh.");
      resultCount.textContent = "Unable to load Pokédex";
      return;
    }
  }

  pokemonList = ids.map((id) => pokemonCache.get(id)).filter(Boolean);
  showStatus("", false);
  renderGrid(pokemonList);
}

/* =========================================================
   Grid / search / detail
   ========================================================= */

function matchesQuery(pokemon, query) {
  if (!query) return true;
  const haystack = `${pokemon.name} ${pokemon.types.join(" ")} ${pokemon.id}`.toLowerCase();
  return haystack.includes(query);
}

function renderGrid(list) {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = list.filter((pokemon) => matchesQuery(pokemon, query));

  resultCount.textContent = `${filtered.length} of ${list.length} Pokémon`;

  if (!filtered.length) {
    grid.innerHTML = "";
    showStatus("No Pokémon match that search. Try a name like Pikachu or a type like grass.");
    return;
  }

  showStatus("", false);
  grid.innerHTML = filtered
    .map((pokemon) => {
      const primary = pokemon.types[0];
      return `
        <article class="card" role="listitem" tabindex="0" data-id="${pokemon.id}" style="--accent-type:${TYPE_COLORS[primary]}">
          <div class="card-image-container">
            ${(() => {
              const sprite = resolveSprite(pokemon);
              return `<img class="card-image${sprite.retro ? " retro-sprite" : ""}" src="${sprite.url}" alt="${titleCase(pokemon.name)} sprite" loading="lazy" />`;
            })()}
            <div class="trophy-base"></div>
          </div>
          <p class="poke-id">${padId(pokemon.id)}</p>
          <h2>${titleCase(pokemon.name)}</h2>
          <p class="quick-stats">${(pokemon.height / 10).toFixed(1)}m • ${(pokemon.weight / 10).toFixed(1)}kg</p>
          <div class="types">${typePills(pokemon.types)}</div>
          <a class="merch-btn" href="${storeUrl(pokemon.name)}" target="_blank" rel="noopener noreferrer">
            ${merchLabel(pokemon.name)}
          </a>
        </article>
      `;
    })
    .join("");
}

function evolutionConditionLabel(details) {
  if (!details || !details.length) return "";
  const d = details[0];
  if (d.min_level) return `Lv. ${d.min_level}`;
  if (d.item) return `use ${titleCase(d.item.name)}`;
  if (d.trigger && d.trigger.name === "trade") return "trade";
  if (d.min_happiness) return "high friendship";
  if (d.known_move_type) return `knows a ${titleCase(d.known_move_type.name)}-type move`;
  if (d.min_affection) return "high affection";
  return "special condition";
}

// Walks a PokeAPI evolution-chain tree and returns every root-to-leaf path,
// each path being an array of strings like "Ivysaur (Lv. 16)".
function buildEvolutionPaths(node) {
  const label = titleCase(node.species.name);
  if (!node.evolves_to || !node.evolves_to.length) {
    return [[label]];
  }
  const paths = [];
  node.evolves_to.forEach((child) => {
    const cond = evolutionConditionLabel(child.evolution_details);
    const childPaths = buildEvolutionPaths(child);
    childPaths.forEach((cp) => {
      const annotated = cp.map((seg, i) => (i === 0 && cond ? `${seg} (${cond})` : seg));
      paths.push([label, ...annotated]);
    });
  });
  return paths;
}

async function renderEvolutionLine(pokemon) {
  const container = document.querySelector("#detail-evolution-body");
  container.textContent = "Loading evolution data…";
  try {
    const species = await fetchJson(`${API_BASE}/pokemon-species/${pokemon.id}`);
    if (!species.evolution_chain) {
      container.textContent = "No evolution data available.";
      return;
    }
    const chainData = await fetchJson(species.evolution_chain.url);
    const paths = buildEvolutionPaths(chainData.chain);
    const currentName = titleCase(pokemon.name);

    container.innerHTML = paths
      .map((path) => {
        const segments = path.map((seg) => {
          const isCurrent = seg === currentName || seg.startsWith(`${currentName} (`);
          return isCurrent ? `<span class="evo-current">${seg}</span>` : seg;
        });
        return `<p class="evo-path">${segments.join('<span class="evo-arrow">→</span>')}</p>`;
      })
      .join("");
  } catch (error) {
    console.error(error);
    container.textContent = "Evolution data could not be loaded right now.";
  }
}

// Move types aren't included in a Pokémon's own PokéAPI payload — they live on
// each move's own resource — so we fetch them lazily and cache by move name,
// since common moves (Tackle, Protect, etc.) get reused across many Pokémon.
const moveTypeCache = new Map();
async function getMoveType(moveName) {
  if (moveTypeCache.has(moveName)) return moveTypeCache.get(moveName);
  try {
    const data = await fetchJson(`${API_BASE}/move/${moveName}`);
    const type = data.type?.name || "normal";
    moveTypeCache.set(moveName, type);
    return type;
  } catch {
    moveTypeCache.set(moveName, "normal");
    return "normal";
  }
}

// Splits a Pokémon's raw move-learn data into a level-sorted Level-Up table
// and a de-duplicated TM (machine) table.
function classifyMoves(movesRaw) {
  const levelUp = [];
  const tm = [];
  const seenTm = new Set();

  (movesRaw || []).forEach((entry) => {
    const levelDetail = entry.details.find((d) => d.move_learn_method.name === "level-up");
    if (levelDetail) {
      levelUp.push({ name: entry.name, level: levelDetail.level_learned_at });
    }
    const hasMachine = entry.details.some((d) => d.move_learn_method.name === "machine");
    if (hasMachine && !seenTm.has(entry.name)) {
      seenTm.add(entry.name);
      tm.push({ name: entry.name });
    }
  });

  levelUp.sort((a, b) => a.level - b.level);
  return { levelUp, tm };
}

function moveTypePill(moveName) {
  const type = moveTypeCache.get(moveName) || "normal";
  return `<span class="type-pill" style="--pill:${TYPE_COLORS[type] || "var(--slate)"}">${type}</span>`;
}

async function renderMovePool(pokemon) {
  const levelBody = document.querySelector("#detail-levelup-body");
  const tmBody = document.querySelector("#detail-tm-body");
  levelBody.innerHTML = `<tr><td colspan="3">Loading move data…</td></tr>`;
  tmBody.innerHTML = `<tr><td colspan="2">Loading move data…</td></tr>`;

  const { levelUp, tm } = classifyMoves(pokemon.movesRaw);
  const uniqueNames = [...new Set([...levelUp.map((m) => m.name), ...tm.map((m) => m.name)])];

  try {
    await mapWithConcurrency(uniqueNames, 10, (name) => getMoveType(name));
  } catch (error) {
    console.error("Failed loading move types:", error);
  }

  levelBody.innerHTML = levelUp.length
    ? levelUp
        .map(
          (m) => `
            <tr>
              <td class="move-level">${m.level > 0 ? `Lv. ${m.level}` : "—"}</td>
              <td class="move-name">${titleCase(m.name)}</td>
              <td>${moveTypePill(m.name)}</td>
            </tr>`
        )
        .join("")
    : `<tr><td colspan="3">No level-up moves found.</td></tr>`;

  tmBody.innerHTML = tm.length
    ? tm
        .map(
          (m) => `
            <tr>
              <td class="move-name">${titleCase(m.name)}</td>
              <td>${moveTypePill(m.name)}</td>
            </tr>`
        )
        .join("")
    : `<tr><td colspan="2">No TM moves found.</td></tr>`;
}

async function openDetail(id) {
  const pokemon = pokemonList.find((entry) => entry.id === Number(id));
  if (!pokemon) return;

  const detailSprite = resolveSprite(pokemon);
  const detailArtEl = document.querySelector("#detail-art");
  detailArtEl.src = detailSprite.url;
  detailArtEl.alt = `${titleCase(pokemon.name)} sprite`;
  detailArtEl.classList.toggle("retro-sprite", detailSprite.retro);
  document.querySelector("#detail-id").textContent = padId(pokemon.id);
  document.querySelector("#detail-name").textContent = titleCase(pokemon.name);
  document.querySelector("#detail-types").innerHTML = typePills(pokemon.types);
  document.querySelector("#detail-merch").textContent = merchLabel(pokemon.name);
  document.querySelector("#detail-merch").href = storeUrl(pokemon.name);
  document.querySelector(".detail-sheet").style.setProperty(
    "--accent-type",
    TYPE_COLORS[pokemon.types[0]]
  );

  const abilityChips = pokemon.abilities
    .map(
      (a) =>
        `<span class="meta-chip${a.hidden ? " hidden-ability" : ""}">${titleCase(a.name)}${a.hidden ? " (hidden)" : ""}</span>`
    )
    .join("");
  document.querySelector("#detail-meta").innerHTML = `
    <span class="meta-chip">Height: ${(pokemon.height / 10).toFixed(1)} m</span>
    <span class="meta-chip">Weight: ${(pokemon.weight / 10).toFixed(1)} kg</span>
    ${abilityChips}
  `;

  document.querySelector("#detail-stats").innerHTML = pokemon.stats
    .map((stat) => {
      const width = Math.min(100, Math.round((stat.value / 180) * 100));
      return `
        <div class="stat-row">
          <dt>${stat.name.replace("-", " ")}</dt>
          <dd class="stat-bar"><span style="width:${width}%"></span></dd>
          <dd>${stat.value}</dd>
        </div>
      `;
    })
    .join("");

  document.querySelector("#detail-flavor").textContent = "Loading Pokédex entry…";
  dialog.showModal();

  try {
    const species = await fetchJson(`${API_BASE}/pokemon-species/${pokemon.id}`);
    const flavor =
      species.flavor_text_entries.find(
        (entry) => entry.language.name === "en"
      )?.flavor_text || "No Pokédex entry found.";
    document.querySelector("#detail-flavor").textContent = flavor.replace(/\f|\n/g, " ");
  } catch {
    document.querySelector("#detail-flavor").textContent =
      "Pokédex entry could not be loaded right now.";
  }

  renderEvolutionLine(pokemon);
  renderMovePool(pokemon);
}

grid.addEventListener("click", (event) => {
  const merch = event.target.closest(".merch-btn");
  if (merch) {
    event.stopPropagation();
    return;
  }
  const card = event.target.closest(".card");
  if (card) openDetail(card.dataset.id);
});

grid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".card");
  if (!card) return;
  event.preventDefault();
  openDetail(card.dataset.id);
});

searchInput.addEventListener("input", () => renderGrid(pokemonList));
closeDetail.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

function setupSpriteToggle() {
  const buttons = document.querySelectorAll(".sprite-toggle-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      if (mode === spriteMode) return;
      spriteMode = mode;
      buttons.forEach((b) => b.classList.toggle("active", b.dataset.mode === spriteMode));
      // No refetch needed — every cached Pokémon already carries both the
      // showdown sprite and its artwork id, so we just re-render.
      renderGrid(pokemonList);
    });
  });
}

function setupMapDialog() {
  const openMapBtn = document.querySelector("#open-map");
  const mapDialogEl = document.querySelector("#map-dialog");
  const closeMapBtn = document.querySelector("#close-map");
  const allRegionsBtn = document.querySelector("#map-all-btn");

  openMapBtn.addEventListener("click", () => {
    updateMapActiveIsland();
    mapDialogEl.showModal();
  });
  closeMapBtn.addEventListener("click", () => mapDialogEl.close());
  mapDialogEl.addEventListener("click", (event) => {
    if (event.target === mapDialogEl) mapDialogEl.close();
  });
  allRegionsBtn.addEventListener("click", () => {
    loadGeneration("all");
    mapDialogEl.close();
  });
}

/* Initial page setup happens at the very bottom of this file, after every
   feature section (sprite toggle, generation tabs, Oak chat, quiz) has been
   defined — see the bottom of the file. */

/* =========================================================
   Feature: Professor Oak AI Coach (text chat, no voice)
   ========================================================= */

const oakToggle = document.querySelector("#oak-toggle");
const oakPanel = document.querySelector("#oak-panel");
const oakMinimize = document.querySelector("#oak-minimize");
const oakMessagesEl = document.querySelector("#oak-messages");
const oakInput = document.querySelector("#oak-input");
const oakSend = document.querySelector("#oak-send");
const oakAvatarEl = document.querySelector(".oak-avatar");
const oakNameEl = document.querySelector(".oak-head-text h3");
const oakSubtitleEl = document.querySelector(".oak-head-text p");

// One professor per region, each with their own avatar, tone, and catchphrases.
const PROFESSORS = {
  1: {
    name: "Professor Oak", region: "Kanto", avatar: "🔬",
    badgeName: "Boulder Badge", badgeEmoji: "🪨",
    tone: "warm and grandfatherly, a veteran researcher who's seen countless trainers pass through his lab",
    greeting: "Hello there, trainer! Professor Oak here. Ask me about type matchups, training tips, or anything about the Pokémon in your Pokédex!",
    catchphrases: [
      "There is a time and place for everything, but let's stay on topic!",
      "Hoo hoo hoo, good question, trainer!",
      "The world of Pokémon is vast and wondrous!",
      "Take care of your Pokémon, alright?",
    ],
  },
  2: {
    name: "Professor Elm", region: "Johto", avatar: "🥼",
    badgeName: "Zephyr Badge", badgeEmoji: "🌪️",
    tone: "excitable, a little scatterbrained, endlessly fascinated by Pokémon breeding and behavior",
    greeting: "Oh! Hello there — Professor Elm, Johto's Pokémon researcher. I'm in the middle of an experiment, but I always have time for a good question!",
    catchphrases: [
      "Incredible! Pokémon really do continue to amaze me every day.",
      "I really need to get back to my research after this, but ask away!",
      "There's still so much we don't know about Pokémon breeding.",
      "Fascinating, simply fascinating!",
    ],
  },
  3: {
    name: "Professor Birch", region: "Hoenn", avatar: "🌿",
    badgeName: "Stone Badge", badgeEmoji: "⛰️",
    tone: "energetic and outdoorsy, always out in the field studying Pokémon habitats",
    greeting: "Hey there! Professor Birch here — Hoenn's field researcher. Sorry if I sound a bit out of breath, I was just out chasing down some field data!",
    catchphrases: [
      "The great outdoors is the best laboratory there is!",
      "I really should be more careful running through tall grass, ha!",
      "Every habitat tells a story about the Pokémon that live there.",
      "Let's dig into it, trainer!",
    ],
  },
  4: {
    name: "Professor Rowan", region: "Sinnoh", avatar: "📘",
    badgeName: "Coal Badge", badgeEmoji: "⛏️",
    tone: "stern, no-nonsense, and gruff, but deeply caring about the bond between trainers and Pokémon underneath it",
    greeting: "Hmph. Professor Rowan. I study the bond between Pokémon and people — so don't waste my time. What do you need to know?",
    catchphrases: [
      "The bond between trainer and Pokémon is not to be taken lightly.",
      "Hmph. A reasonable question, I suppose.",
      "Pay attention — I won't repeat myself.",
      "Good. Curiosity is the mark of a real researcher.",
    ],
  },
  5: {
    name: "Professor Juniper", region: "Unova", avatar: "🧪",
    badgeName: "Trio Badge", badgeEmoji: "🍃",
    tone: "friendly, approachable, and encouraging toward new trainers",
    greeting: "Hi there! Professor Juniper, Unova's Pokémon researcher. It's great to meet a new trainer — what would you like to know?",
    catchphrases: [
      "Every trainer's journey starts with a single question!",
      "I love seeing new trainers get curious about Pokémon.",
      "That's a great question to explore!",
      "Keep that curiosity going, trainer.",
    ],
  },
  6: {
    name: "Professor Sycamore", region: "Kalos", avatar: "🎩",
    badgeName: "Bug Badge", badgeEmoji: "🐛",
    tone: "charming, refined, and passionate about the bonds between trainers and Pokémon and about Mega Evolution",
    greeting: "Bonjour! Professor Sycamore here, studying the bonds that let trainers and Pokémon achieve incredible things — like Mega Evolution. How can I help?",
    catchphrases: [
      "The bond between a trainer and their Pokémon can unlock incredible power.",
      "Magnifique question!",
      "Every Pokémon has untapped potential — much like every trainer.",
      "Let's explore this together, shall we?",
    ],
  },
  7: {
    name: "Professor Kukui", region: "Alola", avatar: "🏝️",
    badgeName: "Fightinium Z", badgeEmoji: "🌺",
    tone: "laid-back, enthusiastic, and obsessed with Pokémon moves and battling",
    greeting: "Yo, alola! Professor Kukui here, Alola's Pokémon researcher. I study Pokémon moves — let's get fired up and talk Pokémon!",
    catchphrases: [
      "Alola! That's a great question to dig into.",
      "Nothing gets me more fired up than talking Pokémon moves!",
      "Battling and research go hand in hand out here in Alola.",
      "Yeah, that's the spirit, trainer!",
    ],
  },
  8: {
    name: "Professor Magnolia", region: "Galar", avatar: "🧣",
    badgeName: "Grass Badge", badgeEmoji: "🌾",
    tone: "elderly, wise, and quietly authoritative — the leading expert on the Dynamax phenomenon",
    greeting: "Good day, trainer. Professor Magnolia here — I've spent my life researching the Dynamax phenomenon in Galar. What can I help you understand?",
    catchphrases: [
      "The Dynamax phenomenon still holds many mysteries, even for me.",
      "A thoughtful question. I appreciate that.",
      "Galar's Pokémon have taught me more than any textbook could.",
      "Take your studies seriously, and you'll go far.",
    ],
  },
  9: {
    name: "Professor Sada", region: "Paldea", avatar: "⏳",
    badgeName: "Bug Badge", badgeEmoji: "🪲",
    tone: "quietly intense and single-minded, deeply absorbed in research into Pokémon and the nature of time",
    greeting: "Hello. Professor Sada — I research Paldea's Pokémon, and the mysteries of time itself. What would you like to know?",
    catchphrases: [
      "Every Pokémon is a piece of a much larger puzzle.",
      "Time is short, so let's make this question count.",
      "Paldea still holds secrets even I haven't uncovered.",
      "An interesting line of inquiry.",
    ],
  },
  all: {
    name: "Professor Oak", region: "Kanto", avatar: "🔬",
    badgeName: "Boulder Badge", badgeEmoji: "🪨",
    tone: "warm and grandfatherly, speaking with the authority of someone who's studied every region's Pokémon",
    greeting: "Hello there, trainer! Professor Oak here. With the National Pokédex open, we can talk about Pokémon from any region — what's on your mind?",
    catchphrases: [
      "There is a time and place for everything, but let's stay on topic!",
      "Every region has its own wonders — I've made it my life's work to study them all.",
      "The world of Pokémon is vast and wondrous!",
      "Take care of your Pokémon, alright?",
    ],
  },
};

function getCurrentProfessor() {
  return PROFESSORS[currentGenId] || PROFESSORS[1];
}

function buildSystemPrompt(professor) {
  return `You are ${professor.name} from the Pokémon world, running a friendly Q&A booth inside a Pokédex web app themed around the ${professor.region} region.

Stay strictly in character as ${professor.name} at all times, no matter what the user asks:
- Personality: ${professor.tone}.
- Open or punctuate replies naturally with your own catchphrases where it fits, without overusing them in every single message. Some examples of your style: ${professor.catchphrases.join(" / ")}
- Give real, accurate Pokémon knowledge: type advantages and weaknesses, breeding and training tips, evolution info, and general Pokédex trivia across all generations — not just your own region.
- Keep answers concise and conversational — a few sentences, not an essay — since this is a small chat widget.
- If asked something with no connection to Pokémon at all, gently redirect back to Pokémon topics in character, the way a Pokémon professor would steer an over-eager trainer back to their studies.
- Never break character or mention that you are an AI language model.`;
}

let lastProfessorName = null;

// Refreshes the chat header (avatar/name/subtitle) for whichever region is
// currently active, and resets the conversation if the professor has changed
// so trainers don't get Professor Oak suddenly answering as Professor Elm.
function updateOakProfessor() {
  const professor = getCurrentProfessor();
  oakAvatarEl.innerHTML = `${professor.avatar}<span class="badge-chip" title="${professor.badgeName}" aria-label="${professor.badgeName}">${professor.badgeEmoji}</span>`;
  oakNameEl.textContent = professor.name;
  oakSubtitleEl.textContent = `${professor.region} Pokémon Lab`;
  oakToggle.setAttribute("aria-label", `Open ${professor.name} chat`);

  if (professor.name !== lastProfessorName) {
    lastProfessorName = professor.name;
    oakHistory = [];
    oakMessagesEl.innerHTML = "";
    oakOpened = false;
    // If the panel is already open, greet immediately with the new professor.
    if (!oakPanel.hidden) {
      openOakPanel();
    }
  }
}

// ---- Local Professor Oak knowledge engine (no network required) ----
const TYPE_CHART = {
  normal:   { superEffectiveAgainst: [], notVeryEffectiveAgainst: ["rock","steel"], noEffectAgainst: ["ghost"] },
  fire:     { superEffectiveAgainst: ["grass","ice","bug","steel"], notVeryEffectiveAgainst: ["fire","water","rock","dragon"], noEffectAgainst: [] },
  water:    { superEffectiveAgainst: ["fire","ground","rock"], notVeryEffectiveAgainst: ["water","grass","dragon"], noEffectAgainst: [] },
  electric: { superEffectiveAgainst: ["water","flying"], notVeryEffectiveAgainst: ["electric","grass","dragon"], noEffectAgainst: ["ground"] },
  grass:    { superEffectiveAgainst: ["water","ground","rock"], notVeryEffectiveAgainst: ["fire","grass","poison","flying","bug","dragon","steel"], noEffectAgainst: [] },
  ice:      { superEffectiveAgainst: ["grass","ground","flying","dragon"], notVeryEffectiveAgainst: ["fire","water","ice","steel"], noEffectAgainst: [] },
  fighting: { superEffectiveAgainst: ["normal","ice","rock","dark","steel"], notVeryEffectiveAgainst: ["poison","flying","psychic","bug","fairy"], noEffectAgainst: ["ghost"] },
  poison:   { superEffectiveAgainst: ["grass","fairy"], notVeryEffectiveAgainst: ["poison","ground","rock","ghost"], noEffectAgainst: ["steel"] },
  ground:   { superEffectiveAgainst: ["fire","electric","poison","rock","steel"], notVeryEffectiveAgainst: ["grass","bug"], noEffectAgainst: ["flying"] },
  flying:   { superEffectiveAgainst: ["grass","fighting","bug"], notVeryEffectiveAgainst: ["electric","rock","steel"], noEffectAgainst: [] },
  psychic:  { superEffectiveAgainst: ["fighting","poison"], notVeryEffectiveAgainst: ["psychic","steel"], noEffectAgainst: ["dark"] },
  bug:      { superEffectiveAgainst: ["grass","psychic","dark"], notVeryEffectiveAgainst: ["fire","fighting","poison","flying","ghost","steel","fairy"], noEffectAgainst: [] },
  rock:     { superEffectiveAgainst: ["fire","ice","flying","bug"], notVeryEffectiveAgainst: ["fighting","ground","steel"], noEffectAgainst: [] },
  ghost:    { superEffectiveAgainst: ["psychic","ghost"], notVeryEffectiveAgainst: ["dark"], noEffectAgainst: ["normal"] },
  dragon:   { superEffectiveAgainst: ["dragon"], notVeryEffectiveAgainst: ["steel"], noEffectAgainst: ["fairy"] },
  dark:     { superEffectiveAgainst: ["psychic","ghost"], notVeryEffectiveAgainst: ["fighting","dark","fairy"], noEffectAgainst: [] },
  steel:    { superEffectiveAgainst: ["ice","rock","fairy"], notVeryEffectiveAgainst: ["fire","water","electric","steel"], noEffectAgainst: [] },
  fairy:    { superEffectiveAgainst: ["fighting","dragon","dark"], notVeryEffectiveAgainst: ["fire","poison","steel"], noEffectAgainst: [] },
};

function offensiveStrengths(types) {
  const set = new Set();
  types.forEach((t) => TYPE_CHART[t]?.superEffectiveAgainst.forEach((x) => set.add(x)));
  return [...set];
}

function defensiveProfile(types) {
  const weak = [], resisted = [], immune = [];
  Object.keys(TYPE_CHART).forEach((atk) => {
    let mult = 1;
    types.forEach((def) => {
      const chart = TYPE_CHART[atk];
      if (chart.superEffectiveAgainst.includes(def)) mult *= 2;
      else if (chart.notVeryEffectiveAgainst.includes(def)) mult *= 0.5;
      else if (chart.noEffectAgainst.includes(def)) mult *= 0;
    });
    if (mult === 0) immune.push(atk);
    else if (mult > 1) weak.push(atk);
    else if (mult < 1) resisted.push(atk);
  });
  return { weak, resisted, immune };
}

function listOrNone(arr) {
  if (!arr.length) return "nothing in particular";
  return arr.map(titleCase).join(", ");
}

function randomCatchphrase() {
  const professor = getCurrentProfessor();
  return professor.catchphrases[Math.floor(Math.random() * professor.catchphrases.length)];
}

const OAK_TRAINING_TIPS = [
  "A well-rounded team beats a team of favorites every time — cover your weaknesses with variety!",
  "Battling is the best classroom there is. Every fight teaches your Pokémon, and you, something new.",
  "Don't underestimate the bond between trainer and Pokémon — it matters just as much as raw stats!",
  "Patience, trainer! A Pokémon trained slowly and steadily often grows stronger than one rushed to the top.",
  "Study your opponent's types before you battle. Knowledge is the sharpest tool in your kit!",
];

function findMentionedPokemon(lowerText) {
  return pokemonList.find((p) => {
    const spaced = p.name.replace(/-/g, " ");
    return lowerText.includes(p.name) || lowerText.includes(spaced);
  });
}

function findMentionedTypes(lowerText) {
  return Object.keys(TYPE_CHART).filter((t) => new RegExp(`\\b${t}\\b`).test(lowerText));
}

function generateOakReply(userText) {
  const lower = userText.toLowerCase();
  const professor = getCurrentProfessor();

  if (/\b(hi|hello|hey|yo)\b/.test(lower)) {
    return `Hello there, trainer! Good to see you back in the lab. What's on your mind today? ${randomCatchphrase()}`;
  }

  const mentionedMon = findMentionedPokemon(lower);
  if (mentionedMon) {
    const profile = defensiveProfile(mentionedMon.types);
    const strengths = offensiveStrengths(mentionedMon.types);
    const topStat = mentionedMon.stats.reduce((a, b) => (b.value > a.value ? b : a));
    const typeLabel = mentionedMon.types.map(titleCase).join("/");
    return `Ah, ${titleCase(mentionedMon.name)}! A fine specimen — it's a ${typeLabel}-type. `
      + `Its moves hit ${listOrNone(strengths)} especially hard. `
      + `As for defense, watch out for ${listOrNone(profile.weak)} attacks`
      + (profile.immune.length ? `, though it's completely immune to ${listOrNone(profile.immune)}. ` : ". ")
      + `Its standout stat is ${topStat.name.replace("-", " ")} at ${topStat.value}. ${randomCatchphrase()}`;
  }

  const mentionedTypes = findMentionedTypes(lower);
  if (mentionedTypes.length >= 2) {
    const [atk, def] = mentionedTypes;
    const chart = TYPE_CHART[atk];
    let verdict = "a normal hit — neither side has the advantage";
    if (chart.superEffectiveAgainst.includes(def)) verdict = "super effective — a big advantage";
    else if (chart.notVeryEffectiveAgainst.includes(def)) verdict = "not very effective — a weak hit";
    else if (chart.noEffectAgainst.includes(def)) verdict = "completely useless — no effect at all";
    return `Let's see... ${titleCase(atk)} against ${titleCase(def)}? That would be ${verdict}. Type knowledge like this can turn the tide of any battle, trainer!`;
  }
  if (mentionedTypes.length === 1) {
    const t = mentionedTypes[0];
    const chart = TYPE_CHART[t];
    const profile = defensiveProfile([t]);
    return `${titleCase(t)}-type moves are super effective against ${listOrNone(chart.superEffectiveAgainst)}. `
      + `But ${titleCase(t)}-type Pokémon themselves need to watch out for ${listOrNone(profile.weak)} attacks. ${randomCatchphrase()}`;
  }

  if (/train|level|ev\b|grow|team|breed|catch|strong/.test(lower)) {
    const tip = OAK_TRAINING_TIPS[Math.floor(Math.random() * OAK_TRAINING_TIPS.length)];
    return `${tip} ${randomCatchphrase()}`;
  }

  return `Hmm, tell me more, trainer! Ask me about a specific Pokémon's type matchups, how one type fares against another, or how to train your team. ${randomCatchphrase()}`;
}

let oakHistory = []; // {role: 'user'|'assistant', content: string}
let oakOpened = false;

function addOakMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `oak-msg ${role}`;
  bubble.textContent = text;
  oakMessagesEl.appendChild(bubble);
  oakMessagesEl.scrollTop = oakMessagesEl.scrollHeight;
  return bubble;
}

function addOakTyping() {
  const bubble = document.createElement("div");
  bubble.className = "oak-msg assistant typing";
  bubble.textContent = `${getCurrentProfessor().name} is thinking…`;
  oakMessagesEl.appendChild(bubble);
  oakMessagesEl.scrollTop = oakMessagesEl.scrollHeight;
  return bubble;
}

function openOakPanel() {
  oakPanel.hidden = false;
  oakPanel.classList.remove("closing");
  if (!oakOpened) {
    oakOpened = true;
    addOakMessage("assistant", getCurrentProfessor().greeting);
  }
  oakInput.focus();
}

function closeOakPanel() {
  oakPanel.classList.add("closing");
  setTimeout(() => {
    oakPanel.hidden = true;
  }, 160);
}

oakToggle.addEventListener("click", () => {
  if (oakPanel.hidden) openOakPanel();
  else closeOakPanel();
});
oakMinimize.addEventListener("click", closeOakPanel);

async function sendOakMessage() {
  const userText = oakInput.value.trim();
  if (!userText) return;

  oakInput.value = "";
  oakSend.disabled = true;
  addOakMessage("user", userText);
  oakHistory.push({ role: "user", content: userText });

  const typingBubble = addOakTyping();
  let reply = null;

  // Try the live model first, but don't let it hang the chat — fall back fast.
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: buildSystemPrompt(getCurrentProfessor()),
        messages: oakHistory,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json().catch(() => null);
    if (!response.ok || data?.error) {
      throw new Error(data?.error?.message || `HTTP ${response.status}`);
    }
    const apiText = (data?.content || [])
      .map((block) => (block.type === "text" ? block.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();
    if (apiText) reply = apiText;
  } catch (error) {
    console.warn("Oak live API unavailable, using local knowledge engine:", error.message);
  }

  if (!reply) {
    reply = generateOakReply(userText);
  }

  typingBubble.remove();
  addOakMessage("assistant", reply);
  oakHistory.push({ role: "assistant", content: reply });

  oakSend.disabled = false;
  oakInput.focus();
}

oakSend.addEventListener("click", sendOakMessage);
oakInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendOakMessage();
  }
});

/* =========================================================
   Feature: Pokémon Knowledge Quiz
   ========================================================= */

const openQuizBtn = document.querySelector("#open-quiz");
const quizDialog = document.querySelector("#quiz-dialog");
const closeQuizBtn = document.querySelector("#close-quiz");
const quizBody = document.querySelector("#quiz-body");
const quizScoreBadge = document.querySelector("#quiz-score-badge");

const QUIZ_LENGTH = 5;
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomFrom(array, count, exclude = []) {
  const pool = array.filter((item) => !exclude.includes(item));
  return shuffle(pool).slice(0, count);
}

function getStat(pokemon, statName) {
  return pokemon.stats.find((s) => s.name === statName)?.value ?? 0;
}

const ALL_TYPES = Object.keys(TYPE_COLORS);

const questionBuilders = [
  function typeQuestion(pool) {
    const mon = pool[Math.floor(Math.random() * pool.length)];
    const correct = mon.types[0];
    const distractors = randomFrom(ALL_TYPES, 3, mon.types);
    return {
      prompt: `What is ${titleCase(mon.name)}'s primary type?`,
      choices: shuffle([correct, ...distractors]),
      correct,
    };
  },
  function pokedexNumberQuestion(pool) {
    const mon = pool[Math.floor(Math.random() * pool.length)];
    const correct = padId(mon.id);
    const others = shuffle(pool.filter((p) => p.id !== mon.id)).slice(0, 3);
    const choices = shuffle([correct, ...others.map((p) => padId(p.id))]);
    return {
      prompt: `What is ${titleCase(mon.name)}'s Pokédex number?`,
      choices,
      correct,
    };
  },
  function higherStatQuestion(pool) {
    const statOptions = ["hp", "attack", "defense", "speed"];
    const stat = statOptions[Math.floor(Math.random() * statOptions.length)];
    const shuffled = shuffle(pool);
    const [a, b] = shuffled;
    if (!a || !b) return null;
    const aVal = getStat(a, stat);
    const bVal = getStat(b, stat);
    if (aVal === bVal) return null;
    const correct = titleCase(aVal > bVal ? a.name : b.name);
    return {
      prompt: `Which Pokémon has the higher base ${stat.replace("-", " ")}: ${titleCase(a.name)} or ${titleCase(b.name)}?`,
      choices: shuffle([titleCase(a.name), titleCase(b.name)]),
      correct,
    };
  },
  function heavierQuestion(pool) {
    const shuffled = shuffle(pool);
    const [a, b] = shuffled;
    if (!a || !b || a.weight === b.weight) return null;
    const correct = titleCase(a.weight > b.weight ? a.name : b.name);
    return {
      prompt: `Which Pokémon weighs more: ${titleCase(a.name)} or ${titleCase(b.name)}?`,
      choices: shuffle([titleCase(a.name), titleCase(b.name)]),
      correct,
    };
  },
  function whichIsTypeQuestion(pool) {
    const type = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
    const matches = pool.filter((p) => p.types.includes(type));
    const nonMatches = pool.filter((p) => !p.types.includes(type));
    if (matches.length < 1 || nonMatches.length < 3) return null;
    const correctMon = matches[Math.floor(Math.random() * matches.length)];
    const distractors = randomFrom(nonMatches, 3);
    return {
      prompt: `Which of these Pokémon is ${type} type?`,
      choices: shuffle([correctMon, ...distractors].map((p) => titleCase(p.name))),
      correct: titleCase(correctMon.name),
    };
  },
];

function buildQuizQuestions() {
  const questions = [];
  let attempts = 0;
  const usedPrompts = new Set();

  while (questions.length < QUIZ_LENGTH && attempts < 200) {
    attempts += 1;
    const builder = questionBuilders[Math.floor(Math.random() * questionBuilders.length)];
    const q = builder(pokemonList);
    if (!q || usedPrompts.has(q.prompt)) continue;
    usedPrompts.add(q.prompt);
    questions.push(q);
  }
  return questions;
}

function renderQuizProgress() {
  const dots = Array.from({ length: QUIZ_LENGTH }, (_, i) => {
    let cls = "";
    if (i < quizIndex) cls = "done";
    else if (i === quizIndex) cls = "current";
    return `<span class="${cls}"></span>`;
  }).join("");
  return `<div id="quiz-progress">${dots}</div>`;
}

function renderQuizQuestion() {
  quizAnswered = false;
  quizScoreBadge.textContent = `Q${quizIndex + 1} / ${QUIZ_LENGTH}`;
  const q = quizQuestions[quizIndex];

  quizBody.innerHTML = `
    ${renderQuizProgress()}
    <p id="quiz-question">${q.prompt}</p>
    <div id="quiz-options">
      ${q.choices
        .map((choice) => `<button class="quiz-option" data-choice="${encodeURIComponent(choice)}">${choice}</button>`)
        .join("")}
    </div>
    <p id="quiz-feedback"></p>
    <button id="quiz-next">${quizIndex === QUIZ_LENGTH - 1 ? "See results" : "Next question"}</button>
  `;

  const optionButtons = quizBody.querySelectorAll(".quiz-option");
  const feedback = quizBody.querySelector("#quiz-feedback");
  const nextBtn = quizBody.querySelector("#quiz-next");

  optionButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (quizAnswered) return;
      quizAnswered = true;
      const chosen = decodeURIComponent(btn.dataset.choice);
      const isCorrect = chosen === q.correct;

      optionButtons.forEach((b) => {
        const val = decodeURIComponent(b.dataset.choice);
        b.disabled = true;
        if (val === q.correct) b.classList.add("correct");
        else if (b === btn) b.classList.add("incorrect");
      });

      if (isCorrect) {
        quizScore += 1;
        feedback.textContent = "Correct! Nicely spotted, trainer.";
      } else {
        feedback.textContent = `Not quite — the answer was ${q.correct}.`;
      }
      nextBtn.style.display = "inline-block";
    });
  });

  nextBtn.addEventListener("click", () => {
    quizIndex += 1;
    if (quizIndex >= QUIZ_LENGTH) {
      renderQuizResults();
    } else {
      renderQuizQuestion();
    }
  });
}

function renderQuizResults() {
  quizScoreBadge.textContent = "Results";
  let verdict = "Keep studying the Pokédex, trainer!";
  if (quizScore === QUIZ_LENGTH) verdict = "Perfect score! Professor Oak is impressed.";
  else if (quizScore >= QUIZ_LENGTH - 1) verdict = "Excellent work — you really know your Pokémon!";
  else if (quizScore >= Math.ceil(QUIZ_LENGTH / 2)) verdict = "Solid effort! A bit more field research will help.";

  quizBody.innerHTML = `
    <div class="quiz-result">
      <p style="margin:0;color:var(--slate);font-size:13px;">Your score</p>
      <p class="score">${quizScore}/${QUIZ_LENGTH}</p>
      <p class="verdict">${verdict}</p>
      <button id="quiz-restart">Take quiz again</button>
    </div>
  `;

  quizBody.querySelector("#quiz-restart").addEventListener("click", startQuiz);
}

function startQuiz() {
  if (!pokemonList.length) return;
  quizIndex = 0;
  quizScore = 0;
  quizQuestions = buildQuizQuestions();
  renderQuizQuestion();
}

openQuizBtn.addEventListener("click", () => {
  if (!pokemonList.length) {
    showStatus("Hang tight — Pokémon data is still loading.");
    return;
  }
  startQuiz();
  quizDialog.showModal();
});

closeQuizBtn.addEventListener("click", () => quizDialog.close());
quizDialog.addEventListener("click", (event) => {
  if (event.target === quizDialog) quizDialog.close();
});

/* =========================================================
   Initial page setup (runs last, once every feature above is defined)
   ========================================================= */
setupSpriteToggle();
renderGenTabs();
loadGeneration(1);
