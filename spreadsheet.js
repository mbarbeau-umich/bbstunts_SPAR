


// /* 
// Load dropdown option sets ---
// */
// Option storage
let footworkOptions = [];
let handOptions = []; // generic fallback
let eOptions = [];
const weaponTypes = ["sword", "unarmed", "staff", "shield"]; // update this list to add new weapon types
const weaponOptions = {}; // will hold { sword: [...], unarmed: [...], ... }

/* 
Load dropdown option sets ---
- loads options/o_footwork.txt, options/o_e.txt, and options/o_<weapon>.txt for each weapon in weaponTypes
*/
async function loadOptions() {
  try {
    // always try footwork and e
    const baseFiles = [
      fetch("options/o_footwork.txt").then(r => r.ok ? r.text() : ""),
      fetch("options/o_e.txt").then(r => r.ok ? r.text() : "")
    ];

    // weapon files
    const weaponFetches = weaponTypes.map(w =>
      fetch(`options/o_${w}.txt`).then(res => res.ok ? res.text() : "")
    );

    // Also keep a generic 'hand' file fallback (optional)
    const handFetch = fetch("options/o_hand.txt").then(r => r.ok ? r.text() : "");

    const allResults = await Promise.all([...baseFiles, handFetch, ...weaponFetches]);
    const footworkText = allResults[0] || "";
    const eText = allResults[1] || "";
    const handText = allResults[2] || "";

    // weapon texts follow
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

    // populate weaponOptions map
    weaponTypes.forEach((w, i) => {
      const txt = weaponTexts[i] || "";
      weaponOptions[w] = [""].concat(
        (txt || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean)
      );
      // if file missing, fall back to generic handOptions
      if (weaponOptions[w].length === 1) {
        weaponOptions[w] = [...handOptions];
      }
    });

    console.log("Options loaded:", { footworkOptions, handOptions, eOptions, weaponOptions });
  } catch (err) {
    console.error("Error loading option files:", err);

    // FALLBACK: sensible defaults
    footworkOptions = ["", "Advance", "Retreat", "Cross Over Advance", "Cross Over Retreat", "Pass Forward", "Pass Back"];
    handOptions = ["", "Punch", "Block", "Parry", "Slash", "Thrust"];
    eOptions = ["", "←", "→", "←→", "→←"];

    weaponTypes.forEach(w => weaponOptions[w] = [...handOptions]);
    console.log("Using default option sets as fallback.");
  }
}


/* 

*/
function makeHandLabel(fighterIdx, handIdx, fightersState) {
  const f = fightersState[fighterIdx];
  if (!f || !f.weapons) return `Hand ${handIdx + 1}`;
  const weapon = f.weapons[handIdx] || `Hand ${handIdx + 1}`;
  // If multiple hands of same weapon, append index
  const count = f.weapons.filter(w => w === weapon).length;
  if (count > 1) return `${weapon} ${handIdx + 1}`;
  return weapon;
}


