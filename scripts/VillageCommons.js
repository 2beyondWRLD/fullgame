// scenes/VillageCommons.js
import Phaser from 'phaser';
import { zoneList, SCREEN_STATES, SCALES } from '../constants.js';
import * as Utils from '../utils.js';
import * as Blockchain from '../blockchain.js';
import * as Narrative from '../narrative.js';
import { handleVillageContractInteraction } from '../uiModules.js';

export default class VillageCommons extends Phaser.Scene {
  constructor() {
    super('VillageCommons');
  }

  preload() {
    this.load.json("OuterGrasslandsMap", "assets/maps/outerGrasslands.json");
    this.load.json("ShadyGroveMap", "assets/maps/shadyGrove.json");
    this.load.json("AridDesertMap", "assets/maps/aridDesert.json");
    this.load.json("villageCommonsMap", "assets/maps/villageCommonsMap.json");

    this.load.image("outerGrasslands", "assets/backgrounds/outerGrasslands.png");
    this.load.image("shadyGrove", "assets/backgrounds/shadyGrove.png");
    this.load.image("aridDesert", "assets/backgrounds/aridDesert.png");
    this.load.image("villageCommons", "assets/backgrounds/villageCommons.png");
    this.load.image("outerGrasslandsForeground", "assets/foregrounds/outerGrasslandsForeground.png");
    this.load.image("shadyGroveForeground", "assets/foregrounds/shadyGroveForeground.png");
    this.load.image("aridDesertForeground", "assets/foregrounds/aridDesertForeground.png");

    this.load.spritesheet("player", "assets/sprites/player.png", {
      frameWidth: 48,
      frameHeight: 48,
      margin: 0,
      spacing: 0
    });

    this.load.image("exclamation", "assets/sprites/exclamation.png");

    this.load.json("narrativePrologues", "assets/data/narrativePrologues.json");
    this.load.json("narrativePrompts", "assets/data/narrativeprompt.json");
    this.load.json("lootTable", "assets/data/lootTable.json");
  }

