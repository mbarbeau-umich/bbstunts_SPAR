


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
Generates drop down item based on a given option list
*/
let dropdownCounter = 0;
function createDropdown(options) {
  dropdownCounter++;
  const listId = "dropdownList_" + dropdownCounter;

  const input = document.createElement("input");
  input.setAttribute("list", listId);
  input.className = "cell-dropdown";
  input.autocomplete = "off";
  input.value = "";

  const datalist = document.createElement("datalist");
  datalist.id = listId;
  options.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt;
    datalist.appendChild(o);
  });

  const wrapper = document.createElement("div");
  wrapper.className = "dropdown-wrapper";
  wrapper.appendChild(input);
  wrapper.appendChild(datalist);

  return wrapper;
} // **************************************************************************************

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
function buildSpreadsheet() {
  const table = document.getElementById("spreadsheetTable");
  if (!table) return;
  // ensure not editable at table level
  table.removeAttribute("contenteditable");
  table.contentEditable = "false";

  const title = localStorage.getItem("fightTitle") || "Demo Fight";
  const numFighters = parseInt(localStorage.getItem("numFighters")) || 2;
  const fighterOptions = JSON.parse(localStorage.getItem("fighterOptions")) || Array(numFighters).fill(1);

  // rich state saved from setup: [{hands: N, weapons: ["sword","shield"]}, ...]
  let fightersState = JSON.parse(localStorage.getItem("fightersState") || "null");
  if (!Array.isArray(fightersState) || fightersState.length < numFighters) {
    // fallback: create simple structure (default weapon token)
    const fallbackW = (typeof weaponTypes !== "undefined" && weaponTypes.includes("unarmed")) ? "unarmed" :
                      (typeof weaponTypes !== "undefined" && weaponTypes.length ? weaponTypes[0] : "hand");
    fightersState = [];
    for (let i = 0; i < numFighters; i++) {
      const hands = fighterOptions[i] || 1;
      const weapons = Array.from({ length: hands }, () => fallbackW);
      fightersState.push({ hands, weapons });
    }
  }

  const author = localStorage.getItem("author") || "Unknown";
  const dateStr = new Date().toLocaleDateString();

  // wipe table
  table.innerHTML = "";

  // --- compute main columns (excluding left rowNum and right Notes) ---
  let mainCols = 0;
  if (numFighters === 2) {
    // each fighter contributes (hands + 1) (footwork + hands) and there's 1 shared {e}
    mainCols = fighterOptions.reduce((sum, h) => sum + (h + 1), 0) + 1;
  } else {
    // each fighter contributes (footwork + {e} + hands) => (hands + 2)
    mainCols = fighterOptions.reduce((sum, h) => sum + (h + 2), 0);
  }

  const totalCols = 1 + mainCols + 1; // +1 for left rowNum column, +1 for right Notes column

  // --- Header row (Author | Title | Date) ---
  const headerRow = table.insertRow();
  const authorCell = headerRow.insertCell();
  authorCell.innerText = `Author(s): ${author}`;
  authorCell.style.textAlign = "left";
  authorCell.style.borderBottom = "2px solid black";
  authorCell.style.padding = "8px";
  authorCell.contentEditable = "true";

  const titleCell = headerRow.insertCell();
  titleCell.colSpan = totalCols - 2; // 1 cell for author + 1 for date => rest is title
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

  // --- Spacer row ---
  const spacerRow = table.insertRow();
  const spacerCell = spacerRow.insertCell();
  spacerCell.colSpan = totalCols;
  spacerCell.style.height = "6px";
  spacerCell.style.backgroundColor = "#eee";

  // --- Fighter header row (top row of the two-row header area) ---
  const fighterRow = table.insertRow();
  fighterRow.classList.add("header-fighter");

  // Leftmost '#' header cell (spans two header rows)
  const numHead = fighterRow.insertCell();
  numHead.rowSpan = 2;
  numHead.innerText = "#";
  numHead.style.border = "2px solid black";
  numHead.style.textAlign = "center";
  numHead.style.width = "36px";

  if (numFighters === 2) {
    // Fighter 1 block
    const f1 = fighterRow.insertCell();
    f1.colSpan = fighterOptions[0] + 1; // footwork + hands
    f1.innerText = "Combatant 1";
    f1.style.border = "2px solid black";
    f1.style.textAlign = "center";
    f1.contentEditable = "true";

    // Shared {e} column between the two fighters (spans the two header rows)
    const eCell = fighterRow.insertCell();
    eCell.rowSpan = 2;
    eCell.innerText = "{e}";
    eCell.style.border = "2px solid black";
    eCell.style.textAlign = "center";

    // Fighter 2 block
    const f2 = fighterRow.insertCell();
    f2.colSpan = fighterOptions[1] + 1;
    f2.innerText = "Combatant 2";
    f2.style.border = "2px solid black";
    f2.style.textAlign = "center";
    f2.contentEditable = "true";

  } else {
    // 3+ fighters: each fighter block includes footwork + {e} + hands
    for (let i = 0; i < numFighters; i++) {
      const f = fighterRow.insertCell();
      f.colSpan = (fighterOptions[i] || 1) + 2; // footwork + {e} + hands
      f.innerText = `Combatant ${i + 1}`;
      f.style.border = "2px solid black";
      f.style.textAlign = "center";
      f.contentEditable = "true";
    }
  }

  // Rightmost 'Notes' column (spans the two header rows)
  const notesHead = fighterRow.insertCell();
  notesHead.rowSpan = 2;
  notesHead.innerText = "Notes";
  notesHead.style.border = "2px solid black";
  notesHead.style.textAlign = "center";
  notesHead.style.width = "220px";

  // -------------------------
  // --- Sub-header (second header row with Footwork / Hand names / {e} per fighter) ---
  // We'll build a colTypes array so data rows line up with the correct type per column.
  const subHeaderRow = table.insertRow();
  subHeaderRow.classList.add("header-sub");

  const colTypes = []; // e.g. ['rowNum','footwork','hand:sword','e','footwork','hand:shield','notes']

  // always first col is rowNum
  colTypes.push("rowNum");

  // helper: returns normalized weapon token for fighterIndex and handIndex (0-based)
  const getWeaponFor = (fighterIndex, handIndex) => {
    const f = fightersState[fighterIndex];
    if (!f || !Array.isArray(f.weapons)) return null;
    const w = f.weapons[handIndex];
    if (!w) return null;
    return String(w).trim().toLowerCase();
  };

  // helper: display label for hand header, with duplicate numbering if needed
  const prettifyLabel = s => {
    if (!s) return "";
    return s.toString().replace(/_/g, " ").replace(/\b\w/g, ch => ch.toUpperCase());
  };
  const makeHandLabel = (fighterIdx, handIdx) => {
    const f = fightersState[fighterIdx];
    if (!f || !Array.isArray(f.weapons)) return `Hand ${handIdx + 1}`;
    const raw = (f.weapons[handIdx] || "").toString().trim();
    if (!raw) return `Hand ${handIdx + 1}`;
    const token = raw.toLowerCase();
    // count duplicates
    const countSame = f.weapons.filter(x => (x || "").toString().trim().toLowerCase() === token).length;
    const display = prettifyLabel(token);
    if (countSame > 1) {
      // number them (use index among same tokens for better numbering)
      // find the occurrence index among same tokens
      let idx = 0;
      for (let i = 0; i <= handIdx; i++) {
        if ((f.weapons[i] || "").toString().trim().toLowerCase() === token) idx++;
      }
      return `${display} ${idx}`;
    }
    return display;
  };

  if (numFighters === 2) {
    // Fighter 1: Footwork + Hands
    const h1 = fighterOptions[0] || 1;
    // insert subheader cells for Footwork and each hand for fighter 1
    const labels1 = ["Footwork", ...Array.from({ length: h1 }, (_, i) => makeHandLabel(0, i))];
    labels1.forEach((lbl, idx) => {
      const cell = subHeaderRow.insertCell();
      cell.innerText = lbl;
      if (idx === 0) colTypes.push("footwork");
      else {
        const weaponKey = getWeaponFor(0, idx - 1) || (weaponTypes && weaponTypes[0]) || "hand";
        colTypes.push(`hand:${weaponKey}`);
      }
      cell.style.border = "1px solid gray";
      cell.style.textAlign = "center";
      cell.contentEditable = "true";
    });

    // shared {e} column: we DO NOT insert a subHeader cell here because fighterRow already created a cell with rowSpan=2.
    colTypes.push("e");

    // Fighter 2: Footwork + Hands
    const h2 = fighterOptions[1] || 1;
    const labels2 = ["Footwork", ...Array.from({ length: h2 }, (_, i) => makeHandLabel(1, i))];
    labels2.forEach((lbl, idx) => {
      const cell = subHeaderRow.insertCell();
      cell.innerText = lbl;
      if (idx === 0) colTypes.push("footwork");
      else {
        const weaponKey = getWeaponFor(1, idx - 1) || (weaponTypes && weaponTypes[0]) || "hand";
        colTypes.push(`hand:${weaponKey}`);
      }
      cell.style.border = "1px solid gray";
      cell.style.textAlign = "center";
      cell.contentEditable = "true";
    });

  } else {
    // 3+ fighters: each fighter contributes Footwork, {e}, Hand1..HandN
    for (let fi = 0; fi < numFighters; fi++) {
      const hands = fighterOptions[fi] || 1;
      // labels: Footwork, {e}, Hand1..HandN
      const labels = ["Footwork", "{e}", ...Array.from({ length: hands }, (_, i) => makeHandLabel(fi, i))];
      labels.forEach((lbl, idx) => {
        const cell = subHeaderRow.insertCell();
        cell.innerText = lbl;
        if (lbl === "{e}") {
          colTypes.push("e");
        } else if (idx === 0) {
          colTypes.push("footwork");
        } else {
          // hand index is idx - 2 (after Footwork and {e})
          const handIndex = idx - 2;
          const weaponKey = getWeaponFor(fi, handIndex) || (weaponTypes && weaponTypes[0]) || "hand";
          colTypes.push(`hand:${weaponKey}`);
        }
        cell.style.border = "1px solid gray";
        cell.style.textAlign = "center";
        // keep subheaders non-editable for multi-fighter layout if you prefer
        cell.contentEditable = "false";
      });
    }
  }

  // finally append notes column type (Notes header cell already created in fighterRow with rowSpan=2)
  colTypes.push("notes");

  // --- Now create some blank example rows (data area) ---
  const defaultRows = 10;
  for (let r = 0; r < defaultRows; r++) {
    const row = table.insertRow();
    for (let c = 0; c < colTypes.length; c++) {
      const type = colTypes[c];
      const cell = row.insertCell();
      cell.style.border = "1px solid gray";
      cell.style.padding = "6px";
      // data cells should not be contentEditable at the cell level - inputs handle entry
      cell.contentEditable = "false";

      if (type === "rowNum") {
        cell.innerText = r + 1;
        cell.style.textAlign = "center";
        cell.style.fontWeight = "bold";
      } else if (type === "footwork") {
        const wrapper = createDropdown(footworkOptions || []);
        const input = wrapper.querySelector("input[list]");
        if (input) { input.style.width = "100%"; input.style.boxSizing = "border-box"; }
        cell.appendChild(wrapper);
      } else if (type && type.startsWith("hand:")) {
        const weaponKey = type.split(":")[1];
        const options = (weaponOptions && weaponOptions[weaponKey]) ? weaponOptions[weaponKey] : (handOptions || []);
        const wrapper = createDropdown(options);
        const input = wrapper.querySelector("input[list]");
        if (input) { input.style.width = "100%"; input.style.boxSizing = "border-box"; }
        cell.appendChild(wrapper);
      } else if (type === "e") {
        const wrapper = createDropdown(eOptions || []);
        const input = wrapper.querySelector("input[list]");
        if (input) { input.style.width = "100%"; input.style.boxSizing = "border-box"; }
        cell.appendChild(wrapper);
      } else if (type === "notes") {
        cell.contentEditable = "true";
        cell.innerText = "";
        cell.style.textAlign = "left";
      } else {
        cell.innerText = "";
      }
    }
  }
} // end buildSpreadsheet

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
  let filename = prompt("Enter filename for export:", `SPAR_${fightTitle}.xlsx`);
  if (!filename) return;
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

