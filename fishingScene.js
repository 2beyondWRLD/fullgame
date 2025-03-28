class FishingScene extends Phaser.Scene {
  constructor() {
    super('FishingScene');
    this.player = null;
    this.boat = null;
    this.lake = null;
    this.boardingBox = null;
    this.poleAttachmentBox = null;
    this.cursors = null;
    this.isInBoat = false;
    this.fishCount = { 
      boot: 0, trash: 0, cod: 0, bass: 0, catfish: 0, tuna: 0, 
      ruby: 0, diamonds: 0, gold: 0, 'crystal skull': 0
    };
    this.lastDirection = 'down';
    this.camera = null;
    this.poleSprite = null;
    this.bobberSprite = null;
    this.collisions = null;
    this.map = null;
    this.scaleFactor = 0.61;
    this.poleOffsets = {
      up: { x: -20, y: 20 },
      down: { x: -5, y: -25 },
      left: { x: -20, y: 0 },
      right: { x: -30, y: 0 }
    };
    this.poleAngles = {
      up: -45,
      down: 0,
      left: 0,
      right: 0
    };
    this.isFishing = false;
    this.currentLoot = null;
    this.narrationText = null;
    this.narrationBox = null;
    this.lastVelocityX = 0;
    this.lastVelocityY = 0;
    this.lastDirectionTime = 0;
    this.tugMeter = null;
    this.tensionMeter = null;
    this.tugValue = 50;
    this.tensionValue = 0;
    this.menuIcon = null;
    this.menuBox = null;
    this.menuHeader = null;
    this.menuOptions = null;
    this.menuVisible = false;
    this.selectedMenuIndex = 0;
    this.fishingRods = [
      { name: 'Basic Rod', difficultyReduction: 0 },
      { name: 'Good Rod', difficultyReduction: 1 },
      { name: 'Best Rod', difficultyReduction: 2 }
    ];
    this.selectedRodIndex = 0;
  }

  preload() {
    this.load.tilemapTiledJSON('fishing_map', 'assets/maps/fishing_lake.json');
    this.load.image('lake', 'assets/images/lake.png');
    this.load.image('lake_foreground', 'assets/images/lake_foreground.png');
    this.load.spritesheet('player', 'assets/images/player.png', { frameWidth: 48, frameHeight: 48, margin: 0, spacing: 0 });
    this.load.spritesheet('boat_idle', 'assets/images/boat_idle.png', { frameWidth: 163, frameHeight: 224, margin: 0, spacing: 0 });
    this.load.spritesheet('boat_moving', 'assets/images/boat_moving.png', { frameWidth: 163, frameHeight: 224, margin: 0, spacing: 0 });
    this.load.image('fishing_pole', 'assets/images/fishing_pole.png');
    this.load.image('bobber', 'assets/images/bobber.png');
    this.load.image('menu_icon', 'assets/images/menu.png');
  }

  create() {
    this.map = this.make.tilemap({ key: 'fishing_map' });

    const lakeImageLayer = this.map.images.find(layer => layer.name === 'lake');
    this.lake = this.add.image(0, 0, 'lake')
      .setOrigin(0, 0)
      .setScale(this.scaleFactor)
      .setDepth(0);

    const fgImageLayer = this.map.images.find(layer => layer.name === 'lake_foreground');
    this.add.image(0, 0, 'lake_foreground')
      .setOrigin(0, 0)
      .setScale(this.scaleFactor)
      .setDepth(3);

    this.collisions = this.physics.add.staticGroup();

    const collisionLayer = this.map.getObjectLayer('collisions');
    if (collisionLayer && collisionLayer.objects) {
      collisionLayer.objects.forEach(obj => {
        const x = obj.x * this.scaleFactor;
        const y = obj.y * this.scaleFactor;
        const width = obj.width * this.scaleFactor;
        const height = obj.height * this.scaleFactor;
        console.log(`Collision (Lake): x=${x}, y=${y}, w=${width}, h=${height}`);
        const body = this.collisions.create(x, y, null);
        body.setSize(width, height, false);
        body.setOrigin(0, 0);
        body.setVisible(false);
      });
    } else {
      console.warn("Collisions layer not found in tilemap");
    }

    this.player = this.physics.add.sprite(30, 30, 'player').setScale(2).setDepth(2);
    this.player.body.setSize(24, 24).setOffset(12, 20);
    this.anims.create({ key: 'idleDown', frames: this.anims.generateFrameNumbers('player', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'moveRight', frames: this.anims.generateFrameNumbers('player', { start: 6, end: 11 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'idleUp', frames: this.anims.generateFrameNumbers('player', { start: 12, end: 17 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'moveDown', frames: this.anims.generateFrameNumbers('player', { start: 18, end: 23 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'moveLeft', frames: this.anims.generateFrameNumbers('player', { start: 24, end: 29 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'moveUp', frames: this.anims.generateFrameNumbers('player', { start: 30, end: 35 }), frameRate: 10, repeat: -1 });
    this.player.play('idleDown');

    const mainLake = collisionLayer.objects.find(obj => obj.id === 79);
    const lakeX = mainLake.x * this.scaleFactor;
    const lakeY = mainLake.y * this.scaleFactor;
    const lakeWidth = mainLake.width * this.scaleFactor;
    const boatStartX = lakeX + lakeWidth;
    const boatHeight = 224 * 1.0;
    const boatStartY = lakeY + boatHeight / 2;
    this.boat = this.physics.add.sprite(boatStartX, boatStartY, 'boat_idle').setScale(1.0).setOrigin(0.5, 0.5).setDepth(1);
    this.boat.body.setSize(100, 120).setOffset(31.5, 52);
    this.anims.create({ key: 'boatIdleDown', frames: this.anims.generateFrameNumbers('boat_idle', { start: 0, end: 3 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'boatIdleRight', frames: this.anims.generateFrameNumbers('boat_idle', { start: 4, end: 7 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'boatIdleLeft', frames: this.anims.generateFrameNumbers('boat_idle', { start: 8, end: 11 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'boatIdleUp', frames: this.anims.generateFrameNumbers('boat_idle', { start: 12, end: 15 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'boatMoveDown', frames: this.anims.generateFrameNumbers('boat_moving', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'boatMoveRight', frames: this.anims.generateFrameNumbers('boat_moving', { start: 4, end: 7 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'boatMoveLeft', frames: this.anims.generateFrameNumbers('boat_moving', { start: 8, end: 11 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'boatMoveUp', frames: this.anims.generateFrameNumbers('boat_moving', { start: 12, end: 15 }), frameRate: 10, repeat: -1 });
    this.boat.play('boatIdleDown');

    const mapWidth = lakeImageLayer.imagewidth * this.scaleFactor;
    const mapHeight = lakeImageLayer.imageheight * this.scaleFactor;
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

    this.boardingBox = this.add.rectangle(this.boat.x, this.boat.y - 70, 20, 20, 0x00ff00, 0.5).setDepth(1).setOrigin(0.5, 0.5).setScrollFactor(0);
    this.poleAttachmentBox = this.add.rectangle(this.player.x + 30, this.player.y - 10, 10, 10, 0x000000, 0).setDepth(2).setOrigin(0.5, 0.5).setScrollFactor(1);
    this.poleSprite = this.add.sprite(this.poleAttachmentBox.x + this.poleOffsets.right.x, this.poleAttachmentBox.y + this.poleOffsets.right.y, 'fishing_pole')
      .setScale(0.36).setDepth(2).setOrigin(0, 0.5);
    this.bobberSprite = this.add.sprite(0, 0, 'bobber').setScale(0.5).setDepth(2).setVisible(false);

    this.camera = this.cameras.main;
    this.camera.startFollow(this.player, true).setDeadzone(100, 100);

    this.narrationBox = this.add.rectangle(400, 50, 500, 100, 0x000000, 0.7).setOrigin(0.5).setScrollFactor(0).setDepth(4).setVisible(false);
    this.narrationText = this.add.text(400, 50, '', { fontSize: '20px', color: '#ffffff', align: 'center', wordWrap: { width: 480 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5).setVisible(false);

    this.tugMeter = this.add.rectangle(400, 150, 200, 20, 0x00ff00).setOrigin(0.5).setScrollFactor(0).setDepth(4).setVisible(false);
    this.tensionMeter = this.add.rectangle(400, 180, 200, 20, 0xff0000).setOrigin(0.5).setScrollFactor(0).setDepth(4).setVisible(false);

    this.menuIcon = this.add.image(780, 20, 'menu_icon')
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(5)
      .setInteractive()
      .on('pointerdown', () => this.toggleMenu());

    this.menuBox = this.add.rectangle(400, 300, 300, 230, 0x000000, 0.8)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(6)
      .setVisible(false);

    this.menuHeader = this.add.text(400, 210, 'Menu (M)', { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(7)
      .setVisible(false);

    this.menuOptions = [
      this.add.text(400, 240, 'Cast (Space)', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(7).setVisible(false),
      this.add.text(400, 270, 'Cancel Cast (X)', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(7).setVisible(false),
      this.add.text(400, 300, 'Enter/Exit Boat (E)', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(7).setVisible(false),
      this.add.text(400, 330, 'Choose Rod (R)', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(7).setVisible(false),
      this.add.text(400, 360, 'View Inventory (I)', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(7).setVisible(false)
    ];
    this.menuOptions[this.selectedMenuIndex].setColor('#ffff00');

    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      enterBoat: Phaser.Input.Keyboard.KeyCodes.E,
      chooseRod: Phaser.Input.Keyboard.KeyCodes.R,
      viewInventory: Phaser.Input.Keyboard.KeyCodes.I,
      cancelCast: Phaser.Input.Keyboard.KeyCodes.X,
      menu: Phaser.Input.Keyboard.KeyCodes.M,
      select: Phaser.Input.Keyboard.KeyCodes.ENTER
    });

    // Keyboard event handlers
    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.menuVisible && !this.isFishing) {
        if (this.isInBoat) {
          this.startFishingSequence(true);
        } else {
          let closestDistance = Infinity;
          this.collisions.getChildren().forEach(body => {
            const rectX = body.x;
            const rectY = body.y;
            const rectWidth = body.width;
            const rectHeight = body.height;
            const closestX = Math.max(rectX, Math.min(this.player.x, rectX + rectWidth));
            const closestY = Math.max(rectY, Math.min(this.player.y, rectY + rectHeight));
            const dx = this.player.x - closestX;
            const dy = this.player.y - closestY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < closestDistance) {
              closestDistance = distance;
            }
          });
          if (closestDistance <= 200) {
            this.startFishingSequence(false);
          } else {
            this.narrationBox.setVisible(true);
            this.narrationText.setVisible(true);
            this.narrationText.setText('Too far from the lake to cast!\nGet within 200 pixels of the water.');
            this.time.delayedCall(2000, () => {
              this.narrationText.setText('');
              this.narrationBox.setVisible(false);
              this.narrationText.setVisible(false);
            });
          }
        }
      } else if (!this.menuVisible && this.isFishing === 'tug') {
        this.isFishing = 'reeling';
        this.tugValue = 50;
        this.tensionValue = 0;
        this.narrationBox.setVisible(true);
        this.narrationText.setVisible(true);
        this.narrationText.setText('Reel it in!');
        this.tugMeter.setVisible(true);
        this.tensionMeter.setVisible(true);
        this.startReelingNarration();
      }
    });

    this.input.keyboard.on('keydown-E', () => {
      if (!this.menuVisible && !this.isFishing) {
        if (!this.isInBoat) {
          const distanceToBoat = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boat.x, this.boat.y);
          if (distanceToBoat < 200) {
            this.isInBoat = true;
            this.boat.x -= 100;
            this.player.setPosition(this.boardingBox.x, this.boardingBox.y);
            this.player.body.enable = false;
            this.player.setDepth(2);
            this.player.anims.play('idleDown', true);
            console.log(`Boat warped to x=${this.boat.x}, y=${this.boat.y}`);
          } else {
            this.narrationBox.setVisible(true);
            this.narrationText.setVisible(true);
            this.narrationText.setText('Too far from the boat!\nGet within 200 pixels to enter.');
            this.time.delayedCall(2000, () => {
              this.narrationText.setText('');
              this.narrationBox.setVisible(false);
              this.narrationText.setVisible(false);
            });
          }
        } else {
          this.isInBoat = false;
          this.player.setPosition(this.boat.x + 150, this.boat.y);
          this.player.body.enable = true;
          this.player.anims.play('idleDown', true);
          console.log(`Exited boat at x=${this.player.x}, y=${this.player.y}`);
        }
      }
    });

    this.input.keyboard.on('keydown-R', () => {
      if (!this.menuVisible && !this.isFishing) {
        this.selectedRodIndex = (this.selectedRodIndex + 1) % this.fishingRods.length;
        const rod = this.fishingRods[this.selectedRodIndex];
        this.narrationBox.setVisible(true);
        this.narrationText.setVisible(true);
        this.narrationText.setText(`Equipped ${rod.name} (Difficulty Reduction: ${rod.difficultyReduction})`);
        this.time.delayedCall(2000, () => {
          this.narrationText.setText('');
          this.narrationBox.setVisible(false);
          this.narrationText.setVisible(false);
        });
      }
    });

    this.input.keyboard.on('keydown-I', () => {
      if (!this.menuVisible && !this.isFishing) {
        let inventoryText = 'Inventory:\n';
        for (const [item, count] of Object.entries(this.fishCount)) {
          if (count > 0) {
            inventoryText += `${item.charAt(0).toUpperCase() + item.slice(1)}: ${count}\n`;
          }
        }
        this.narrationBox.setVisible(true);
        this.narrationText.setVisible(true);
        this.narrationText.setText(inventoryText.trim());
        this.time.delayedCall(3000, () => {
          this.narrationText.setText('');
          this.narrationBox.setVisible(false);
          this.narrationText.setVisible(false);
        });
      }
    });

    this.input.keyboard.on('keydown-X', () => {
      if (!this.menuVisible && this.isFishing && this.isFishing !== 'reeling') {
        this.cancelFishing();
      }
    });

    this.input.keyboard.on('keydown-M', () => {
      this.toggleMenu();
    });

    this.input.keyboard.on('keydown-UP', () => {
      if (this.menuVisible) {
        this.menuOptions[this.selectedMenuIndex].setColor('#ffffff');
        this.selectedMenuIndex = (this.selectedMenuIndex - 1 + this.menuOptions.length) % this.menuOptions.length;
        this.menuOptions[this.selectedMenuIndex].setColor('#ffff00');
      }
    });

    this.input.keyboard.on('keydown-DOWN', () => {
      if (this.menuVisible) {
        this.menuOptions[this.selectedMenuIndex].setColor('#ffffff');
        this.selectedMenuIndex = (this.selectedMenuIndex + 1) % this.menuOptions.length;
        this.menuOptions[this.selectedMenuIndex].setColor('#ffff00');
      }
    });

    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.menuVisible) {
        this.selectMenuOption();
      }
    });

    this.input.keyboard.on('keydown-ESC', () => {
      console.log("ESC pressed, returning to MainGameScene");
      this.returnToMainScene();
    });

    this.physics.add.collider(this.player, this.collisions);
    this.physics.add.collider(this.boat, this.collisions, () => {
      console.log(`Boat collision at x=${this.boat.x}, y=${this.boat.y}`);
    });
  }

  startFishingSequence(fromBoat) {
    this.isFishing = 'casting';
    const castMessage = fromBoat ? 'Casting from the boat...' : 'Casting into the lake...';
    this.narrationBox.setVisible(true);
    this.narrationText.setVisible(true);
    this.narrationText.setText(castMessage);

    this.poleSprite.setAngle(this.poleAngles[this.lastDirection] + 30);

    console.log('Casting with lastDirection:', this.lastDirection);

    const distance = Phaser.Math.Between(100, 300);
    let bobberX = fromBoat ? this.boat.x : this.player.x;
    let bobberY = fromBoat ? this.boat.y : this.player.y;
    const startX = bobberX;
    const startY = bobberY;
    switch (this.lastDirection) {
      case 'right':
        bobberX += distance;
        break;
      case 'left':
        bobberX -= distance;
        break;
      case 'up':
        bobberY -= (distance + (fromBoat ? 112 : 0));
        break;
      case 'down':
        bobberY += distance;
        break;
    }

    const mainLake = this.map.getObjectLayer('collisions').objects.find(obj => obj.id === 79);
    const lakeX = mainLake.x * this.scaleFactor;
    const lakeY = mainLake.y * this.scaleFactor;
    const lakeWidth = mainLake.width * this.scaleFactor;
    const lakeHeight = mainLake.height * this.scaleFactor;

    bobberX = Phaser.Math.Clamp(bobberX, lakeX, lakeX + lakeWidth);
    bobberY = Phaser.Math.Clamp(bobberY, lakeY, lakeY + lakeHeight);

    if (this.lastDirection === 'up' && bobberY > startY - 100) {
      bobberY = startY - 100;
    } else if (this.lastDirection === 'down' && bobberY < startY + 100) {
      bobberY = startY + 100;
    } else if (this.lastDirection === 'left' && bobberX > startX - 100) {
      bobberX = startX - 100;
    } else if (this.lastDirection === 'right' && bobberX < startX + 100) {
      bobberX = startX + 100;
    }

    console.log(`Casting from (${fromBoat ? 'boat' : 'player'}): x=${startX}, y=${startY}, Bobber: x=${bobberX}, y=${bobberY}, Distance: ${Math.abs(this.lastDirection === 'up' || this.lastDirection === 'down' ? bobberY - startY : bobberX - startX)}`);

    this.bobberSprite.setPosition(bobberX, bobberY).setVisible(true);
    this.tweens.add({
      targets: this.bobberSprite,
      y: '+=10',
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const waitTime = Phaser.Math.Between(6000, 8000);
    this.time.delayedCall(waitTime, () => {
      if (this.isFishing === 'casting') {
        this.isFishing = 'waiting';
        this.narrationBox.setVisible(true);
        this.narrationText.setVisible(true);
        this.narrationText.setText('The bobber floats quietly...');
        this.time.delayedCall(2000, () => {
          if (this.isFishing === 'waiting') {
            this.narrationText.setText('A soft ripple spreads...');
            this.time.delayedCall(2000, () => {
              if (this.isFishing === 'waiting') {
                this.narrationText.setText('Something stirs below...');
                this.time.delayedCall(2000, () => {
                  if (this.isFishing === 'waiting') {
                    this.narrationText.setText('The bobber dips slightly...');
                    this.time.delayedCall(2000, () => {
                      if (this.isFishing === 'waiting') {
                        this.isFishing = 'tug';
                        this.currentLoot = this.getRandomLoot();
                        this.narrationText.setText('Something tugs!\nPress SPACE to reel!');
                        this.bobberSprite.setTint(0xff0000);
                        this.time.delayedCall(500, () => this.bobberSprite.clearTint());
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  cancelFishing() {
    this.isFishing = false;
    this.bobberSprite.setVisible(false);
    this.tweens.killTweensOf(this.bobberSprite);
    this.narrationBox.setVisible(true);
    this.narrationText.setVisible(true);
    this.narrationText.setText('Cast cancelled.');
    this.poleSprite.setAngle(this.poleAngles[this.lastDirection]);
    this.currentLoot = null;
    this.time.delayedCall(1000, () => {
      this.narrationText.setText('');
      this.narrationBox.setVisible(false);
      this.narrationText.setVisible(false);
    });
  }

  toggleMenu() {
    this.menuVisible = !this.menuVisible;
    this.menuBox.setVisible(this.menuVisible);
    this.menuHeader.setVisible(this.menuVisible);
    this.menuOptions.forEach(option => option.setVisible(this.menuVisible));
    if (this.menuVisible) {
      this.menuOptions[this.selectedMenuIndex].setColor('#ffff00');
    } else {
      this.menuOptions[this.selectedMenuIndex].setColor('#ffffff');
    }
  }

  selectMenuOption() {
    switch (this.selectedMenuIndex) {
      case 0: // Cast
        if (!this.isFishing) {
          if (this.isInBoat) {
            this.startFishingSequence(true);
          } else {
            let closestDistance = Infinity;
            this.collisions.getChildren().forEach(body => {
              const rectX = body.x;
              const rectY = body.y;
              const rectWidth = body.width;
              const rectHeight = body.height;
              const closestX = Math.max(rectX, Math.min(this.player.x, rectX + rectWidth));
              const closestY = Math.max(rectY, Math.min(this.player.y, rectY + rectHeight));
              const dx = this.player.x - closestX;
              const dy = this.player.y - closestY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < closestDistance) {
                closestDistance = distance;
              }
            });
            if (closestDistance <= 200) {
              this.startFishingSequence(false);
            } else {
              this.narrationBox.setVisible(true);
              this.narrationText.setVisible(true);
              this.narrationText.setText('Too far from the lake to cast!\nGet within 200 pixels of the water.');
              this.time.delayedCall(2000, () => {
                this.narrationText.setText('');
                this.narrationBox.setVisible(false);
                this.narrationText.setVisible(false);
              });
            }
          }
        }
        break;
      case 1: // Cancel Cast
        if (this.isFishing && this.isFishing !== 'reeling') {
          this.cancelFishing();
        }
        break;
      case 2: // Enter/Exit Boat
        if (!this.isFishing) {
          if (!this.isInBoat) {
            const distanceToBoat = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boat.x, this.boat.y);
            if (distanceToBoat < 200) {
              this.isInBoat = true;
              this.boat.x -= 100;
              this.player.setPosition(this.boardingBox.x, this.boardingBox.y);
              this.player.body.enable = false;
              this.player.setDepth(2);
              this.player.anims.play('idleDown', true);
              console.log(`Boat warped to x=${this.boat.x}, y=${this.boat.y}`);
            } else {
              this.narrationBox.setVisible(true);
              this.narrationText.setVisible(true);
              this.narrationText.setText('Too far from the boat!\nGet within 200 pixels to enter.');
              this.time.delayedCall(2000, () => {
                this.narrationText.setText('');
                this.narrationBox.setVisible(false);
                this.narrationText.setVisible(false);
              });
            }
          } else {
            this.isInBoat = false;
            this.player.setPosition(this.boat.x + 150, this.boat.y);
            this.player.body.enable = true;
            this.player.anims.play('idleDown', true);
            console.log(`Exited boat at x=${this.player.x}, y=${this.player.y}`);
          }
        }
        break;
      case 3: // Choose Rod
        if (!this.isFishing) {
          this.selectedRodIndex = (this.selectedRodIndex + 1) % this.fishingRods.length;
          const rod = this.fishingRods[this.selectedRodIndex];
          this.narrationBox.setVisible(true);
          this.narrationText.setVisible(true);
          this.narrationText.setText(`Equipped ${rod.name} (Difficulty Reduction: ${rod.difficultyReduction})`);
          this.time.delayedCall(2000, () => {
            this.narrationText.setText('');
            this.narrationBox.setVisible(false);
            this.narrationText.setVisible(false);
          });
        }
        break;
      case 4: // View Inventory
        if (!this.isFishing) {
          let inventoryText = 'Inventory:\n';
          for (const [item, count] of Object.entries(this.fishCount)) {
            if (count > 0) {
              inventoryText += `${item.charAt(0).toUpperCase() + item.slice(1)}: ${count}\n`;
            }
          }
          this.narrationBox.setVisible(true);
          this.narrationText.setVisible(true);
          this.narrationText.setText(inventoryText.trim());
          this.time.delayedCall(3000, () => {
            this.narrationText.setText('');
            this.narrationBox.setVisible(false);
            this.narrationText.setVisible(false);
          });
        }
        break;
    }
    this.toggleMenu();
  }

  getRandomLoot() {
    const lootTypes = [
      { name: 'Nothing', chance: 0.40, difficulty: 1 },
      { name: 'Boot', chance: 0.15, difficulty: 3 },
      { name: 'Trash', chance: 0.15, difficulty: 3 },
      { name: 'Cod', chance: 0.15, difficulty: 5 },
      { name: 'Bass', chance: 0.08, difficulty: 6 },
      { name: 'Catfish', chance: 0.05, difficulty: 7 },
      { name: 'Tuna', chance: 0.025, difficulty: 8 },
      { name: 'Ruby', chance: 0.001, difficulty: 10 },
      { name: 'Diamonds', chance: 0.001, difficulty: 10 },
      { name: 'Gold', chance: 0.001, difficulty: 10 },
      { name: 'Crystal Skull', chance: 0.001, difficulty: 12 }
    ];
    const roll = Math.random();
    let cumulative = 0;
    for (const loot of lootTypes) {
      cumulative += loot.chance;
      if (roll <= cumulative) return loot;
    }
    return lootTypes[0];
  }

  startReelingNarration() {
    this.time.delayedCall(1500, () => {
      if (this.isFishing === 'reeling') {
        this.narrationBox.setVisible(true);
        this.narrationText.setVisible(true);
        this.narrationText.setText('It’s pulling back!\nKeep reeling!');
        this.time.delayedCall(2000, () => {
          if (this.isFishing === 'reeling') {
            this.narrationText.setText('Almost there—steady now!');
          }
        });
      }
    });
  }

  update() {
    if (!this.isFishing || this.isFishing === 'casting' || this.isFishing === 'waiting' || this.isFishing === 'tug') {
      switch (this.lastDirection) {
        case 'right':
          this.poleAttachmentBox.setPosition(this.player.x + 30, this.player.y - 10);
          this.poleSprite.setFlipX(false).setAngle(this.poleAngles.right);
          break;
        case 'left':
          this.poleAttachmentBox.setPosition(this.player.x - 30, this.player.y - 10);
          this.poleSprite.setFlipX(true).setAngle(this.poleAngles.left);
          break;
        case 'up':
          this.poleAttachmentBox.setPosition(this.player.x, this.player.y - 40);
          this.poleSprite.setFlipX(false).setAngle(this.poleAngles.up);
          break;
        case 'down':
        default:
          this.poleAttachmentBox.setPosition(this.player.x, this.player.y + 20);
          this.poleSprite.setFlipX(false).setAngle(this.poleAngles.down);
          break;
      }
      if (this.isFishing) {
        this.poleSprite.setAngle(this.poleAngles[this.lastDirection] + 30);
      }
    }
    this.poleSprite.setPosition(this.poleAttachmentBox.x + this.poleOffsets[this.lastDirection].x, this.poleAttachmentBox.y + this.poleOffsets[this.lastDirection].y);

    if (!this.isInBoat) {
      if (!this.isFishing && !this.menuVisible) {
        this.player.setVelocity(0);
        if (this.cursors.left.isDown) {
          this.player.setVelocityX(-100).anims.play('moveLeft', true);
          this.lastDirection = 'left';
        } else if (this.cursors.right.isDown) {
          this.player.setVelocityX(100).anims.play('moveRight', true);
          this.lastDirection = 'right';
        } else if (this.cursors.up.isDown) {
          this.player.setVelocityY(-100).anims.play('moveUp', true);
          this.lastDirection = 'up';
        } else if (this.cursors.down.isDown) {
          this.player.setVelocityY(100).anims.play('moveDown', true);
          this.lastDirection = 'down';
        } else {
          switch (this.lastDirection) {
            case 'right': this.player.anims.play('moveRight'); this.player.setFrame(6); break;
            case 'left': this.player.anims.play('moveLeft'); this.player.setFrame(24); break;
            case 'up': this.player.anims.play('idleUp', true); break;
            case 'down': this.player.anims.play('idleDown', true); break;
          }
        }
      } else {
        switch (this.lastDirection) {
          case 'right': this.player.anims.play('moveRight'); this.player.setFrame(6); break;
          case 'left': this.player.anims.play('moveLeft'); this.player.setFrame(24); break;
          case 'up': this.player.anims.play('idleUp', true); break;
          case 'down': this.player.anims.play('idleDown', true); break;
        }
      }
    } else {
      let speed = 150;
      if (!this.isFishing && !this.menuVisible) {
        let velocityX = 0;
        let velocityY = 0;
        const currentTime = this.time.now;

        if (this.cursors.left.isDown) {
          velocityX -= speed;
          this.lastDirection = 'left';
        } else if (this.cursors.right.isDown) {
          velocityX += speed;
          this.lastDirection = 'right';
        } else if (this.cursors.up.isDown) {
          velocityY -= speed;
          this.lastDirection = 'up';
        } else if (this.cursors.down.isDown) {
          velocityY += speed;
          this.lastDirection = 'down';
        }

        if (velocityX < 0 && velocityY === 0) {
          this.boat.anims.play('boatMoveLeft', true);
          this.player.setFrame(24);
        } else if (velocityX > 0 && velocityY === 0) {
          this.boat.anims.play('boatMoveRight', true);
          this.player.setFrame(6);
        } else if (velocityY < 0 && velocityX === 0) {
          this.boat.anims.play('boatMoveUp', true);
          this.player.setFrame(12);
        } else if (velocityY > 0 && velocityX === 0) {
          this.boat.anims.play('boatMoveDown', true);
          this.player.setFrame(0);
        } else if (velocityX < 0 && velocityY < 0) {
          this.boat.anims.play('boatMoveLeft', true);
          this.player.setFrame(24);
        } else if (velocityX > 0 && velocityY < 0) {
          this.boat.anims.play('boatMoveRight', true);
          this.player.setFrame(6);
        } else if (velocityX < 0 && velocityY > 0) {
          this.boat.anims.play('boatMoveLeft', true);
          this.player.setFrame(24);
        } else if (velocityX > 0 && velocityY > 0) {
          this.boat.anims.play('boatMoveRight', true);
          this.player.setFrame(6);
        }

        if (velocityX !== 0 || velocityY !== 0) {
          this.lastVelocityX = velocityX;
          this.lastVelocityY = velocityY;
          this.lastDirectionTime = currentTime;
        }

        if ((currentTime - this.lastDirectionTime) < 250 && (velocityX === 0 && velocityY === 0)) {
          velocityX = this.lastVelocityX;
          velocityY = this.lastVelocityY;
        }

        if (velocityX === 0 && velocityY === 0) {
          this.boat.setVelocity(0);
          switch (this.lastDirection) {
            case 'left': this.boat.anims.play('boatIdleLeft', true); this.player.setFrame(24); break;
            case 'right': this.boat.anims.play('boatIdleRight', true); this.player.setFrame(6); break;
            case 'up': this.boat.anims.play('boatIdleUp', true); this.player.setFrame(12); break;
            case 'down': this.boat.anims.play('boatIdleDown', true); this.player.setFrame(0); break;
          }
        } else {
          this.boat.setVelocity(velocityX, velocityY);
        }
      } else {
        switch (this.lastDirection) {
          case 'left': this.boat.anims.play('boatIdleLeft', true); this.player.setFrame(24); break;
          case 'right': this.boat.anims.play('boatIdleRight', true); this.player.setFrame(6); break;
          case 'up': this.boat.anims.play('boatIdleUp', true); this.player.setFrame(12); break;
          case 'down': this.boat.anims.play('boatIdleDown', true); this.player.setFrame(0); break;
        }
      }
      let yOffset = this.lastDirection === 'up' ? -30 : this.lastDirection === 'down' ? 10 : 20;
      this.boardingBox.setPosition(this.boat.x, this.boat.y + yOffset);
      this.player.setPosition(this.boardingBox.x, this.boardingBox.y);
    }

    if (this.isFishing === 'reeling') {
      if (this.cursors.left.isDown && !this.wasLeftDown) {
        this.tugValue += 5;
        this.tensionValue += 10;
        this.wasLeftDown = true;
      } else if (!this.cursors.left.isDown) {
        this.wasLeftDown = false;
      }
      if (this.cursors.right.isDown && !this.wasRightDown) {
        this.tugValue += 5;
        this.tensionValue += 10;
        this.wasRightDown = true;
      } else if (!this.cursors.right.isDown) {
        this.wasRightDown = false;
      }

      const effectiveDifficulty = Math.max(0, this.currentLoot.difficulty - this.fishingRods[this.selectedRodIndex].difficultyReduction);
      this.tugValue -= effectiveDifficulty * 0.1;
      if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
        this.tensionValue -= 2;
      }

      this.tugValue = Phaser.Math.Clamp(this.tugValue, 0, 100);
      this.tensionValue = Phaser.Math.Clamp(this.tensionValue, 0, 100);

      this.tugMeter.displayWidth = this.tugValue * 2;
      this.tensionMeter.displayWidth = this.tensionValue * 2;

      if (this.tugValue >= 100) {
        this.isFishing = false;
        if (this.currentLoot.name !== 'Nothing') {
          this.fishCount[this.currentLoot.name.toLowerCase()]++;
        }
        const message = this.currentLoot.name === 'Nothing' 
          ? 'Nothing but water on the line...' 
          : `Caught a ${this.currentLoot.name}!`;
        this.narrationText.setText(message);
        this.bobberSprite.setVisible(false);
        this.tugMeter.setVisible(false);
        this.tensionMeter.setVisible(false);
        this.time.delayedCall(3000, () => {
          this.narrationText.setText('');
          this.narrationBox.setVisible(false);
          this.narrationText.setVisible(false);
          this.poleSprite.setAngle(this.poleAngles[this.lastDirection]);
          this.currentLoot = null;
        });
      } else if (this.tensionValue >= 100) {
        this.isFishing = false;
        this.narrationText.setText('The line snapped!');
        this.bobberSprite.setVisible(false);
        this.tugMeter.setVisible(false);
        this.tensionMeter.setVisible(false);
        this.time.delayedCall(3000, () => {
          this.narrationText.setText('');
          this.narrationBox.setVisible(false);
          this.narrationText.setVisible(false);
          this.poleSprite.setAngle(this.poleAngles[this.lastDirection]);
          this.currentLoot = null;
        });
      } else if (this.tugValue <= 0) {
        this.isFishing = false;
        this.narrationText.setText('It got away!');
        this.bobberSprite.setVisible(false);
        this.tugMeter.setVisible(false);
        this.tensionMeter.setVisible(false);
        this.time.delayedCall(3000, () => {
          this.narrationText.setText('');
          this.narrationBox.setVisible(false);
          this.narrationText.setVisible(false);
          this.poleSprite.setAngle(this.poleAngles[this.lastDirection]);
          this.currentLoot = null;
        });
      }
    }
  }

  returnToMainScene() {
    console.log("Returning to MainGameScene");
    const mainScene = this.scene.get('MainGameScene');
    for (let [item, count] of Object.entries(this.fishCount)) {
      if (count > 0) {
        mainScene.localInventory.push({ name: item.charAt(0).toUpperCase() + item.slice(1), quantity: count });
      }
    }
    this.scene.start('MainGameScene', { 
      zone: zoneList.find(z => z.name === "Village"),
      inventory: mainScene.localInventory,
      promptCount: mainScene.promptCount
    });
  }
}