/* 
Constructs the table based on the selected configuration/fighter options
*/
function createDropdown(options = []) {
  // returns a wrapper div containing <input list="..."> and the datalist
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

function buildSpreadsheet() {
  const table = document.getElementById("spreadsheetTable");
  if (!table) return;

  // Disable table-level editing
  table.removeAttribute("contenteditable");
  table.contentEditable = "false";

  // --------------------------
  // Get data from config
  // --------------------------
  const cfg = window.SPARconfig || {};
  const title = cfg.fight_title || "Untitled Fight";
  const author = cfg.fight_author || "Unknown";
  const fightersState = Array.isArray(cfg.combatants)
    ? cfg.combatants.map(c => ({
        hands: c.hands || 1,
        weapons: Array.isArray(c.weapon)
          ? c.weapon
          : Array.isArray(c.weapons)
          ? c.weapons
          : [c.weapon || "unarmed"]
      }))
    : Array.isArray(cfg.fightersState)
    ? cfg.fightersState
    : [];
  const numFighters = fightersState.length || 2;

  const dateStr = new Date().toLocaleDateString();

  // --------------------------
  // Column widths (adjust as you like)
  // --------------------------
  const COL_WIDTHS = {
    rowNum: "36px",
    footwork: "90px",
    weapon: "80px",
    e: "60px",
    notes: "220px"
  };

  // --------------------------
  // Start building table
  // --------------------------
  table.innerHTML = "";

  // Header row (author / title / date)
  const headerRow = table.insertRow();
  const authorCell = headerRow.insertCell();
  authorCell.innerText = `Author(s): ${author}`;
  authorCell.style.textAlign = "left";
  authorCell.style.borderBottom = "2px solid black";
  authorCell.style.padding = "8px";
  authorCell.contentEditable = "true";

  const totalCols = 1 + // row number
    fightersState.reduce((sum, f, i) => sum + (f.hands + (numFighters === 2 ? 1 : 2)), 0) +
    (numFighters === 2 ? 1 : 0) + // shared e for 2-fighter mode
    1; // notes col

  const titleCell = headerRow.insertCell();
  titleCell.colSpan = totalCols - 2;
  titleCell.innerHTML = `<strong>${title}</strong>`;
  titleCell.style.textAlign = "center";
  titleCell.style.borderBottom = "2px solid black";
  titleCell.style.padding = "8px";
  titleCell.contentEditable = "true";

  const dateCell = headerRow.insertCell();
  dateCell.innerText = dateStr;
  dateCell.style.textAlign = "right";
  dateCell.style.borderBottom = "2px solid black";
  dateCell.style.padding = "8px";

  // Spacer row
  const spacer = table.insertRow();
  const spacerCell = spacer.insertCell();
  spacerCell.colSpan = totalCols;
  spacerCell.style.height = "6px";
  spacerCell.style.backgroundColor = "#eee";

  // Fighter header
  const fighterRow = table.insertRow();
  fighterRow.classList.add("header-fighter");

  // Leftmost #
  const numHead = fighterRow.insertCell();
  numHead.rowSpan = 2;
  numHead.innerText = "#";
  numHead.style.border = "2px solid black";
  numHead.style.textAlign = "center";
  numHead.style.width = COL_WIDTHS.rowNum;

  if (numFighters === 2) {
    // Fighter 1
    const f1 = fighterRow.insertCell();
    f1.colSpan = fightersState[0].hands + 1;
    f1.innerText = "Combatant 1";
    f1.style.border = "2px solid black";
    f1.style.textAlign = "center";
    f1.contentEditable = "true";

    // Shared {e}
    const eCell = fighterRow.insertCell();
    eCell.rowSpan = 2;
    eCell.innerText = "{e}";
    eCell.style.border = "2px solid black";
    eCell.style.textAlign = "center";
    eCell.style.width = COL_WIDTHS.e;

    // Fighter 2
    const f2 = fighterRow.insertCell();
    f2.colSpan = fightersState[1].hands + 1;
    f2.innerText = "Combatant 2";
    f2.style.border = "2px solid black";
    f2.style.textAlign = "center";
    f2.contentEditable = "true";
  } else {
    // 3+ fighters
    fightersState.forEach((f, i) => {
      const block = fighterRow.insertCell();
      block.colSpan = f.hands + 2;
      block.innerText = `Combatant ${i + 1}`;
      block.style.border = "2px solid black";
      block.style.textAlign = "center";
      block.contentEditable = "true";
    });
  }

  // Rightmost Notes
  const notesHead = fighterRow.insertCell();
  notesHead.rowSpan = 2;
  notesHead.innerText = "Notes";
  notesHead.style.border = "2px solid black";
  notesHead.style.textAlign = "center";
  notesHead.style.width = COL_WIDTHS.notes;

  // Subheader row
  const sub = table.insertRow();
  const colTypes = ["rowNum"];

  const prettify = s =>
    s ? s.toString().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";

  if (numFighters === 2) {
    // Fighter 1
    sub.insertCell().innerText = "Footwork";
    colTypes.push("footwork");

    fightersState[0].weapons.forEach(w => {
      const c = sub.insertCell();
      c.innerText = prettify(w);
      c.style.width = COL_WIDTHS.weapon;
      c.style.textAlign = "center";
      c.style.border = "1px solid gray";
      colTypes.push(`hand:${w}`);
    });

    // shared {e}
    colTypes.push("e");

    // Fighter 2
    sub.insertCell().innerText = "Footwork";
    colTypes.push("footwork");

    fightersState[1].weapons.forEach(w => {
      const c = sub.insertCell();
      c.innerText = prettify(w);
      c.style.width = COL_WIDTHS.weapon;
      c.style.textAlign = "center";
      c.style.border = "1px solid gray";
      colTypes.push(`hand:${w}`);
    });
  } else {
    // 3+ fighters
    fightersState.forEach((f, i) => {
      const labels = ["Footwork", "{e}", ...f.weapons];
      labels.forEach(lbl => {
        const c = sub.insertCell();
        c.innerText = prettify(lbl);
        c.style.border = "1px solid gray";
        c.style.textAlign = "center";
        if (lbl === "{e}") c.style.width = COL_WIDTHS.e;
        else if (lbl === "Footwork") c.style.width = COL_WIDTHS.footwork;
        else c.style.width = COL_WIDTHS.weapon;

        if (lbl === "{e}") colTypes.push("e");
        else if (lbl === "Footwork") colTypes.push("footwork");
        else colTypes.push(`hand:${lbl.toLowerCase()}`);
      });
    });
  }

  colTypes.push("notes");

  // --- Create blank rows
  const defaultRows = 10;
  for (let r = 0; r < defaultRows; r++) {
    const row = table.insertRow();
    colTypes.forEach((type, idx) => {
      const cell = row.insertCell();
      cell.style.border = "1px solid gray";
      cell.style.padding = "6px";
      cell.contentEditable = false;

      if (type === "rowNum") {
        cell.innerText = r + 1;
        cell.style.textAlign = "center";
        cell.style.fontWeight = "bold";
        cell.style.width = COL_WIDTHS.rowNum;
      } else if (type === "footwork") {
        const wrapper = createDropdown(footworkOptions || []);
        const input = wrapper.querySelector("input[list]");
        if (input) {
          input.style.width = "100%";
          input.style.boxSizing = "border-box";
        }
        cell.style.width = COL_WIDTHS.footwork;
        cell.appendChild(wrapper);
      } else if (type.startsWith("hand:")) {
        const key = type.split(":")[1];
        const options =
          (weaponOptions && weaponOptions[key]) || (handOptions || []);
        const wrapper = createDropdown(options);
        const input = wrapper.querySelector("input[list]");
        if (input) {
          input.style.width = "100%";
          input.style.boxSizing = "border-box";
        }
        cell.style.width = COL_WIDTHS.weapon;
        cell.appendChild(wrapper);
      } else if (type === "e") {
        const wrapper = createDropdown(eOptions || []);
        const input = wrapper.querySelector("input[list]");
        if (input) {
          input.style.width = "100%";
          input.style.boxSizing = "border-box";
        }
        cell.style.width = COL_WIDTHS.e;
        cell.appendChild(wrapper);
      } else if (type === "notes") {
        cell.contentEditable = "true";
        cell.innerText = "";
        cell.style.width = COL_WIDTHS.notes;
        cell.style.textAlign = "left";
      }
    });
  }
}

// --- helper popup for export options ---
// --- helper popup for export options ---
async function getExportOptions(defaultName) {
  return new Promise((resolve) => {
    // overlay background
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: "9999",
      backdropFilter: "blur(2px)"
    });

    // popup box
    const box = document.createElement("div");
    Object.assign(box.style, {
      background: "#fff",
      padding: "20px 24px",
      borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      width: "300px",
      fontFamily: "system-ui, sans-serif",
      color: "#222",
      transform: "scale(0.95)",
      opacity: "0",
      transition: "all 0.15s ease-out"
    });
    box.innerHTML = `
      <h3 style="margin:0 0 12px 0;font-size:18px;font-weight:600;text-align:center;">Export Spreadsheet</h3>
      <label style="display:block;margin-bottom:6px;font-weight:500;">Filename:</label>
      <input type="text" id="exportName" value="${defaultName}" 
        style="width:100%;padding:6px 8px;font-size:14px;margin-bottom:12px;
        border:1px solid #ccc;border-radius:6px;outline:none;">
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer;font-size:14px;">
        <input type="checkbox" id="exportConfig" style="transform:scale(1.2);"> 
        Also export configuration (.json)
      </label>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button id="cancelExportBtn" style="
          background:#eee;border:none;padding:6px 12px;border-radius:6px;
          font-size:14px;cursor:pointer;transition:background 0.2s;">
          Cancel
        </button>
        <button id="okExportBtn" style="
          background:#0078d4;color:#fff;border:none;padding:6px 12px;border-radius:6px;
          font-size:14px;cursor:pointer;transition:background 0.2s;">
          OK
        </button>
      </div>
    `;

    // assemble and animate in
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      box.style.transform = "scale(1)";
      box.style.opacity = "1";
    });

    // button handlers
    const nameInput = box.querySelector("#exportName");
    const configBox = box.querySelector("#exportConfig");
    box.querySelector("#cancelExportBtn").onclick = () => {
      overlay.remove();
      resolve(null);
    };
    box.querySelector("#okExportBtn").onclick = () => {
      const filename = nameInput.value.trim();
      const includeConfig = configBox.checked;
      overlay.remove();
      resolve({ filename, includeConfig });
    };

    // allow pressing Enter / Escape
    nameInput.focus();
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Enter") box.querySelector("#okExportBtn").click();
      if (e.key === "Escape") box.querySelector("#cancelExportBtn").click();
    });
  });
}



