/* 
------------------------------------
index.js


------------------------------------
*/

// make sure to have a generic config
// if (!window.SPARconfig) {
//   window.SPARconfig = {
//     fight_title: "",
//     fight_author: "",
//     e_name: "",
//     fightersState: [
//       { hands: 1, weapons: ["sword"] },
//       { hands: 1, weapons: ["sword"] }
//     ]
//   };
//   // updateInfoBoxText(window.SPARconfig.toDebugString());
// }


// ensure a weaponTypes array is defined in index.js (top-level)
const weaponTypes = ["sword", "shield", "unarmed", "staff"];

// DOM Loaded Listener 
window.addEventListener("DOMContentLoaded", () => {
  loadPresets();
  // document.getElementById("buildBtn").addEventListener("click", goToSpreadsheet);

  // localStorage.clear(); // ensures a clean state
  localStorage.removeItem("SPAR_config");
  if (!window.SPARconfig) window.SPARconfig = {};
});

// Author Listener
document.getElementById("author").addEventListener("input", (e) => {
  const newValue = e.target.value;
  if (window.SPARconfig.fight_author !== newValue) {
    window.SPARconfig.setFightAuthor(newValue);
    updateInfoBoxTextFromConfig(window.SPARconfig);
  }
});

// Title Listener
document.getElementById("fightTitle").addEventListener("input", (e) => {
  const newValue = e.target.value;
  if (window.SPARconfig.fight_title !== newValue) {
    window.SPARconfig.setFightTitle(newValue);
    updateInfoBoxTextFromConfig(window.SPARconfig);
  }
});

/* *************************** INPUT BUTTON ROW *************************** */
// PRESET CONFIG
async function loadPresets() {
  try {
    const response = await fetch("configs/index.json");
    const files = await response.json();

    const select = document.getElementById("presetSelect");
    select.innerHTML = `<option value="">-- Presets --</option>`; // reset menu

    for (const file of files) {
      const option = document.createElement("option");
      option.value = file;
      option.textContent = file.replace(/\.spar$/, ""); // clean name
      select.appendChild(option);
    }

    // --- add the listener only once ---
    select.addEventListener("change", async (event) => {
      const filename = event.target.value;

      // 🧹 if user reselects "-- Presets --" (blank)
      if (!filename) {
        if (window.SPARconfig && typeof window.SPARconfig.reset === "function") {
          window.SPARconfig.reset();  // clear config to defaults
          // alert("cleared?");
        } else {
          // fallback: clear manually if reset() not implemented
          window.SPARconfig = new SPARconfig();
        }
        updateInfoBoxTextFromConfig(window.SPARconfig);
        console.log("SPAR configuration reset to blank.");
        return;
      }

      // 🧩 otherwise, load the chosen preset file
      const res = await fetch(`configs/${filename}`);
      const fileData = await res.json();

      if (window.SPARconfig && typeof window.SPARconfig.loadFromFileData === "function") {
        window.SPARconfig.loadFromFileData(fileData);

        // Reset temp fighters so custom modal pulls from real config
        window._currentTemporaryFighters = null;

        updateInfoBoxTextFromConfig(window.SPARconfig);
        console.log("Loaded preset:", filename);
      }
    });
  } catch (err) {
    console.error("Error loading presets:", err);
    alert("Error loading presets list.");
  }
}

// CUSTOM CONFIG
document.getElementById("customBtn").addEventListener("click", () => {
  const modal = document.getElementById("customModal");
  const dropdown = document.getElementById("numFightersDropdown");

  const cfg = window.SPARconfig || {};
  const fightersState = Array.isArray(cfg.fightersState) ? cfg.fightersState : [];

  // default to config length or 2
  const numFighters = fightersState.length || 2;
  dropdown.value = numFighters;

  // ✅ Use temporary fighters if they exist, otherwise fall back to config
  renderCombatantBlocks(window._currentTemporaryFighters || fightersState);

  modal.style.display = "block";
});

