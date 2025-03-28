// utils.js
export function createInitialStats(zoneName, existingOromozi = 1000) {
  return { 
    health: 100, 
    thirst: 100, 
    hunger: 100, 
    stamina: 100, 
    oromozi: existingOromozi, 
    currentZone: zoneName || "" 
  };
}

export function initEquippedData(scene) {
  scene.equippedItems = [];
  scene.equippedResist = {};
}

export function recalcEquippedResist(scene) {
  scene.equippedResist = {};
  for (let itemName of scene.equippedItems) {
    const data = getItemData(scene, itemName);
    if (!data || !data.resist) continue;
    for (let key of Object.keys(data.resist)) {
      if (!scene.equippedResist[key]) scene.equippedResist[key] = 0;
      scene.equippedResist[key] += data.resist[key];
    }
  }
}

export function updateHUD(scene) {
  if (!scene.hudText || !scene.playerStats) return;
  const s = scene.playerStats;
  scene.hudText.setText("");
  if (scene.currentZone === "Village") {
    scene.hudText.setText(`OROMOZI: ${s.oromozi}`);
  } else {
    scene.hudText.setText(
      `HEALTH: ${s.health}   STAMINA: ${s.stamina}\nHUNGER: ${s.hunger}   THIRST: ${s.thirst}\nOROMOZI: ${s.oromozi}`
    );
  }
}

export function getItemData(scene, itemName) {
  const lootData = scene.cache.json.get("lootTable");
  if (!lootData || !lootData.zones) return null;
  const zoneKeys = Object.keys(lootData.zones);
  for (let zk of zoneKeys) {
    const itemsArr = lootData.zones[zk];
    if (!itemsArr) continue;
    for (let itemObj of itemsArr) {
      if (itemObj.name === itemName) return itemObj;
    }
  }
  return null;
}

export function getAllLootItems(scene) {
  const lootData = scene.cache.json.get("lootTable");
  if (!lootData || !lootData.zones) return ["Stick"];
  const allItems = new Set();
  Object.keys(lootData.zones).forEach(zone => {
    lootData.zones[zone].forEach(item => allItems.add(item.name));
  });
  return Array.from(allItems);
}

export function getRandomLootForZone(scene) {
  const zoneName = scene.currentZone;
  const lootData = scene.cache.json.get("lootTable");
  if (!lootData || !lootData.zones) return "Stick";
  const zoneItems = lootData.zones[zoneName];
  if (!zoneItems || zoneItems.length === 0) return "Stick";
  const randIndex = Phaser.Math.Between(0, zoneItems.length - 1);
  return zoneItems[randIndex].name || "Stick";
}

export function applyItemEffects(scene, itemData) {
  if (!itemData || !itemData.statEffects) return false;
  let modified = false;
  for (let [stat, value] of Object.entries(itemData.statEffects)) {
    if (scene.playerStats[stat] !== undefined) {
      scene.playerStats[stat] = Math.min(scene.playerStats[stat] + value, 100);
      modified = true;
    }
  }
  return modified;
}

export function applySurvivalTickAndOutcome(scene, outcomeText) {
  if (!scene.playerStats) scene.playerStats = createInitialStats(scene.currentZone);
  scene.playerStats.thirst = Math.max(scene.playerStats.thirst - 7, 0);
  scene.playerStats.hunger = Math.max(scene.playerStats.hunger - 7, 0);
  scene.playerStats.stamina = Math.max(scene.playerStats.stamina - 7, 0);

  const dmgMatch = outcomeText.match(/\(([-+]\d+)\s*Health\)\s*\[type=(\w+)\]/i);
  if (dmgMatch) {
    const dmgRaw = parseInt(dmgMatch[1]);
    const dmgType = dmgMatch[2].toLowerCase();
    let dmgVal = Math.abs(dmgRaw);
    const rVal = scene.equippedResist[dmgType] || 0;
    dmgVal = Math.max(dmgVal - rVal, 0);
    scene.playerStats.health = Math.max(scene.playerStats.health - dmgVal, 0);
  } else {
    const matchHealth = outcomeText.match(/([-+]\d+)\s*Health/i);
    if (matchHealth) {
      scene.playerStats.health = Math.max(scene.playerStats.health + parseInt(matchHealth[1]), 0);
    }
  }

  if (scene.currentZone !== "Village") {
    const { stamina, thirst, hunger, health } = scene.playerStats;
    let healthReduction = 0;
    if (stamina < 15 || thirst < 15 || hunger < 15) {
      healthReduction = 10;
    } else if (stamina < 35 || thirst < 35 || hunger < 35) {
      healthReduction = 5;
    }
    if (healthReduction > 0) {
      scene.playerStats.health = Math.max(health - healthReduction, 0);
      console.log(`Health reduced by ${healthReduction} due to low stats in Scavenger Mode`);
    }
  }
}

export function addToInventory(scene, itemName, quantity = 1) {
  const existingItem = scene.localInventory.find(item => item.name === itemName);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    scene.localInventory.push({ name: itemName, quantity: quantity });
  }
}

export function removeFromInventory(scene, itemName, quantity = 1) {
  const itemIndex = scene.localInventory.findIndex(item => item.name === itemName);
  if (itemIndex !== -1) {
    const item = scene.localInventory[itemIndex];
    item.quantity -= quantity;
    if (item.quantity <= 0) {
      scene.localInventory.splice(itemIndex, 1);
    }
  }
}

export function getInventoryDisplay(scene) {
  return scene.localInventory.map(item => `${item.name} x${item.quantity}`);
}