/* 
Exports the table to an excel (.xlsx) file
*/
async function exportSpreadsheet() {
  const table = document.getElementById("spreadsheetTable");
  if (!table) {
    alert("Spreadsheet table not found.");
    return;
  }

  // --- filename from title cell (robust) ---
  let fightTitle = "Fight";
  if (table.rows.length > 0) {
    const headerRow = table.rows[0];
    // prefer a <strong> title cell, otherwise fall back to middle cell
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
      fightTitle = (headerRow.cells[mid] && headerRow.cells[mid].innerText.trim()) || fightTitle;
    }
  }
  fightTitle = fightTitle.replace(/[^a-z0-9_\-]/gi, "_");

  // let filename = prompt("Enter filename for export:", `SPAR_${fightTitle}.xlsx`);
  // if (!filename) return;
  // if (!filename.endsWith(".xlsx")) filename += ".xlsx";
  const result = await getExportOptions(`SPAR_${fightTitle}.xlsx`);
  if (!result || !result.filename) return;
  let { filename, includeConfig } = result;
  if (!filename.endsWith(".xlsx")) filename += ".xlsx";


  // --- ExcelJS workbook/sheet (ExcelJS must be loaded before this script) ---
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Fight Sheet");

  // occupied map for cells already covered by a rowspan/colspan merge
  const occupied = {}; // keys like "row,col" set to true

  for (let r = 0; r < table.rows.length; r++) {
    const htmlRow = table.rows[r];
    const sheetRow = sheet.getRow(r + 1);

    // excel column pointer for this DOM row (1-based)
    let excelCol = 1;

    for (let j = 0; j < htmlRow.cells.length; j++) {
      // skip columns already occupied by previous merges
      while (occupied[`${r + 1},${excelCol}`]) excelCol++;

      const htmlCell = htmlRow.cells[j];
      const startRow = r + 1;
      const startCol = excelCol;
      const colspan = htmlCell.colSpan || 1;
      const rowspan = htmlCell.rowSpan || 1;
      const excelCell = sheetRow.getCell(startCol);

      // --- value (input[list], select, or plain text) ---
      let value = "";
      const input = htmlCell.querySelector("input[list]");
      if (input) {
        value = input.value.trim();
      } else {
        const select = htmlCell.querySelector("select");
        value = select ? (select.options[select.selectedIndex]?.text || "") : htmlCell.innerText.trim();
      }
      excelCell.value = value;

      // --- styles (font / fill / alignment) ---
      const style = window.getComputedStyle(htmlCell);
      // alignment
      excelCell.alignment = {
        horizontal: (style.textAlign && style.textAlign !== "" ? style.textAlign : "center"),
        vertical: "middle",
        wrapText: true
      };

      // font
      const fontObj = { ...(excelCell.font || {}) };
      if (style.fontWeight === "700" || style.fontWeight === "bold") fontObj.bold = true;
      if (style.textDecoration && style.textDecoration.includes("underline")) fontObj.underline = true;
      if (style.color && !style.color.includes("transparent")) {
        try { fontObj.color = { argb: rgbToHex(style.color) }; } catch (e) {}
      }
      if (Object.keys(fontObj).length) excelCell.font = fontObj;

      // fill (background)
      if (style.backgroundColor && !style.backgroundColor.includes("transparent") && !style.backgroundColor.includes("rgba(0, 0, 0, 0)")) {
        try {
          excelCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: rgbToHex(style.backgroundColor) }
          };
        } catch (e) {}
      }

      // borders (thin grid)
      excelCell.border = {
        top:    { style: "thin", color: { argb: "FF000000" } },
        left:   { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right:  { style: "thin", color: { argb: "FF000000" } }
      };

      // --- merges ---
      if (colspan > 1 || rowspan > 1) {
        const endRow = startRow + rowspan - 1;
        const endCol = startCol + colspan - 1;
        sheet.mergeCells(startRow, startCol, endRow, endCol);

        // mark spanned cells as occupied (so subsequent DOM cells won't be placed into those coords)
        for (let rr = startRow; rr <= endRow; rr++) {
          for (let cc = startCol; cc <= endCol; cc++) {
            if (!(rr === startRow && cc === startCol)) occupied[`${rr},${cc}`] = true;
          }
        }
      }

      // advance excelCol by the logical width of this HTML cell
      excelCol += colspan;
    } // end cells loop
  } // end rows loop

  // --- final write and download ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  // --- Optionally export SPARconfig as JSON ---
  if (includeConfig && window.SPARconfig) {
    const configBlob = new Blob(
      [JSON.stringify(window.SPARconfig, null, 2)],
      { type: "application/json" }
    );
    const configUrl = URL.createObjectURL(configBlob);
    const configA = document.createElement("a");
    configA.href = configUrl;
    configA.download = filename.replace(/\.xlsx$/, ".spar");
    configA.click();
    URL.revokeObjectURL(configUrl);
  }
} 

