// SPARconfig.js
class SPARconfig {
  constructor(configData = {}) {
    // Basic metadata
    this.fight_title  = configData.fight_title  || configData.title || "";
    this.fight_author = configData.fight_author || configData.author || "";

    // Normalized: combatants = integer count
    if (typeof configData.combatants === "number") {
      this.combatants = configData.combatants;
    } else if (typeof configData.numFighters === "number") {
      this.combatants = configData.numFighters;
    } else if (Array.isArray(configData.fightersState)) {
      this.combatants = configData.fightersState.length;
    } else {
      this.combatants = Number(localStorage.getItem("numFighters")) || 0;
    }

    // Normalized: fightersState = array of {hands:int, weapons:[]}
    this.fightersState = Array.isArray(configData.fightersState)
      ? configData.fightersState
      : (Array.isArray(configData.fighters) ? configData.fighters : (JSON.parse(localStorage.getItem("fightersState") || "null") || []));

    // guarantee shape: if fightersState is missing but combatants exists, create fallback
    if (!Array.isArray(this.fightersState) || this.fightersState.length < this.combatants) {
      const defaultWeapon = (typeof weaponTypes !== "undefined" && weaponTypes.length) ? weaponTypes[0] : "unarmed";
      const arr = [];
      for (let i = 0; i < this.combatants; i++) {
        const hands = (configData.fightersState && configData.fightersState[i] && configData.fightersState[i].hands)
                      || (configData.fighterOptions && configData.fighterOptions[i]) // older name
                      || 1;
        const weapons = Array.from({ length: hands }, () => defaultWeapon);
        arr.push({ hands, weapons });
      }
      // If fightersState exists but shorter, overlay existing values
      for (let i = 0; i < (configData.fightersState || []).length; i++) {
        arr[i] = { ...arr[i], ...configData.fightersState[i] };
      }
      this.fightersState = arr;
    }

    this.e_name = configData.e_name || configData.eName || "";
  }

  static restore(savedString) {
    const data = JSON.parse(savedString);
    return Object.assign(new SPARconfig(), data);
  }

  // resets the config to blank everything
  reset() {
    localStorage.clear();
    // this.fight_title = "";
    // this.fight_author = "";
    this.combatants = [];
    this.fightersState = [];
    this.e_name = "";
  }
  // Apply a setup object coming from the modal: { numFighters, fightersState }
  updateFromSetup({ numFighters, fightersState }) {
    if (typeof numFighters === "number") {
      this.combatants = numFighters;
      localStorage.setItem("numFighters", String(numFighters));
    }
    if (Array.isArray(fightersState)) {
      this.fightersState = fightersState;
      localStorage.setItem("fightersState", JSON.stringify(fightersState));
    }
    // Persist full config if you want
    localStorage.setItem("SPAR_config", JSON.stringify(this.toJSON()));
  }

  toJSON() {
    return {
      fight_title: this.fight_title,
      fight_author: this.fight_author,
      combatants: this.combatants,
      fightersState: this.fightersState,
      e_name: this.e_name
    };
  }

  // convenience: load saved config
  static loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem("SPAR_config");
      if (!raw) return new SPARconfig({});
      return new SPARconfig(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to load SPAR_config", e);
      return new SPARconfig({});
    }
  }

async loadFromFileData(fileData) {
  try {
    // Only overwrite if present in fileData
    if (fileData.fight_title) {
      this.fight_title = fileData.fight_title;
    }
    if (fileData.fight_author) {
      this.fight_author = fileData.fight_author;
    }
    if (fileData.e_name) {
      this.e_name = fileData.e_name;
    }

    // Combatants → always normalize to fightersState
    if (Array.isArray(fileData.combatants)) {
    this.fightersState = fileData.combatants.map(c => {
        const hands = c.hands || (Array.isArray(c.weapon) ? c.weapon.length : 1);

        let weapons = [];
        if (Array.isArray(c.weapons)) {
        weapons = c.weapons;
        } else if (Array.isArray(c.weapon)) {
        weapons = c.weapon; // ✅ support "weapon": [ ... ]
        } else if (typeof c.weapon === "string") {
        weapons = [c.weapon];
        }

        // Trim or pad to match hand count
        if (weapons.length < hands) {
        const last = weapons[weapons.length - 1] || "sword";
        while (weapons.length < hands) weapons.push(last);
        } else if (weapons.length > hands) {
        weapons = weapons.slice(0, hands);
        }

        return { hands, weapons };
    });
    this.combatants = this.fightersState.length;
    } else if (Array.isArray(fileData.fightersState)) {
    this.fightersState = fileData.fightersState;
    this.combatants = this.fightersState.length;
    } else {
    this.fightersState = [];
    this.combatants = 0;
    }


    // Sync form fields if they exist
    const authorEl = document.getElementById("author");
    const fightTitleEl = document.getElementById("fightTitle");
    if (authorEl && this.fight_author) authorEl.value = this.fight_author;
    if (fightTitleEl && this.fight_title) fightTitleEl.value = this.fight_title;

    console.log("Config loaded successfully:", this);
  } catch (err) {
    console.error("Error loading config:", err);
  }
}

exportConfig(filename) {
  // Use fight_title if no filename was provided
  if (!filename) {
    filename = this.fight_title || "fight_config";
  }

  // Sanitize filename (remove illegal characters for filesystem)
  filename = filename.replace(/[\\\/:*?"<>|]/g, "_");

  // Normalize fightersState → combatants export
  const combatants = (this.fightersState || []).map(f => ({
    hands: f.hands || (f.weapons ? f.weapons.length : 1),
    weapons: Array.isArray(f.weapons) ? f.weapons : []
  }));

  // Convert data to JSON string
  const dataStr = JSON.stringify({
    fight_title: this.fight_title,
    fight_author: this.fight_author,
    combatants, // always an array of {hands, weapons}
    e_name: this.e_name
  }, null, 2);

  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".spar") ? filename : `${filename}.spar`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


  /**
   * Returns a string with all current values (for debugging)
   * @returns {string}
   */
  toDebugString() {
    let result = `Fight Title: ${this.fight_title}\n`;
    result += `Author(s): ${this.fight_author}\n`;
    result += `E Name: ${this.e_name}\n`;
    result += `Combatants (${this.combatants}):\n`;
  
    if (Array.isArray(this.fightersState)) {
      this.fightersState.forEach((f, i) => {
        result += `  - Combatant ${i + 1}: Hands=${f.hands}, Weapons=${f.weapons.join(", ")}\n`;
      });
    } else {
      result += "  (no fightersState data)\n";
    }
  
    return result;
  }

  // ---- Helper methods ----
  getNumCombatants() {
    return this.combatant_num_hands.length;
  }

  getCombatantHands(index) {
    return this.combatant_num_hands[index] || 0;
  }

  setFightTitle(title) {
    this.fight_title = title;
  }

  setFightAuthor(author) {
    this.fight_author = author;
  }

  // Check if the data is essentially empty
  isEmpty() {
    return (
        !this.fight_title.trim() &&
        !this.fight_author.trim() &&
        this.combatants.length === 0 &&
        !this.e_name.trim()
    );
  }
///////
}

