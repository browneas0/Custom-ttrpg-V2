import { preloadClassInfo } from "./class-loader.js";
import {
  registerMacros,
  chooseAndCreateClass,
  openClassMenu,
  openSpellsMenu,
  openInventoryMenu,
  openFeatsMenu,
  openSubclassMenu
} from "./macros.js";
import { CharacterSheet } from "./sheets/character-sheet.js";
import { ResetSettingsApp } from "./applications/reset-settings.js";
import { SpellManager } from "./applications/spell-manager.js";
import { InventoryManager } from "./applications/inventory-manager.js";
import { CustomActor } from "../Actor/Actor.js";

Hooks.once("init", async () => {
  console.log("CustomTTRPG | init - V2 Professional Edition");

  game.settings.register("custom-ttrpg","hpMultiplier", {
    name: "HP Multiplier", hint: "END × multiplier added to base Health",
    scope: "world", config: true, type: Number, default: 2
  });
  game.settings.register("custom-ttrpg","showWelcome", {
    name: "Show Quickstart Guide", hint: "Display guide on load",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.registerMenu("custom-ttrpg","resetSettings", {
    name: "Reset Settings", label: "Reset to Defaults",
    icon: "fas fa-undo", type: ResetSettingsApp, restricted: true
  });

  await preloadClassInfo();

  // Load templates - Fixed partial registration
  await loadTemplates({
    "attribute-row": `systems/${game.system.id}/templates/partials/attribute-row.html`,
    "class-menu": `systems/${game.system.id}/templates/partials/class-menu.html`,
    "spells-menu": `systems/${game.system.id}/templates/partials/spells-menu.html`,
    "inventory-menu": `systems/${game.system.id}/templates/partials/inventory-menu.html`,
    "class-info-window": `systems/${game.system.id}/templates/partials/class-info-window.html`,
    "reset-settings": `systems/${game.system.id}/templates/partials/reset-settings.html`
  });

  // Document class override
  CONFIG.Actor.documentClass = CustomActor;
  
  // Register sheet classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("custom-ttrpg", CharacterSheet, {
    types: ["character"],
    makeDefault: true
  });
});

Hooks.once("ready", async () => {
  console.log("CustomTTRPG | ready - V2 Professional Edition");
  await registerMacros();

  // Actor Directory header buttons - Fixed with proper null checks
  Hooks.on("renderActorDirectory", (app, html) => {
    // Add safety checks to prevent null errors
    if (!html || !html.length) return;
    
    const headerElement = html.find(".directory-header");
    if (!headerElement || !headerElement.length) return;
    
    if (headerElement.find(".ctt-class-btn").length) return; // Already added
    
    const buttons = [
      {cls:"ctt-class-btn",title:"Class Menu",icon:"fas fa-users",action:openClassMenu},
      {cls:"ctt-spells-btn",title:"Spells Menu",icon:"fas fa-hat-wizard",action:openSpellsMenu},
      {cls:"ctt-inv-btn",title:"Inventory",icon:"fas fa-boxes",action:openInventoryMenu},
      {cls:"ctt-create-btn",title:"Create Actor",icon:"fas fa-user-plus",action:chooseAndCreateClass}
    ];
    
    for (let b of buttons) {
      const btn = $(`<button class="ctt-btn ${b.cls}" title="${b.title}"><i class="${b.icon}"></i></button>`);
      btn.on("click", () => b.action());
      headerElement.append(btn);
    }
  });

  // Global hotkey fallback listener
  window.addEventListener("keydown", event => {
    const t = event.target;
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
    switch (event.key.toLowerCase()) {
      case "c": return openClassMenu();
      case "s": return openSpellsMenu();
      case "i": return openInventoryMenu();
      case "f": return openFeatsMenu();
      case "u": return openSubclassMenu();
    }
  });
});