// CUSTUM --> helper (...)
document.getElementById("numFightersDropdown").addEventListener("change", onNumFightersChanged);
function onNumFightersChanged() {
    const existingState = [];

    const currentCount = document.querySelectorAll(".combatant-block").length;
    for (let i = 0; i < currentCount; i++) {
        const hands = parseInt(document.getElementById(`fighter${i+1}Hands`).value);
        const weapons = [];

        for (let h = 0; h < hands; h++) {
            const wSel = document.getElementById(`fighter${i+1}Hand${h+1}Weapon`);
            weapons.push(wSel ? wSel.value : "sword");
        }

        existingState.push({ hands, weapons });
    }

    // Save temporarily
    window._currentTemporaryFighters = existingState;

    // Re-render using whichever state is best
    renderCombatantBlocks(window._currentTemporaryFighters);
}

// CUSTUM --> helper
// CUSTOM PAGE --> close 
function closeCustomModal() {
  const modal = document.getElementById("customModal");
  modal.style.display = "none";
}

// CUSTOM PAGE --> 
function confirmCustomSetup() {
  const numFighters = parseInt(document.getElementById("numFightersDropdown").value);
  const fightersState = [];

  for (let i = 0; i < numFighters; i++) {
    const hands = parseInt(document.getElementById(`fighter${i + 1}Hands`).value);
    const weapons = [];
    for (let h = 0; h < hands; h++) {
      const wSel = document.getElementById(`fighter${i + 1}Hand${h + 1}Weapon`);
      weapons.push(wSel ? wSel.value : "");
    }
    fightersState.push({ hands, weapons });
  }

  // Update global config
  if (!window.SPARconfig) window.SPARconfig = {};
  window.SPARconfig.fightersState = fightersState;
  window.SPARconfig.combatants = numFighters;

  document.getElementById("presetSelect").value = ""; // reset "preset" drop

  // Update info box or visual feedback
  // updateInfoBoxText(window.SPARconfig.toDebugString ? window.SPARconfig.toDebugString() : JSON.stringify(window.SPARconfig, null, 2));
  updateInfoBoxTextFromConfig(window.SPARconfig);

  closeCustomModal();
}

// CUSTOM PAGE --> build from config
function renderCombatantBlocks(existing = []) {
  const container = document.getElementById("combatantsContainer");
  const numFighters = parseInt(document.getElementById("numFightersDropdown").value, 10) || 2;
  container.innerHTML = "";

  // STEP 1 — Build a preserved list
  const fighters = [];

  for (let i = 0; i < numFighters; i++) {
    if (existing[i]) {
      // Preserve exactly what existed
      fighters.push({
        hands: existing[i].hands,
        weapons: [...existing[i].weapons]
      });
    } else {
      // Add new default fighter at the end
      fighters.push({
        hands: 1,
        weapons: ["sword"]
      });
    }
  }

  // STEP 2 — Render UI
  for (let i = 0; i < fighters.length; i++) {
    const fighter = fighters[i];
    const block = document.createElement("div");
    block.className = "combatant-block";

    const label = document.createElement("div");
    label.className = "combatant-label";
    label.textContent = `Combatant ${i + 1}`;
    block.appendChild(label);

    // HAND COUNT SELECT
    const handsSelect = document.createElement("select");
    handsSelect.id = `fighter${i + 1}Hands`;

    for (let h = 1; h <= 4; h++) {
      const opt = document.createElement("option");
      opt.value = h;
      opt.textContent = `${h} hand${h > 1 ? "s" : ""}`;
      handsSelect.appendChild(opt);
    }
    handsSelect.value = fighter.hands;
    block.appendChild(handsSelect);

    // WEAPONS COLUMN
    const handsCol = document.createElement("div");
    handsCol.className = "hands-column";

    function renderHands() {
      handsCol.innerHTML = "";
      for (let h = 0; h < fighter.hands; h++) {
        const wSel = document.createElement("select");
        wSel.id = `fighter${i + 1}Hand${h + 1}Weapon`;

        for (const w of weaponTypes) {
          const opt = document.createElement("option");
          opt.value = w;
          opt.textContent = w.charAt(0).toUpperCase() + w.slice(1);
          wSel.appendChild(opt);
        }

        // Preserve weapon if it exists
        if (fighter.weapons[h]) {
          wSel.value = fighter.weapons[h];
        } else {
          // New hand → default sword
          wSel.value = "sword";
          fighter.weapons[h] = "sword";
        }

        // Keep data updated when user changes weapon
        wSel.addEventListener("change", () => {
          fighter.weapons[h] = wSel.value;
        });

        handsCol.appendChild(wSel);
      }
    }

    renderHands();

    // CHANGING HANDS → PRESERVE EXISTING WEAPONS
    handsSelect.addEventListener("change", () => {
      const oldHands = fighter.hands;
      const newHands = parseInt(handsSelect.value);

      fighter.hands = newHands;

      if (newHands < oldHands) {
        // shrink array (remove from end)
        fighter.weapons = fighter.weapons.slice(0, newHands);
      } else {
        // add new hands with default weapons
        while (fighter.weapons.length < newHands) {
          fighter.weapons.push("sword");
        }
      }

      renderHands();
    });

    block.appendChild(handsCol);
    container.appendChild(block);
  }

  // Save the updated fighters internally so the next call preserves them
  window._currentTemporaryFighters = fighters;
}