  async create() {
    let defaultZone = zoneList.find(z => z.name === "Village");
    if (!this.scene.settings.data || !this.scene.settings.data.zone) {
      this.scene.settings.data = {
        zone: defaultZone,
        inventory: [
          { name: "Bread", quantity: 1 },
          { name: "Water", quantity: 1 },
          { name: "Iron Sword", quantity: 1 },
          { name: "Wooden Armor", quantity: 1 },
          { name: "Healing Medicine", quantity: 1 }
        ],
        promptCount: 0
      };
      console.log("Defaulting zone to Village with preloaded loot items.");
    }

    if (this.scene.settings.data.zone.name !== "Village") {
      await Blockchain.connectWallet();
      await Blockchain.initOnChain(this);
    } else {
      console.log("Skipping wallet and on-chain init for Village Commons.");
      Blockchain.walletPublicKey = "SIMULATED_WALLET";
    }

    const existingOromozi = this.playerStats ? this.playerStats.oromozi : 1000;
    if (!this.playerStats) this.playerStats = Utils.createInitialStats(this.scene.settings.data.zone.name, existingOromozi);
    this.localInventory = this.scene.settings.data.inventory || [];
    this.promptCount = this.scene.settings.data.promptCount || 0;
    this.deposits = this.deposits || [];
    this.listedItems = this.listedItems || [];
    this.tradeListings = this.tradeListings || [];
    Utils.initEquippedData(this);

    if (this.scene.settings.data.zone.name !== "Village" && !this.initialScavengerInventory) {
      this.initialScavengerInventory = JSON.parse(JSON.stringify(this.localInventory));
      this.lastInventoryState = JSON.parse(JSON.stringify(this.localInventory));
      console.log("Initial Scavenger Mode inventory set:", this.initialScavengerInventory);
    }

    let zoneData = this.scene.settings.data.zone || zoneList[0];
    this.currentZone = zoneData.name;
    this.playerStats.currentZone = this.currentZone;

    this.background = this.add.image(0, 0, zoneData.backgroundKey).setOrigin(0, 0).setScale(SCALES.bgScale);
    this.physics.world.setBounds(0, 0, this.background.displayWidth, this.background.displayHeight);
    this.cameras.main.setBounds(0, 0, this.background.displayWidth, this.background.displayHeight);

    this.obstacles = this.physics.add.staticGroup();

    if (zoneData.name === "Village") {
      this.interactionObjects = this.physics.add.staticGroup();
      this.exclamations = this.physics.add.group({ immovable: true, allowGravity: false });
      const mapData = this.cache.json.get(zoneData.mapKey);
      if (mapData && mapData.layers) {
        mapData.layers.forEach(layer => {
          if (layer.type === "objectgroup" && layer.name === "Object Layer 1") {
            const offsetX = layer.offsetx || 0;
            const offsetY = layer.offsety || 0;
            layer.objects.forEach(obj => {
              const rect = this.add.rectangle(
                (obj.x + offsetX) * SCALES.bgScale,
                (obj.y + offsetY) * SCALES.bgScale,
                obj.width * SCALES.bgScale,
                obj.height * SCALES.bgScale,
                0xff0000,
                0
              );
              rect.setOrigin(0, 0);
              this.physics.add.existing(rect, true);
              this.obstacles.add(rect);
            });
          } else if (layer.type === "objectgroup" && layer.name.toLowerCase() === "interactions") {
            layer.objects.forEach(obj => {
              const interactiveObj = this.add.rectangle(
                obj.x * SCALES.bgScale,
                obj.y * SCALES.bgScale,
                obj.width * SCALES.bgScale,
                obj.height * SCALES.bgScale,
                0x00ff00,
                0
              );
              interactiveObj.setOrigin(0, 0);
              this.physics.add.existing(interactiveObj, true);
              interactiveObj.body.enable = false;
              interactiveObj.setInteractive();
              interactiveObj.on("pointerdown", () => handleVillageContractInteraction(this, obj));
              this.interactionObjects.add(interactiveObj);
            });
          }
        });
      }
    } else {
      const mapData = this.cache.json.get(zoneData.mapKey);
      if (mapData) {
        mapData.layers.forEach(layer => {
          if (layer.type === "objectgroup" && layer.name === "Object Layer 1") {
            layer.objects.forEach(obj => {
              const rect = this.add.rectangle(
                obj.x * SCALES.bgScale,
                obj.y * SCALES.bgScale,
                obj.width * SCALES.bgScale,
                obj.height * SCALES.bgScale,
                0xff0000,
                0
              );
              rect.setOrigin(0, 0);
              this.physics.add.existing(rect, true);
              this.obstacles.add(rect);
            });
          } else if (layer.type === "imagelayer" && layer.name.toLowerCase() === zoneData.foregroundKey.toLowerCase()) {
            const offX = layer.x || 0;
            const offY = layer.y || 0;
            this.foreground = this.add.image(offX * SCALES.bgScale, offY * SCALES.bgScale, zoneData.foregroundKey)
              .setOrigin(0, 0)
              .setScale(SCALES.bgScale);
            this.foreground.setDepth(1000);
          }
        });
      }
    }

    this.player = this.physics.add.sprite(100 * SCALES.bgScale, 100 * SCALES.bgScale, "player");
    this.player.setScale(SCALES.playerScale * 0.5);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(2000);
    this.player.body.setSize(16, 16);
    this.player.body.setOffset(16, 16);

    // Updated animation creation to use the correct 'player' key
    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNumbers("player", { start: 18, end: 20 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNumbers("player", { start: 24, end: 26 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("player", { start: 6, end: 8 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("player", { start: 12, end: 14 }),
      frameRate: 10,
      repeat: -1
    });
    // Add a safety check before playing the animation
    if (this.anims.get("walk-down")) {
      this.player.anims.play("walk-down", true);
    } else {
      console.warn("Animation 'walk-down' not found! Check spritesheet loading.");
    }

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(2);

    const cam = this.cameras.main;
    const visibleWidth = cam.width / cam.zoom;
    const visibleHeight = cam.height / cam.zoom;
    const frameX = (this.game.config.width - visibleWidth) / 2;
    const frameY = (this.game.config.height - visibleHeight) / 2;
    this.frameRect = new Phaser.Geom.Rectangle(frameX, frameY, visibleWidth, visibleHeight);
    this.frame = this.add.graphics();
    this.frame.lineStyle(4, 0xffffff, 1);
    this.frame.strokeRect(frameX, frameY, visibleWidth, visibleHeight);
    this.frame.setScrollFactor(0);
    this.frame.setDepth(10000);
    this.hudText = this.add.text(frameX + 10, frameY + visibleHeight - 10, "", {
      font: "16px Arial",
      fill: "#ffffff"
    });
    this.hudText.setOrigin(0, 1);
    this.hudText.setScrollFactor(0);
    this.hudText.setDepth(11000);

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      interact: Phaser.Input.Keyboard.KeyCodes.I,
      z: Phaser.Input.Keyboard.KeyCodes.Z,
      v: Phaser.Input.Keyboard.KeyCodes.V
    });
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    if (zoneData.name !== "Village") {
      this.exclamations = this.physics.add.group({ immovable: true, allowGravity: false });
    }

    this.narrativePrologues = this.cache.json.get("narrativePrologues");
    this.narrativeData = this.cache.json.get("narrativePrompts");

    this.dialogBg = this.add.graphics();
    this.dialogBg.setDepth(1000);
    this.dialogBg.setVisible(false);
    this.dialogText = this.add.text(0, 0, "", {
      font: "12px Arial",
      fill: "#ffffff",
      wordWrap: { width: 200 }
    });
    this.dialogText.setDepth(1001);
    this.dialogText.setVisible(false);
    this.buttons = [];
    this.narrativeScreen = SCREEN_STATES.NONE;
    this.activePrompt = null;
    this.chosenOptionIndex = -1;

    if (this.obstacles && this.obstacles.getLength() > 0) {
      this.physics.add.collider(this.player, this.obstacles);
    }

    Utils.updateHUD(this);

    if (this.currentZone !== "Village" && this.exclamations) {
      spawnMultipleExclamations(this, 6);
      this.time.addEvent({
        delay: 10000,
        callback: () => spawnMultipleExclamations(this, 1),
        loop: true
      });
    }
  }

  update() {
    if (!this.player || !this.player.body) return;

    if (this.playerStats && this.playerStats.health <= 0 && this.currentZone !== "Village" && this.narrativeScreen !== SCREEN_STATES.NONE) {
      console.log("Player died in Scavenger Mode!");
      this.narrativeScreen = SCREEN_STATES.NONE;
      Narrative.showDialog(this, "You have died!\nYou wake up in Village Commons...");
      this.time.delayedCall(2000, () => {
        this.cameras.main.fadeOut(1000, 0, 0, 0, (camera, progress) => {
          if (progress === 1) {
            const villageZone = zoneList.find(z => z.name === "Village");
            this.localInventory = JSON.parse(JSON.stringify(this.initialScavengerInventory));
            this.playerStats = Utils.createInitialStats(villageZone.name, this.playerStats.oromozi);
            this.scene.restart({ zone: villageZone, inventory: this.localInventory, promptCount: 0 });
            this.cameras.main.once('camerafadeincomplete', () => {
              console.log("Player respawned in Village Commons with initial inventory:", this.localInventory);
              Narrative.hideDialog(this);
            });
            this.cameras.main.fadeIn(1000, 0, 0, 0);
          }
        });
      });
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.z)) {
      let currentZoneIndex = zoneList.findIndex(z => z.name === this.currentZone);
      currentZoneIndex = (currentZoneIndex + 1) % zoneList.length;
      this.scene.restart({ zone: zoneList[currentZoneIndex], inventory: this.localInventory, promptCount: this.promptCount });
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.v)) {
      console.log("Simulated deposit of local inventory on chain...");
      Blockchain.depositOnChain(this);
      return;
    }
    if (this.foreground) {
      const overlapsForeground = Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.foreground.getBounds());
      if (overlapsForeground) {
        this.player.setDepth(this.foreground.depth - 1);
      } else {
        this.player.setDepth(this.foreground.depth + 1);
      }
    }