// helper: rgb()/rgba() -> ARGB hex (robust)
function rgbToHex(rgb) {
  if (!rgb) return "FF000000";
  const m = rgb.match(/\d+/g);
  if (!m) return "FF000000";
  const r = Number(m[0]), g = Number(m[1]), b = Number(m[2]);
  return ("FF" + [r,g,b].map(x => x.toString(16).padStart(2, "0")).join("")).toUpperCase();
} // **************************************************************************************

/*
Adds a BLANK row to the bottom of the table with the same formatting as the previous bottom row
*/
// ---------- helpers ----------
function findSubHeaderIndex(table) {
  for (let i = 0; i < table.rows.length; i++) {
    for (const cell of table.rows[i].cells) {
      const t = (cell.textContent || "").trim();
      if (/^Footwork$/i.test(t) || /^Hand\s*\d+/i.test(t) || t === "{e}") return i;
    }
  }
  return -1;
}

function getColTypes(table) {
  if (!table || table.rows.length < 4) return [];

  // Grab the subheader row (2nd header row)
  const subHeaderRow = table.rows[3]; // index: 0=header,1=spacer,2=fighterRow,3=subHeader
  const types = ["rowNum"];

  // Two-fighter special case: shared {e} column is not in subheader row
  const numFighters = parseInt(localStorage.getItem("numFighters")) || 2;

  let colIndex = 1; // skip rowNum
  if (numFighters === 2) {
    // Fighter 1 footwork + hands
    // const f1Hands = JSON.parse(localStorage.getItem("fighterOptions"))[0] || 1;
    const fighterOptions = JSON.parse(localStorage.getItem("fighterOptions")) || [1, 1];
    const f1Hands = fighterOptions[0] || 1;
    const f2Hands = fighterOptions[1] || 1;

    types.push("footwork");
    for (let i = 0; i < f1Hands; i++) types.push("hand");

    // Shared {e}
    types.push("e");

    // Fighter 2 footwork + hands
    // const f2Hands = JSON.parse(localStorage.getItem("fighterOptions"))[1] || 1;
    types.push("footwork");
    for (let i = 0; i < f2Hands; i++) types.push("hand");
  } else {
    // 3+ fighters: subheader row explicitly contains {e}
    for (let i = 0; i < subHeaderRow.cells.length; i++) {
      const txt = subHeaderRow.cells[i].innerText.trim();
      if (txt === "{e}") types.push("e");
      else if (txt.toLowerCase().startsWith("footwork")) types.push("footwork");
      else if (txt.toLowerCase() === "notes") continue; // handled below
      else types.push("hand");
    }
  }

  // Always add notes col at the end
  types.push("notes");

  return types;
}

