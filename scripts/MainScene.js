class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload() {
    const zoneKeys = zoneList.map(z => z.mapKey);
    zoneKeys.forEach(key => this.load.json(key, `assets/maps/${key}.json`));

    const backgroundKeys = zoneList.map(z => z.backgroundKey);
    backgroundKeys.forEach(key => this.load.image(key, `assets/backgrounds/${key}.png`));

    const foregroundKeys = zoneList.filter(z => z.foregroundKey).map(z => z.foregroundKey);
    foregroundKeys.forEach(key => this.load.image(key, `assets/foregrounds/${key}.png`));

    this.load.spritesheet("player", "assets/sprites/player.png", {
      frameWidth: 32,
      frameHeight: 32
    });

    this.load.image("exclamation", "assets/sprites/exclamation.png");

    this.load.json("narrativePrologues", "assets/data/narrativePrologues.json");
    this.load.json("narrativePrompts", "assets/data/narrativeprompt.json");
    this.load.json("lootTable", "assets/data/lootTable.json");
  }

  create() {
    const zoneData = this.scene.settings.data?.zone || zoneList.find(z => z.name === "Village");
    this.currentZone = zoneData.name;

    const existingOromozi = this.playerStats ? this.playerStats.oromozi : 1000;
    this.playerStats = this.playerStats || Utils.createInitialStats(this.currentZone, existingOromozi);
    this.localInventory = this.scene.settings.data?.inventory || [];
    this.promptCount = this.scene.settings.data?.promptCount || 0;
    this.deposits = this.deposits || [];
    this.listedItems = this.listedItems || [];
    this.tradeListings = this.tradeListings || [];
    Utils.initEquippedData(this);

    if (this.currentZone !== "Village" && !this.initialScavengerInventory) {
      this.initialScavengerInventory = JSON.parse(JSON.stringify(this.localInventory));
      console.log("Initial Scavenger Mode inventory set:", this.initialScavengerInventory);
    }

    this.background = this.add.image(0, 0, zoneData.backgroundKey).setOrigin(0, 0).setScale(SCALES.bgScale);
    this.physics.world.setBounds(0, 0, this.background.displayWidth, this.background.displayHeight);
    this.cameras.main.setBounds(0, 0, this.background.displayWidth, this.background.displayHeight);

    this.obstacles = this.physics.add.staticGroup();
    const mapData = this.cache.json.get(zoneData.mapKey);
    if (mapData && mapData.layers) {
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
        }
      });
    }

    this.player = this.physics.add.sprite(100 * SCALES.bgScale, 100 * SCALES.bgScale, "player");
    this.player.setScale(SCALES.playerScale * 0.5);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(2000);
    this.physics.add.collider(this.player, this.obstacles);

    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("player", { start: 6, end: 11 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("player", { start: 12, end: 17 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNumbers("player", { start: 18, end: 23 }),
      frameRate: 10,
      repeat: -1
    });

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(2);

    // HUD and remaining code unchanged for brevity, assuming Utils is defined elsewhere
    // Add Utils.js if needed
  }

  update() {
    // Simplified update for demonstration; integrate full logic as needed
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
      this.player.anims.stop();
    }
  }
}