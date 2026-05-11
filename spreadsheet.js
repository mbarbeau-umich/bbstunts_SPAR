


/* 
Load dropdown option sets ---
*/
let footworkOptions = [];
let handOptions = [];
let eOptions = [];
const weaponTypes = ["sword", "unarmed", "staff", "shield"];
const weaponOptions = {};

// ------------------- Load option files (unchanged logic) -------------------
async function loadOptions() {
  try {
    const baseFiles = [
      fetch("options/o_footwork.txt").then(r => r.ok ? r.text() : ""),
      fetch("options/o_e.txt").then(r => r.ok ? r.text() : "")
    ];
    const weaponFetches = weaponTypes.map(w =>
      fetch(`options/o_${w}.txt`).then(res => res.ok ? res.text() : "")
    );
    const handFetch = fetch("options/o_hand.txt").then(r => r.ok ? r.text() : "");

    const allResults = await Promise.all([...baseFiles, handFetch, ...weaponFetches]);
    const footworkText = allResults[0] || "";
    const eText = allResults[1] || "";
    const handText = allResults[2] || "";
    const weaponTexts = allResults.slice(3);

    footworkOptions = [""].concat(
      footworkText.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    );
    handOptions = [""].concat(
      (handText || "Punch\nBlock\nParry\nSlash\nThrust").split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    );
    eOptions = [""].concat(
      eText.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    );

    weaponTypes.forEach((w, i) => {
      const txt = weaponTexts[i] || "";
      weaponOptions[w] = [""].concat((txt || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean));
      if (weaponOptions[w].length === 1) weaponOptions[w] = [...handOptions];
    });

    console.log("Options loaded:", { footworkOptions, handOptions, eOptions, weaponOptions });
  } catch (err) {
    console.error("Error loading option files:", err);
    footworkOptions = ["", "Advance", "Retreat", "Cross Over Advance", "Cross Over Retreat", "Pass Forward", "Pass Back"];
    handOptions = ["", "Punch", "Block", "Parry", "Slash", "Thrust"];
    eOptions = ["", "←", "→", "←→", "→←"];
    weaponTypes.forEach(w => weaponOptions[w] = [...handOptions]);
  }
}

// ------------------- small helpers -------------------
function createDropdown(options = []) {
  const wrapper = document.createElement("div");
  wrapper.className = "dropdown-wrapper";
  const id = "dl_" + Math.random().toString(36).slice(2,9);
  const input = document.createElement("input");
  input.setAttribute("list", id);
  input.className = "cell-dropdown";
  input.autocomplete = "off";

  const datalist = document.createElement("datalist");
  datalist.id = id;
  options.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o;
    datalist.appendChild(opt);
  });

  wrapper.appendChild(input);
  wrapper.appendChild(datalist);
  return wrapper;
}

