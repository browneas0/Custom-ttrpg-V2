import { preloadClassInfo } from "./class-loader.js";
import { CustomActor } from "../Actor/Actor.js";

Hooks.once("init", async () => {
  console.log("CustomTTRPG | Initialization");

  // 1) Preload class data
  await preloadClassInfo();

  // 2) Register custom Actor document class
  CONFIG.Actor.documentClass = CustomActor;

  // 3) Preload HTML templates
  await loadTemplates([
    "systems/custom-ttrpg/templates/actors/character-sheet.html"
  ]);

  // 4) Define and register the ActorSheet class
  class CustomTTRPGActorSheet extends ActorSheet {
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        classes: ["custom-ttrpg", "sheet", "actor"],
        template: "systems/custom-ttrpg/templates/actors/character-sheet.html",
        width: 600,
        height: 400
      });
    }
  }
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("custom-ttrpg", CustomTTRPGActorSheet, {
    types: ["character"],
    makeDefault: true
  });
});

Hooks.once("ready", async () => {
  const macroData = [
    { name: "Create Character", type: "script", command: "chooseAndCreateClass();", img: "icons/svg/hands.svg" },
    { name: "Class Info",      type: "script", command: "showClassInfo();",      img: "icons/svg/book.svg" }
  ];
  for (let m of macroData) {
    if (!game.macros.find(x => x.name === m.name)) {
      await Macro.create(m, { displaySheet: false });
    }
  }

  Hooks.on("renderActorDirectory", (app, html) => {
    const createBtn = $(
      `<button class="actor-create" title="New Character">
         <i class="fas fa-user-plus"></i>
       </button>`
    );
    createBtn.click(() => window.chooseAndCreateClass());
    html.closest(".app").find("header .directory-header").append(createBtn);
  });
});