function renumberMoves(table) {
  const subIdx = findSubHeaderIndex(table);
  if (subIdx === -1) return;

  // data rows begin AFTER the subheader row
  let move = 1;
  for (let r = subIdx + 2; r < table.rows.length; r++) {
    const firstCell = table.rows[r].cells[0];
    if (!firstCell) continue;

    const txt = (firstCell.textContent || "").trim();
    if (txt === "BREAK") {
      // skip numbering BREAK rows
      continue;
    } else {
      firstCell.textContent = move;
      move++;
    }
  }
}

// ---------- new addRow ----------
function addRow() {
  const table = document.getElementById("spreadsheetTable");
  if (table.rows.length < 1) return;

  // Find the last non-BREAK row after the subheader
  let templateRowIndex = -1;
  for (let i = table.rows.length - 1; i >= 0; i--) {
    const firstCell = table.rows[i].cells[0];
    if (firstCell && firstCell.textContent.trim() !== "BREAK") {
      templateRowIndex = i;
      break;
    }
  }
  if (templateRowIndex === -1) return; // no valid template row

  const templateRow = table.rows[templateRowIndex];
  const newRow = table.insertRow();

  for (let c = 0; c < templateRow.cells.length; c++) {
    const newCell = newRow.insertCell();
    const templateCell = templateRow.cells[c];

    newCell.style.cssText = templateCell.style.cssText || "";
    newCell.contentEditable = "false";

    // --- First column = row number ---
    if (c === 0) {
      newCell.innerText = ""; // will be set by renumberMoves
      newCell.style.textAlign = "center";
      continue;
    }

    // --- Notes column (last col) ---
    if (c === templateRow.cells.length - 1) {
      newCell.contentEditable = "true";
      newCell.innerText = "";
      continue;
    }

    // --- Dropdown columns ---
    const templateInput = templateCell.querySelector("input[list]");
    if (templateInput) {
      const listId = templateInput.getAttribute("list");
      const datalist = document.getElementById(listId);
      const options = datalist ? Array.from(datalist.options).map(o => o.value) : [];
      const wrapper = createDropdown(options);
      const input = wrapper.querySelector("input[list]");
      if (input) {
        input.style.width = "100%";
        input.style.boxSizing = "border-box";
      }
      newCell.appendChild(wrapper);
      continue;
    }

    // Legacy <select>
    const templateSelect = templateCell.querySelector("select");
    if (templateSelect) {
      const clone = templateSelect.cloneNode(true);
      clone.value = "";
      newCell.appendChild(clone);
      continue;
    }

    // fallback
    newCell.innerText = "";
  }

  // Fix move numbering
  renumberMoves(table);
}