// function getColTypes(table) {
//   // returns full column types array: ['rowNum', ...middleCols..., 'notes']
//   const subIdx = findSubHeaderIndex(table);
//   if (subIdx === -1) return []; // fail safe

//   const subRow = table.rows[subIdx];
//   const middle = [];
//   for (let i = 0; i < subRow.cells.length; i++) {
//     const txt = (subRow.cells[i].textContent || "").trim();
//     if (txt === "" || txt === "{e}") {
//       middle.push("e");
//     } else if (/^Footwork$/i.test(txt)) {
//       middle.push("footwork");
//     } else if (/^Hand\s*\d+/i.test(txt)) {
//       middle.push("hand");
//     } else {
//       // unknown: keep blank cell
//       middle.push("unknown");
//     }
//   }
//   return ["rowNum", ...middle, "notes"];
// }
function getColTypes(table) {
  if (!table || table.rows.length < 3) return [];

  // Grab the subheader row (2nd header row)
  const subHeaderRow = table.rows[3]; // index: 0=header,1=spacer,2=fighterRow,3=subHeader
  const types = ["rowNum"];

  // Two-fighter special case: shared {e} column is not in subheader row
  const numFighters = parseInt(localStorage.getItem("numFighters")) || 2;

  let colIndex = 1; // skip rowNum
  if (numFighters === 2) {
    // Fighter 1 footwork + hands
    const f1Hands = JSON.parse(localStorage.getItem("fighterOptions"))[0] || 1;
    types.push("footwork");
    for (let i = 0; i < f1Hands; i++) types.push("hand");

    // Shared {e}
    types.push("e");

    // Fighter 2 footwork + hands
    const f2Hands = JSON.parse(localStorage.getItem("fighterOptions"))[1] || 1;
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

/* 
build the spreadsheet only after the options are loaded and DOM is ready
*/
document.addEventListener("DOMContentLoaded", async () => {
  await loadOptions();      // wait for .txt files (or fallback)
  buildSpreadsheet();       // now safe to build the table with loaded options
}); // **************************************************************************************