    if (this.narrativeScreen >= SCREEN_STATES.LIQUIDITY) {
      this.player.setVelocity(0);
      this.player.anims.stop();
      return;
    }

    switch (this.narrativeScreen) {
      case SCREEN_STATES.PROLOGUE:
      case SCREEN_STATES.PROMPT:
        this.player.setVelocity(0);
        this.player.anims.stop();
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
          if (this.narrativeScreen === SCREEN_STATES.PROLOGUE) {
            this.narrativeScreen = SCREEN_STATES.PROMPT;
            Narrative.showPrompt(this);
          } else if (this.narrativeScreen === SCREEN_STATES.PROMPT) {
            this.narrativeScreen = SCREEN_STATES.CHOICES;
            Narrative.showChoices(this);
          }
        }
        return;
      case SCREEN_STATES.CHOICES:
        this.player.setVelocity(0);
        this.player.anims.stop();
        return;
      case SCREEN_STATES.OUTCOME:
        this.player.setVelocity(0);
        this.player.anims.stop();
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
          this.narrativeScreen = SCREEN_STATES.ITEM_MENU;
          Narrative.showItemMenu(this);
        }
        return;
      case SCREEN_STATES.ITEM_MENU:
      case SCREEN_STATES.ITEM_PICK:
        this.player.setVelocity(0);
        this.player.anims.stop();
        return;
      default:
        break;
    }

    const speed = 80;
    this.player.setVelocity(0);

    if (this.keys.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.anims.play("walk-left", true);
    } else if (this.keys.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.anims.play("walk-right", true);
    } else if (this.keys.up.isDown) {
      this.player.setVelocityY(-speed);
      this.player.anims.play("walk-up", true);
    } else if (this.keys.down.isDown) {
      this.player.setVelocityY(speed);
      this.player.anims.play("walk-down", true);
    } else {
      this.player.setVelocity(0);
      this.player.anims.stop();
      this.player.anims.setCurrentFrame(this.anims.get("walk-down").frames[0]);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      const ex = Narrative.getOverlappingExclamation(this);
      if (ex) {
        console.log("Interacting with ex at:", ex.x, ex.y);
        ex.destroy();
        this.narrativeScreen = SCREEN_STATES.PROLOGUE;
        Narrative.showPrologue(this);
      } else {
        console.log("Interact pressed, but no exclamation overlap.");
      }
    }
  }
}

