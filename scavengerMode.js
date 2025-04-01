"use strict";

// Constants for Scavenger Mode zones
const SCAVENGER_ZONES = [
  { 
    name: "Outer Grasslands", 
    mapKey: "OuterGrasslandsMap", 
    backgroundKey: "outerGrasslands", 
    foregroundKey: "outerGrasslandsForeground" 
  },
  { 
    name: "Shady Grove", 
    mapKey: "ShadyGroveMap", 
    backgroundKey: "shadyGrove", 
    foregroundKey: "shadyGroveForeground" 
  },
  { 
    name: "Arid Desert", 
    mapKey: "AridDesertMap", 
    backgroundKey: "aridDesert", 
    foregroundKey: "aridDesertForeground" 
  }
];
const BG_SCALE = 0.3;
const PLAYER_SCALE = 2.5;

// Helper functions
function createInitialStats(zoneName, existingOromozi = 1000) {
  return { 
    health: 100, 
    thirst: 100, 
    hunger: 100, 
    stamina: 100, 
    oromozi: existingOromozi, 
    currentZone: zoneName 
  };
}

function updateHUD(scene) {
  if (!scene.hudText || !scene.playerStats) return;
  const s = scene.playerStats;
  const gameTime = scene.registry.get("gameTime") || 0;
  const totalMinutes = Math.floor(gameTime / 1000);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  scene.hudText.setText(
    `OROMOZI: ${s.oromozi} | Health: ${s.health} | Time: ${displayHours}:${minutes < 10 ? "0" : ""}${minutes} ${period}`
  );
}

function showDialog(scene, text) {
  const boxW = 220, boxH = 150;
  const boxX = (scene.game.config.width - boxW) / 2;
  const boxY = (scene.game.config.height - boxH) / 2;
  scene.dialogBg.clear();
  scene.dialogBg.fillStyle(0x000000, 0.8);
  scene.dialogBg.fillRect(boxX, boxY, boxW, boxH);
  scene.dialogText.setPosition(boxX + 10, boxY + 10);
  scene.dialogText.setText(text);
  scene.dialogBg.setVisible(true);
  scene.dialogText.setVisible(true);
  scene.dialogBg.setScrollFactor(0);
  scene.dialogText.setScrollFactor(0);
}

function hideDialog(scene) {
  scene.dialogBg.clear();
  scene.dialogBg.setVisible(false);
  scene.dialogText.setVisible(false);
  updateHUD(scene);
}

// Preload function
function preloadScavengerMode() {
  SCAVENGER_ZONES.forEach(zone => {
    this.load.json(zone.mapKey, `assets/maps/${zone.mapKey}.json`);
    this.load.image(zone.backgroundKey, `assets/backgrounds/${zone.backgroundKey}.png`);
    if (zone.foregroundKey) 
      this.load.image(zone.foregroundKey, `assets/foregrounds/${zone.foregroundKey}.png`);
  });
  this.load.spritesheet("player", "assets/sprites/player.png", { frameWidth: 48, frameHeight: 48 });
}

