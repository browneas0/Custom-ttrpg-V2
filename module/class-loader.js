export async function preloadClassInfo() {
  const path = `systems/${game.system.id}/data/Classinfo.json`;
  try {
    const data = await fetch(path).then(r => r.json());
    CONFIG.CustomTTRPG = { ClassInfo: data };
  } catch (e) {
    ui.notifications.error("Failed loading class data.");
    console.error(e);
  }
}