function prettify(s) {
  if (!s) return "";
  return s.toString().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ------------------- Column-type builder (single source of truth) -------------------
/*
fightersState: [{hands:1, weapons:["sword"]}, ...]
returns array like:
["rowNum","footwork","hand:sword","e","footwork","hand:unarmed",...,"notes"]
*/
function buildColumnTypeList(fightersState) {
  const fstate = Array.isArray(fightersState) ? fightersState : [];
  const numFighters = fstate.length || 0;
  const types = [];
  types.push("rowNum");

  if (numFighters === 2) {
    // Fighter 1
    types.push("footwork");
    (fstate[0]?.weapons || ["unarmed"]).forEach(w => types.push(`hand:${w}`));

    // Shared energy
    types.push("e");

    // Fighter 2
    types.push("footwork");
    (fstate[1]?.weapons || ["unarmed"]).forEach(w => types.push(`hand:${w}`));
  } else {
    // 3+ (or 0/1) fighters: for each fighter: footwork, e, hands...
    if (numFighters === 0) {
      // fallback to one fighter with one hand so UI is usable
      types.push("footwork");
      types.push("e");
      types.push("hand:unarmed");
    } else {
      fstate.forEach(f => {
        types.push("footwork");
        types.push("e");
        (f.weapons || ["unarmed"]).forEach(w => types.push(`hand:${w}`));
      });
    }
  }

  types.push("notes");
  // alert(types);
  return types;
}

// ------------------- Column-width setter -------------------
function setDynamicColumnWidths(table, colTypes) {
  if (!table || !Array.isArray(colTypes) || colTypes.length === 0) return;

  const widthMap = {
    rowNum: 15,     // px
    footwork: 130,
    hand: 140,
    e: 10,
    notes: 240
  };
  // alert(colTypes);

  // remove old colgroup
  const old = table.querySelector("colgroup");
  if (old) old.remove();

  const cg = document.createElement("colgroup");

  colTypes.forEach(type => {
    const col = document.createElement("col");
    const base = type.split(":")[0];

    const width = widthMap[base] || 100;
    if (width <= 20 || type === "rowNum" || type === "e") {
      col.classList.add("thin");
    }

    // strong browser-safe way
    col.width = width;
    col.style.width = width + "px";

    cg.appendChild(col);
  });
  
  table.insertBefore(cg, table.firstChild);
}

// ------------------- Build the full spreadsheet -------------------
function buildSpreadsheet() {
  const table = document.getElementById("spreadsheetTable");
  if (!table) return;

  table.removeAttribute("contenteditable");
  table.contentEditable = "false";

  // Get config
  const cfg = window.SPARconfig || {};
  const title = cfg.fight_title || "Untitled Fight";
  const author = cfg.fight_author || "Unknown";

  // Normalise fightersState: build from cfg.combatants or cfg.fightersState
  let fightersState = [];
  if (Array.isArray(cfg.combatants)) {
    fightersState = cfg.combatants.map(c => ({
      hands: c.hands || 1,
      weapons: Array.isArray(c.weapon) ? c.weapon : (Array.isArray(c.weapons) ? c.weapons : [c.weapon || "unarmed"])
    }));
  } else if (Array.isArray(cfg.fightersState)) {
    fightersState = cfg.fightersState.map(f => ({
      hands: f.hands || (Array.isArray(f.weapons) ? f.weapons.length : 1),
      weapons: Array.isArray(f.weapons) ? f.weapons : (Array.isArray(f.weapon) ? f.weapon : [f.weapon || "unarmed"])
    }));
  } else {
    // fallback to localStorage or default 2 fighters 1 hand each
    const stored = JSON.parse(localStorage.getItem("fightersState") || "null");
    if (Array.isArray(stored) && stored.length) fightersState = stored;
    else fightersState = [{hands:1, weapons:["unarmed"]}, {hands:1, weapons:["unarmed"]}];
  }
  const numFighters = fightersState.length || 0;

  // Build authoritative colTypes vector
  const colTypes = buildColumnTypeList(fightersState);
  // persist to table for addRow/addBreak etc
  table.dataset.colTypes = JSON.stringify(colTypes);

  // clear existing table
  table.innerHTML = "";

  // Header row: author | title (colspan) | date
  const headerRow = table.insertRow();
  const authorCell = headerRow.insertCell();
  authorCell.innerText = `Author(s): ${author}`;
  authorCell.style.textAlign = "left";
  authorCell.style.borderBottom = "2px solid black";
  authorCell.style.padding = "8px";
  authorCell.contentEditable = "true";
  authorCell.colSpan = 2; // add


  const totalCols = colTypes.length;
  const titleCell = headerRow.insertCell();
  // give title cell span so header fits into the table columns visually
  const titleColSpan = Math.max(1, totalCols - 3);
  titleCell.colSpan = titleColSpan;
  titleCell.innerHTML = `<strong>${title}</strong>`;
  titleCell.style.textAlign = "center";
  titleCell.style.borderBottom = "2px solid black";
  titleCell.style.padding = "8px";
  titleCell.contentEditable = "true";

  const dateCell = headerRow.insertCell();
  dateCell.innerText = new Date().toLocaleDateString();
  dateCell.style.textAlign = "right";
  dateCell.style.borderBottom = "2px solid black";
  dateCell.style.padding = "8px";

  // Spacer row
  const spacer = table.insertRow();
  const spacerCell = spacer.insertCell();
  spacerCell.colSpan = totalCols;
  spacerCell.style.height = "6px";
  spacerCell.style.backgroundColor = "#eee";

  // Fighter header (first of two sticky header rows)
  const fighterRow = table.insertRow();
  fighterRow.classList.add("header-fighter");

  // rowNum header cell spans two rows
  const numHead = fighterRow.insertCell();
  numHead.rowSpan = 2;
  numHead.innerText = "#";
  numHead.style.border = "2px solid black";
  numHead.style.textAlign = "center";

  // Build grouped fighter labels by scanning colTypes to compute colspans
  // We'll create a cell per fighter (group) by aggregating contiguous ranges belonging to same fighter.
  // For 2-fighter special case produce Combatant 1 and 2 separated by {e}, otherwise group per fighter.
  if (numFighters === 2) {
    // Count fighter1 columns (footwork + hands)
    const f1Cols = 1 + (fightersState[0]?.weapons?.length || 1); // footwork + hand cols
    const f1Cell = fighterRow.insertCell();
    f1Cell.colSpan = f1Cols;
    f1Cell.innerText = "Combatant 1";
    f1Cell.style.border = "2px solid black";
    f1Cell.style.textAlign = "center";
    f1Cell.contentEditable = "true";

    // shared {e} occupant cell (will span 2 rows)
    const eCell = fighterRow.insertCell();
    eCell.rowSpan = 2;
    eCell.innerText = "{e}";
    eCell.style.border = "2px solid black";
    eCell.style.textAlign = "center";

    const f2Cols = 1 + (fightersState[1]?.weapons?.length || 1);
    const f2Cell = fighterRow.insertCell();
    f2Cell.colSpan = f2Cols;
    f2Cell.innerText = "Combatant 2";
    f2Cell.style.border = "2px solid black";
    f2Cell.style.textAlign = "center";
    f2Cell.contentEditable = "true";
  } else {
    // 3+ fighters: one header cell per fighter, each spanning its subcolumns (footwork + e + hands)
    fightersState.forEach((f, i) => {
      const groupCols = 1 + 1 + (f.weapons?.length || 1); // footwork + e + hands
      const block = fighterRow.insertCell();
      block.colSpan = groupCols;
      block.innerText = `Combatant ${i + 1}`;
      block.style.border = "2px solid black";
      block.style.textAlign = "center";
      block.contentEditable = "true";
    });
  }

  // Notes header cell (rightmost) spans two rows
  const notesHead = fighterRow.insertCell();
  notesHead.rowSpan = 2;
  notesHead.innerText = "Notes";
  notesHead.style.border = "2px solid black";
  notesHead.style.textAlign = "center";

  // Subheader row (footwork / weapons labels / e)
  const sub = table.insertRow();
  // Build one cell per colType for the subheader
  colTypes.forEach((type, idx) => {

    if (type == "e" && numFighters == 2) {
      return;
    }

    const c = sub.insertCell();
    // The leftmost rowNum has already used rowspan; we still create cells to keep DOM structure consistent
    if (type === "rowNum") {
      c.innerText = ""; // empty because the number header above spans this
      c.style.display = "none";
      return;
    }
    if (type === "footwork") {
      c.innerText = "Footwork";
      c.style.textAlign = "center";
      return;
    }
    if (type === "e") {
      c.innerText = "{e}";
      c.style.textAlign = "center";
      return;
    }
    if (type === "notes") {
      c.innerText = "Notes";
      c.style.display = "none"; // notes header handled above
      return;
    }
    if (type.startsWith("hand:")) {
      const w = type.split(":")[1];
      c.innerText = prettify(w);
      c.style.textAlign = "center";
      return;
    }
    c.innerText = prettify(type);
  });

  // Create default blank data rows
  const defaultRows = 10;
  for (let r = 0; r < defaultRows; r++) {
    const row = table.insertRow();
    colTypes.forEach(type => {
      const cell = row.insertCell();
      if (type === "rowNum" || type === "e") {
        cell.classList.add("thin");
      }
      cell.style.border = "1px solid gray";
      cell.style.padding = "6px";
      cell.contentEditable = false;

      if (type === "rowNum") {
        cell.innerText = r + 1;
        cell.style.textAlign = "center";
        cell.style.fontWeight = "bold";
      } else if (type === "notes") {
        cell.contentEditable = "true";
        cell.innerText = "";
        cell.style.textAlign = "left";
      } else if (type === "footwork") {
        const wrapper = createDropdown(footworkOptions || []);
        const input = wrapper.querySelector("input[list]");
        if (input) { input.style.width = "100%"; input.style.boxSizing = "border-box"; }
        cell.appendChild(wrapper);
      } else if (type === "e") {
        const wrapper = createDropdown(eOptions || []);
        const input = wrapper.querySelector("input[list]");
        if (input) { input.style.width = "100%"; input.style.boxSizing = "border-box"; }
        cell.appendChild(wrapper);
      } else if (type.startsWith("hand:")) {
        const key = type.split(":")[1];
        const options = (weaponOptions && weaponOptions[key]) || handOptions || [];
        const wrapper = createDropdown(options);
        const input = wrapper.querySelector("input[list]");
        if (input) { input.style.width = "100%"; input.style.boxSizing = "border-box"; }
        cell.appendChild(wrapper);
      } else {
        cell.innerText = "";
      }
    });
  }

  // finally set column widths based on vector
  setDynamicColumnWidths(table, colTypes);
}

// ------------------- helpers for row operations -------------------
function findSubHeaderIndex(table) {
  // find row index that contains Footwork / {e} etc (subheader row)
  for (let i = 0; i < table.rows.length; i++) {
    for (const cell of table.rows[i].cells) {
      const t = (cell.textContent || "").trim();
      if (/^Footwork$/i.test(t) || /^Hand\s*\d+/i.test(t) || t === "{e}") return i;
    }
  }
  // fallback index typical for our layout (header, spacer, fighterRow, subheader)
  return Math.min(3, Math.max(0, table.rows.length - 1));
}

function renumberMoves(table) {
  const subIdx = findSubHeaderIndex(table);
  if (subIdx === -1) return;
  let move = 1;
  for (let r = subIdx + 1; r < table.rows.length; r++) {
    const firstCell = table.rows[r].cells && table.rows[r].cells[0];
    if (!firstCell) continue;
    const txt = (firstCell.textContent || "").trim();
    if (txt === "BREAK") continue;
    firstCell.textContent = move;
    move++;
  }
}

// create a data row according to colTypes and append to table
function appendDataRow(table) {
  const raw = table.dataset.colTypes;
  const colTypes = raw ? JSON.parse(raw) : [];
  if (!colTypes || colTypes.length === 0) return;

  const row = table.insertRow();
  colTypes.forEach((type, idx) => {
    const cell = row.insertCell();
    if (type === "rowNum" || type === "e") {
      cell.classList.add("thin");
    }
    cell.style.border = "1px solid gray";
    cell.style.padding = "6px";
    cell.contentEditable = false;

    if (type === "rowNum") {
      cell.innerText = ""; // will be filled by renumberMoves
      cell.style.textAlign = "center";
      cell.style.fontWeight = "bold";
      return;
    }
    if (type === "notes") {
      cell.contentEditable = "true";
      cell.innerText = "";
      return;
    }
    if (type === "footwork") {
      const wrapper = createDropdown(footworkOptions || []);
      const input = wrapper.querySelector("input[list]");
      if (input) { input.style.width = "100%"; input.style.boxSizing = "border-box"; }
      cell.appendChild(wrapper);
      return;
    }
    if (type === "e") {
      const wrapper = createDropdown(eOptions || []);
      const input = wrapper.querySelector("input[list]");
      if (input) { input.style.width = "100%"; input.style.boxSizing = "border-box"; }
      cell.appendChild(wrapper);
      return;
    }
    if (type.startsWith("hand:")) {
      const key = type.split(":")[1];
      const opts = (weaponOptions && weaponOptions[key]) || handOptions || [];
      const wrapper = createDropdown(opts);
      const input = wrapper.querySelector("input[list]");
      if (input) { input.style.width = "100%"; input.style.boxSizing = "border-box"; }
      cell.appendChild(wrapper);
      return;
    }
    // fallback
    cell.innerText = "";
  });

  // renumber all rows after append
  renumberMoves(table);
}

// ---------- addRow exposed to HTML ----------
function addRow() {
  const table = document.getElementById("spreadsheetTable");
  if (!table) return;
  // Append below existing data rows (end of table)
  appendDataRow(table);
}

// ---------- addBreak exposed to HTML ----------
function addBreak() {
  const table = document.getElementById("spreadsheetTable");
  if (!table) return;

  const raw = table.dataset.colTypes;
  const colTypes = raw ? JSON.parse(raw) : [];
  if (!colTypes || colTypes.length === 0) return;

  // Step 1: append a normal data row so addRow() remains consistent afterwards
  appendDataRow(table);

  // Step 2: insert BREAK row right before the last row
  const insertIndex = table.rows.length - 1;
  const breakRow = table.insertRow(insertIndex);
  for (let c = 0; c < colTypes.length; c++) {
    const type = colTypes[c];
    const cell = breakRow.insertCell();
    if (type === "rowNum" || type === "e") {
      cell.classList.add("thin");
    }
    cell.style.border = "1px solid #aaa";
    cell.style.padding = "4px";
    cell.style.backgroundColor = "#ddd";
    cell.contentEditable = "false";

    if (type === "rowNum") {
      cell.textContent = "BREAK";
      cell.style.textAlign = "center";
      cell.style.fontWeight = "bold";
    } else if (type === "notes") {
      cell.contentEditable = "true";
      cell.textContent = "";
    } else {
      cell.textContent = "";
    }
  }

  renumberMoves(table);
}

// ------------------- exportSpreadsheet (mostly unchanged) -------------------
async function getExportOptions(defaultName) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed", inset: "0", background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: "9999", backdropFilter: "blur(2px)"
    });

    const box = document.createElement("div");
    Object.assign(box.style, {
      background: "#fff", padding: "20px 24px", borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)", width: "300px",
      fontFamily: "system-ui, sans-serif", color: "#222",
      transform: "scale(0.95)", opacity: "0",
      transition: "all 0.15s ease-out"
    });

    box.innerHTML = `
      <h3 style="margin:0 0 12px 0;font-size:18px;font-weight:600;text-align:center;">
        Export Spreadsheet
      </h3>

      <label style="display:block;margin-bottom:6px;font-weight:500;">Filename:</label>
      <input type="text" id="exportName" value="${defaultName}"
        style="width:100%;padding:6px 8px;font-size:14px;margin-bottom:12px;
        border:1px solid #ccc;border-radius:6px;outline:none;">

      <label style="display:block;margin-bottom:6px;font-weight:500;">Format:</label>
      <select id="exportFormat"
        style="width:100%;padding:6px 8px;font-size:14px;margin-bottom:16px;
        border:1px solid #ccc;border-radius:6px;outline:none;">
        <option value="xlsx">Excel (.xlsx)</option>
        <option value="pdf">PDF (.pdf)</option>
      </select>

      <label style="display:flex;width:100%;align-items:center;margin:0 0 12px 0;font-size:14px;cursor:pointer;">
        <input type="checkbox" id="exportConfig" style="margin-right:6px;">
        <span>Also export configuration (.json)</span>
      </label>

      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button id="cancelExportBtn" style="
          background:#eee;border:none;padding:6px 12px;border-radius:6px;
          font-size:14px;cursor:pointer;transition:background 0.2s;">Cancel</button>

        <button id="okExportBtn" style="
          background:#0078d4;color:#fff;border:none;padding:6px 12px;border-radius:6px;
          font-size:14px;cursor:pointer;transition:background 0.2s;">OK</button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      box.style.transform = "scale(1)";
      box.style.opacity = "1";
    });

    const nameInput = box.querySelector("#exportName");
    const configBox = box.querySelector("#exportConfig");
    const formatSelect = box.querySelector("#exportFormat");

    box.querySelector("#cancelExportBtn").onclick = () => {
      overlay.remove();
      resolve(null);
    };

    box.querySelector("#okExportBtn").onclick = () => {
      const filename = nameInput.value.trim();
      const format = formatSelect.value;   // "xlsx" or "pdf"
      const includeConfig = configBox.checked;
      overlay.remove();
      resolve({ filename, format, includeConfig });
    };

    nameInput.focus();
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Enter") box.querySelector("#okExportBtn").click();
      if (e.key === "Escape") box.querySelector("#cancelExportBtn").click();
    });
  });
}

// helper: rgb()/rgba() -> ARGB hex
function rgbToHex(rgb) {
  if (!rgb) return "FF000000";
  const m = rgb.match(/\d+/g);
  if (!m) return "FF000000";
  const r = Number(m[0]), g = Number(m[1]), b = Number(m[2]);
  return ("FF" + [r,g,b].map(x => x.toString(16).padStart(2, "0")).join("")).toUpperCase();
}

// async function exportSpreadsheetPDF(table, filename) {
//   // Load jsPDF
//   const { jsPDF } = window.jspdf;

//   // Capture table as a rasterized canvas
//   const canvas = await html2canvas(table, {
//     scale: 2,
//     useCORS: true,
//     backgroundColor: "#ffffff"
//   });

//   const pdf = new jsPDF("l", "pt", "a4"); // landscape
//   const imgData = canvas.toDataURL("image/png");

//   // dimensions
//   const pageWidth = pdf.internal.pageSize.getWidth();
//   const pageHeight = pdf.internal.pageSize.getHeight();

//   // scale to fit width
//   const ratio = canvas.height / canvas.width;
//   const imgWidth = pageWidth - 40;
//   const imgHeight = imgWidth * ratio;

//   pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight);
//   pdf.save(filename);

//   console.log("PDF exported:", filename);
// }







// ------------------- bootstrap -------------------

async function exportTable() {
  const table = document.getElementById("spreadsheetTable");
  if (!table) {
    alert("Spreadsheet table not found.");
    return;
  }

  // Extract fight title from header
  let fightTitle = "Fight";
  if (table.rows.length > 0) {
    const headerRow = table.rows[0];
    let found = false;

    for (let i = 0; i < headerRow.cells.length; i++) {
      const hc = headerRow.cells[i];
      if (hc.querySelector && hc.querySelector("strong")) {
        fightTitle = hc.innerText.trim() || fightTitle;
        found = true;
        break;
      }
    }

    if (!found) {
      const mid = Math.floor(headerRow.cells.length / 2);
      fightTitle = (headerRow.cells[mid]?.innerText.trim()) || fightTitle;
    }
  }

  fightTitle = fightTitle.replace(/[^a-z0-9_\-]/gi, "_");

  // Ask user for filename + format
  const result = await getExportOptions(`SPAR_${fightTitle}`);
  if (!result || !result.filename) return;

  let { filename, format, includeConfig } = result;
  filename = filename.replace(/\.(xlsx|pdf)$/i, "");  // clean extension

  // Call correct exporter
  if (format === "pdf") {
    await exportSpreadsheetPDF(table, `${filename}.pdf`);
  } else {
    await exportSpreadsheetXLSX(table, `${filename}.xlsx`);
  }

  // Export config file if requested
  if (includeConfig && window.SPARconfig) {
    const configBlob = new Blob(
      [JSON.stringify(window.SPARconfig, null, 2)],
      { type: "application/json" }
    );
    const configUrl = URL.createObjectURL(configBlob);
    const a = document.createElement("a");
    a.href = configUrl;
    a.download = `${filename}.spar`;
    a.click();
    URL.revokeObjectURL(configUrl);
  }
}

async function exportSpreadsheetPDF(table, filename) {
  const { jsPDF } = window.jspdf;

  const canvas = await html2canvas(table, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff"
  });

  const pdf = new jsPDF("l", "pt", "a4");
  const imgData = canvas.toDataURL("image/png");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const ratio = canvas.height / canvas.width;
  const imgWidth = pageWidth - 40;
  const imgHeight = imgWidth * ratio;

  pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight);
  pdf.save(filename);
}

async function exportSpreadsheetXLSX(table, filename) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Fight Sheet");
  const occupied = {};

  for (let r = 0; r < table.rows.length; r++) {
    const htmlRow = table.rows[r];
    const sheetRow = sheet.getRow(r + 1);
    let excelCol = 1;

    for (let j = 0; j < htmlRow.cells.length; j++) {
      const htmlCell = htmlRow.cells[j];
      const style = window.getComputedStyle(htmlCell);

      // Skip hidden HTML cells
      if (style.display === "none" || style.visibility === "hidden") continue;

      // Skip placeholder merge cells
      if (
        htmlCell.innerText.trim() === "" &&
        (htmlCell.colSpan > 1 || htmlCell.rowSpan > 1) &&
        !htmlCell.querySelector("input,select")
      ) {
        continue;
      }

      // Move to next free column (merge filler)
      while (occupied[`${r + 1},${excelCol}`]) excelCol++;

      const startRow = r + 1;
      const startCol = excelCol;

      const colspan = htmlCell.colSpan || 1;
      const rowspan = htmlCell.rowSpan || 1;

      const excelCell = sheetRow.getCell(startCol);

      // determine cell value
      let value = "";
      const input = htmlCell.querySelector("input[list]");
      const select = htmlCell.querySelector("select");

      if (input) value = input.value.trim();
      else if (select) value = select.options[select.selectedIndex]?.text || "";
      else value = htmlCell.innerText.trim();

      excelCell.value = value;

      // Alignment
      excelCell.alignment = {
        horizontal: style.textAlign || "center",
        vertical: "middle",
        wrapText: true
      };

      // Font styles
      const fontObj = {};
      if (style.fontWeight === "700" || style.fontWeight === "bold") fontObj.bold = true;
      if (style.textDecoration?.includes("underline")) fontObj.underline = true;
      excelCell.font = fontObj;

      // Background color
      if (style.backgroundColor && !style.backgroundColor.includes("transparent")) {
        try {
          excelCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: rgbToHex(style.backgroundColor) }
          };
        } catch {}
      }

      // Borders
      excelCell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };

      // Handle merged cells
      if (colspan > 1 || rowspan > 1) {
        const endRow = startRow + rowspan - 1;
        const endCol = startCol + colspan - 1;
        sheet.mergeCells(startRow, startCol, endRow, endCol);

        for (let rr = startRow; rr <= endRow; rr++) {
          for (let cc = startCol; cc <= endCol; cc++) {
            if (!(rr === startRow && cc === startCol)) {
              occupied[`${rr},${cc}`] = true;
            }
          }
        }
      }

      excelCol += colspan;
    }
  }

  // Save XLSX
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob(
    [buffer],
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
  );

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

document.addEventListener("DOMContentLoaded", async () => {
  const saved = localStorage.getItem("SPARconfig");
  if (saved) {
    try { window.SPARconfig = SPARconfig.restore(saved); } catch(e) { console.warn("restore failed", e); }
  }
  await loadOptions();
  buildSpreadsheet();
});