// Define spawnMultipleExclamations and other scene-specific helpers here if needed
function spawnMultipleExclamations(scene, count) {
  if (scene.currentZone === "Village") return;
  for (let i = 0; i < count; i++) {
    spawnOneExclamation(scene);
  }
}

function spawnOneExclamation(scene) {
  const MAX_TRIES = 100;
  let tries = 0;
  const worldW = scene.background.displayWidth;
  const worldH = scene.background.displayHeight;
  while (tries < MAX_TRIES) {
    tries++;
    const exX = Phaser.Math.Between(50, worldW - 50);
    const exY = Phaser.Math.Between(50, worldH - 50);
    if (!overlapsObstacle(scene, exX, exY)) {
      const ex = scene.exclamations.create(exX, exY, "exclamation");
      ex.setScale(SCALES.bgScale * 4);
      ex.setDepth(900);
      ex.setImmovable(true);
      return;
    }
  }
  console.warn("Unable to place exclamation after", MAX_TRIES, "tries.");
}

function overlapsObstacle(scene, x, y) {
  const EX_SIZE = 16;
  const exRect = new Phaser.Geom.Rectangle(x - EX_SIZE / 2, y - EX_SIZE / 2, EX_SIZE, EX_SIZE);
  const obstacles = scene.obstacles ? scene.obstacles.getChildren() : [];
  for (let obs of obstacles) {
    const obsBounds = obs.getBounds();
    if (Phaser.Geom.Intersects.RectangleToRectangle(exRect, obsBounds)) {
      return true;
    }
  }
  return false;
}