// ---------- new addBreak ----------
function addBreak() {
  const table = document.getElementById("spreadsheetTable");
  if (!table || table.rows.length < 1) return;

  const colTypes = getColTypes(table);
  if (!colTypes || colTypes.length === 0) return;

  // Step 1: append a proper blank choreography row (so subsequent addRow continues normally)
  addRow();

  // Step 2: insert BREAK row immediately before that newly added row
  const insertIndex = table.rows.length - 1; // before last row
  const breakRow = table.insertRow(insertIndex);

  for (let c = 0; c < colTypes.length; c++) {
    const type = colTypes[c];
    const cell = breakRow.insertCell();
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

  // finally, renumber moves (BREAK rows are ignored)
  renumberMoves(table);
} // **************************************************************************************

// function setDynamicColumnWidths(table) {
//   if (!table) return;

//   // Define base widths for each column type
//   const colWidths = {
//     rowNum: 40,
//     footwork: 100,
//     hand: 100,
//     e: 20,
//     notes: 180
//   };

//   // Use your existing helper to get the logical column types
//   const colTypes = getColTypes(table);

//   // Remove any existing <colgroup> (if present)
//   const oldColGroup = table.querySelector("colgroup");
//   if (oldColGroup) oldColGroup.remove();

//   // Create a new <colgroup> element
//   const colgroup = document.createElement("colgroup");

//   // Build the colgroup dynamically
//   colTypes.forEach(type => {
//     const col = document.createElement("col");
//     const width = colWidths[type] || 100; // default width
//     col.style.width = width + "px";
//     colgroup.appendChild(col);
//   });

//   // Insert at the start of the table
//   table.prepend(colgroup);
// }

function setDynamicColumnWidths(table) {
  if (!table || table.rows.length < 4) return;

  // Logical column types
  const colTypes = getColTypes(table);
  if (!colTypes || colTypes.length === 0) return;

  // Define base widths for each core type
  const widthMap = {
    rowNum: 40,        // small
    footwork: 200,     // medium
    hand: 200,         // larger for weapon names
    e: 10,             // small shared column
    notes: 100         // widest
  };

  // Remove any old <colgroup>
  const old = table.querySelector("colgroup");
  if (old) old.remove();

  // Create new <colgroup>
  const cg = document.createElement("colgroup");

  for (const type of colTypes) {
    const col = document.createElement("col");

    // detect subtype like "hand:sword"
    let baseType = type.split(":")[0];
    const w = widthMap[baseType] || 100;

    col.style.width = w + "px";
    cg.appendChild(col);
  }

  table.prepend(cg);
}


// bootstrap on page load
document.addEventListener("DOMContentLoaded", async () => {
  // restore SPARconfig from localStorage if not already present
  const saved = localStorage.getItem("SPARconfig");
  if (saved) {
    window.SPARconfig = SPARconfig.restore(saved);
  }

  await loadOptions();  // load dropdown files
  buildSpreadsheet();

  const table = document.getElementById("spreadsheetTable");
  setDynamicColumnWidths(table);

});