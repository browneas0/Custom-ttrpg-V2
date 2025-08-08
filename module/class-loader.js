/**
 * Class information loader for Custom TTRPG V2
 * Dynamically loads class data from JSON configuration
 */
export async function preloadClassInfo() {
  const path = `systems/${game.system.id}/data/Classinfo.json`;
  try {
    console.log(`CustomTTRPG | Loading class data from ${path}`);
    const data = await fetch(path).then(r => r.json());
    CONFIG.CustomTTRPG = { ClassInfo: data };
    console.log(`CustomTTRPG | Successfully loaded ${Object.keys(data).length} classes:`, Object.keys(data));
  } catch (e) {
    ui.notifications.error("Failed loading class data. Check console for details.");
    console.error("CustomTTRPG | Error loading class data:", e);
    // Initialize with empty object to prevent errors
    CONFIG.CustomTTRPG = { ClassInfo: {} };
  }
}