// Create function
function createScavengerMode(data) {
  const zoneData = data.zone || SCAVENGER_ZONES[0];
  this.playerStats = data.playerStats || createInitialStats(zoneData.name);
  this.localInventory = data.inventory || [{ name: "Bread", quantity: 1 }];

  // Background setup
  this.background = this.add.image(0, 0, zoneData.backgroundKey)
    .setOrigin(0, 0)
    .setScale(BG_SCALE);
  this.physics.world.setBounds(0, 0, this.background.displayWidth, this.background.displayHeight);
  this.cameras.main.setBounds(0, 0, this.background.displayWidth, this.background.displayHeight);

  // Add test fishing spot interactable
  const fishingSpot = this.add.rectangle(
    Phaser.Math.Between(100, this.background.displayWidth - 100),
    Phaser.Math.Between(100, this.background.displayHeight - 100),
    32, 32, 0x00ff00, 0.5
  );
  fishingSpot.setInteractive({ useHandCursor: true });
  fishingSpot.on('pointerdown', () => {
    console.log('Fishing spot clicked, transitioning to FishingScene');
    this.scene.start('FishingScene', {
      inventory: this.localInventory,
      playerStats: this.playerStats,
      zone: zoneData
    });
  });

  // Add visual indicator for the fishing spot
  const fishingIcon = this.add.text(
    fishingSpot.x,
    fishingSpot.y - 20,
    '🎣',
    { fontSize: '24px' }
  ).setOrigin(0.5);

  // Foreground layer
  const mapData = this.cache.json.get(zoneData.mapKey);
  if (mapData?.layers) {
    mapData.layers.forEach(layer => {
      if (layer.type === "imagelayer" && layer.name.toLowerCase() === zoneData.foregroundKey.toLowerCase()) {
        this.add.image(0, 0, zoneData.foregroundKey)
          .setOrigin(0, 0)
          .setScale(BG_SCALE);
      }
    });
  }

  // Player setup
  this.player = this.physics.add.sprite(100 * BG_SCALE, 100 * BG_SCALE, "player")
    .setScale(PLAYER_SCALE * 0.5);
  this.player.setCollideWorldBounds(true);
  this.cameras.main.startFollow(this.player);
  this.cameras.main.setZoom(2);

  // HUD and dialog setup
  this.hudText = this.add.text(10, this.game.config.height - 20, "", { 
    font: "16px Arial", 
    fill: "#ffffff" 
  }).setScrollFactor(0);
  this.dialogBg = this.add.graphics().setVisible(false);
  this.dialogText = this.add.text(0, 0, "", { 
    font: "12px Arial", 
    fill: "#ffffff", 
    wordWrap: { width: 200 } 
  }).setVisible(false);

  // Keyboard controls
  this.cursors = this.input.keyboard.createCursorKeys();

  updateHUD(this);
}

// Update function
function updateScavengerMode(time, delta) {
  // Update game time
  let gameTime = this.registry.get("gameTime") || 0;
  gameTime += delta;
  this.registry.set("gameTime", gameTime);

  // Player movement
  const speed = 100;
  this.player.setVelocity(0);
  if (this.cursors.left.isDown) this.player.setVelocityX(-speed);
  else if (this.cursors.right.isDown) this.player.setVelocityX(speed);
  if (this.cursors.up.isDown) this.player.setVelocityY(-speed);
  else if (this.cursors.down.isDown) this.player.setVelocityY(speed);

  // Zone switching and scene transition
  const keys = this.input.keyboard.addKeys({ z: "Z", space: "SPACE" });
  if (Phaser.Input.Keyboard.JustDown(keys.z)) {
    const currentZoneIndex = SCAVENGER_ZONES.findIndex(z => z.name === this.playerStats.currentZone);
    const newZoneIndex = (currentZoneIndex + 1) % SCAVENGER_ZONES.length;
    this.playerStats.currentZone = SCAVENGER_ZONES[newZoneIndex].name;
    this.scene.restart({ 
      zone: SCAVENGER_ZONES[newZoneIndex], 
      inventory: this.localInventory, 
      playerStats: this.playerStats 
    });
  }
  if (Phaser.Input.Keyboard.JustDown(keys.space)) {
    showDialog(this, "Return to Village?\n(Press SPACE again to confirm)");
    this.input.keyboard.once("keydown-SPACE", () => {
      this.scene.start("VillageCommonsScene", {
        zone: { 
          name: "Village", 
          mapKey: "villageCommonsMap", 
          backgroundKey: "villageCommons", 
          foregroundKey: "" 
        },
        inventory: this.localInventory,
        playerStats: createInitialStats("Village", this.playerStats.oromozi)
      });
    });
  }

  updateHUD(this);
}