// IMPORT CONFIG
document.getElementById("importConfigBtn").addEventListener("click", async () => {
  // document.getElementById("importFile").click();
  // alert("Open import.");
  document.getElementById("importFile").click();
});

// IMPORT CONFIG --> helper
document.getElementById("importFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    await window.SPARconfig.loadFromFileData(data);
    updateInfoBoxTextFromConfig(window.SPARconfig);
  } catch (err) {
    alert("Error reading file:", err);
  }

  // Reset so selecting the same file again works
  event.target.value = "";
});
/* **************** INPUT BUTTON ROW END **************** */


/* **************************** DISPLAY CONFIG **************************** */
function updateInfoBoxTextFromConfig(cfg) {
  const box = document.getElementById("configInfo");
  box.innerHTML = ""; // clear it

  if (!cfg || !cfg.fightersState) return;

  cfg.fightersState.forEach((fighter, i) => {
    const card = document.createElement("div");
    card.className = "config-combatant";

    const title = document.createElement("div");
    title.className = "config-combatant-title";
    title.textContent = `Combatant ${i + 1}`;

    const weaponsLine = document.createElement("div");
    weaponsLine.className = "config-combatant-weapons";
    weaponsLine.textContent = fighter.weapons.join(", ");

    card.appendChild(title);
    card.appendChild(weaponsLine);

    box.appendChild(card);
  });
}
/* **************** END DISPLAY CONFIG **************** */


/* *************************** OUTPUT BUTTON ROW *************************** */
document.getElementById("exportConfigBtn").addEventListener("click", () => {
  let defaultName = window.SPARconfig.fight_title || "fight_config";
  defaultName = defaultName.replace(/[\\\/:*?"<>|]/g, "_");

  const userFilename = prompt(
    "Enter filename for export:",
    `${defaultName}.spar`
  );

  if (userFilename) {
    window.SPARconfig.exportConfig(userFilename);
  }
});

document.getElementById("buildBtn").addEventListener("click", () => {
  if (!window.SPARconfig || !window.SPARconfig.fightersState?.length) {
    alert("Please complete your fight setup before continuing.");
    return;
  }

  localStorage.setItem("SPARconfig", JSON.stringify(window.SPARconfig));
  window.location.href = "spreadsheet.html";
});

document.getElementById("importFightBtn").addEventListener("click", () => {
  alert("Feature in progress, coming soon..."); // TODO: implement fight import functionality
});
/* *************** OUTPUT BUTTON ROW END *************** */


