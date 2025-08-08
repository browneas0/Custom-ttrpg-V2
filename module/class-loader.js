/**
 * Class Loader for Custom TTRPG V2
 * Loads class information from JSON data
 */

export async function preloadClassInfo() {
  try {
    const response = await fetch(`systems/${game.system.id}/data/Classinfo.json`);
    if (!response.ok) {
      throw new Error(`Failed to load class info: ${response.statusText}`);
    }
    
    const classData = await response.json();
    
    // Store in CONFIG for global access
    CONFIG.CustomTTRPG = CONFIG.CustomTTRPG || {};
    CONFIG.CustomTTRPG.ClassInfo = classData;
    
    console.log("CustomTTRPG | Loaded class information:", Object.keys(classData));
    
  } catch (error) {
    console.error("CustomTTRPG | Error loading class info:", error);
    
    // Fallback to basic class data if loading fails
    CONFIG.CustomTTRPG = CONFIG.CustomTTRPG || {};
    CONFIG.CustomTTRPG.ClassInfo = {
      "Monk": {
        "description": "A disciplined warrior who channels inner energy.",
        "baseStats": {
          "Health": 15,
          "STR": 10,
          "DEX": 14,
          "END": 12,
          "WIS": 14,
          "INT": 10,
          "CHA": 8
        }
      },
      "Warlock": {
        "description": "A wielder of dark magic who has made a pact with otherworldly beings.",
        "baseStats": {
          "Health": 12,
          "STR": 8,
          "DEX": 12,
          "END": 10,
          "WIS": 10,
          "INT": 12,
          "CHA": 16
        }
      },
      "Wizard": {
        "description": "A scholarly magic-user capable of manipulating the structures of reality.",
        "baseStats": {
          "Health": 10,
          "STR": 8,
          "DEX": 12,
          "END": 10,
          "WIS": 12,
          "INT": 16,
          "CHA": 10
        }
      },
      "Fighter": {
        "description": "A master of martial combat, skilled with a variety of weapons and armor.",
        "baseStats": {
          "Health": 25,
          "STR": 12,
          "DEX": 10,
          "END": 12,
          "WIS": 8,
          "INT": 8,
          "CHA": 8
        }
      }
    };
  }
}
