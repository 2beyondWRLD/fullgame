class CampingScene extends Phaser.Scene {
  constructor() {
    super('CampingScene');
    // Player and scene elements
    this.player = null;
    this.campfire = null;
    this.lightRadius = 150;
    this.maxLightRadius = 400;
    this.campfireScale = 1.5;
    this.maxCampfireScale = 3;
    this.campfireOriginY = 0.75;
    this.maxCampfireOriginY = 1;
    this.cursors = null;
    this.campfireLight = null;
    this.darkOverlay = null;

    // Fire management
    this.burnTime = 0;
    this.maxStokes = 7;
    this.currentStokes = 0;
    this.burnMeter = null;
    this.timerEvent = null;
    this.isFireLit = false;

    // Inventory
    this.inventory = [];
    this.menuVisible = false;
    this.menuText = null;

    // Cooking properties
    this.isCooking = false;
    this.cookingTime = 0;
    this.cookingDuration = 30; // Total time to cook (in seconds)
    this.cookingComplete = false;
    this.cookedFoodItem = null;
    this.skillet = null;
    this.progressBar = null;
    this.cookingTimer = null;
    this.claimText = null;
    this.cookingStartTime = 0; // Timestamp for persistence

    // Dialog menu properties
    this.dialogVisible = false;
    this.dialogBox = null;
    this.dialogTitle = null;
    this.dialogTextItems = [];
    this.selectedItemIndex = 0;
    this.cookableItems = [];

    // Torch properties
    this.torch = null;
    this.torchLight = null;
    this.torchBurnTime = 0;
    this.torchCurrentStokes = 0;
    this.isTorchLit = false;
    this.torchLightRadius = 150;
    this.torchScale = 0.75;
    this.maxTorchScale = 1.5;
    this.torchOriginY = 0.75;
    this.maxTorchOriginY = 1;
    this.torchBurnMeter = null;

    // Stoking menu properties
    this.stokingDialogVisible = false;
    this.stokingDialogBox = null;
    this.stokingDialogTitle = null;
    this.stokingDialogTextItems = [];
    this.stokingItems = [];
    this.stokingTarget = null;
    this.quantityInputVisible = false;
    this.quantityInputText = null;
    this.selectedQuantity = 1;

    // **Added: Player stats properties**
    this.playerStats = {
      health: 100,
      stamina: 100,
      thirst: 100,
      hunger: 100,
      oromozi: 1000
    };
    this.statsText = null;
    this.regenTimer = null;
  }

  preload() {
    this.load.tilemapTiledJSON('campsite_map', 'assets/maps/campsite.json');
    this.load.image('forest_night', 'assets/images/forest_night.png');
    this.load.spritesheet('player', 'assets/images/player.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('campfire', 'assets/images/campfire.png', { frameWidth: 32, frameHeight: 48 });
    this.load.spritesheet('smoke', 'assets/images/smoke.png', { frameWidth: 32, frameHeight: 48 });
    this.load.image('skillet', 'assets/images/skillet.png');
  }

  create(data) {
    // **Added: Receive player stats from MainGameScene**
    if (data && data.playerStats) {
      this.playerStats = { ...data.playerStats }; // Deep copy to avoid reference issues
    }

    // **Added: Set up stats display**
    this.statsText = this.add.text(10, 10, '', { font: '16px Arial', fill: '#ffffff' }).setDepth(1000);
    this.updateStatsText();

    // **Added: Set up regeneration timer**
    this.regenTimer = this.time.addEvent({
      delay: 15000, // Regenerate every 5 seconds
      callback: () => {
        if (this.isFireLit) { // Only regenerate if campfire is lit
          this.playerStats.stamina = Math.min(100, this.playerStats.stamina + 5);
          this.updateStatsText();
        }
      },
      loop: true
    });

    // Preserve incoming inventory
    console.log('Incoming data:', data);
    this.inventory = data.inventory ? [...data.inventory] : [];
    if (this.inventory.length === 0) {
      const woodItem = this.inventory.find(item => item.name.toLowerCase() === 'wood');
      if (woodItem) woodItem.quantity += 1;
      else this.inventory.push({ name: 'wood', quantity: 1 });
      const codItem = this.inventory.find(item => item.name.toLowerCase() === 'cod');
      if (codItem) codItem.quantity += 1;
      else this.inventory.push({ name: 'cod', quantity: 1 });
    }
    console.log('Final inventory on entering CampingScene:', this.inventory);

    // Restore states from registry with fallback values
    const cookingState = this.registry.get('cookingState') || {};
    this.isCooking = cookingState.isCooking || false;
    this.cookingTime = cookingState.cookingTime || 0;
    this.cookingComplete = cookingState.cookingComplete || false;
    this.cookedFoodItem = cookingState.cookedFoodItem || null;
    this.cookingStartTime = cookingState.cookingStartTime || 0;

    const fireState = this.registry.get('fireState') || {};
    this.isFireLit = fireState.isFireLit || false;
    this.burnTime = fireState.burnTime || 0;
    this.currentStokes = fireState.currentStokes || 0;
    this.lightRadius = fireState.lightRadius || 150;
    this.campfireScale = fireState.campfireScale || 1.5;
    this.campfireOriginY = fireState.campfireOriginY || 0.75;

    const torchState = this.registry.get('torchState') || {};
    this.isTorchLit = torchState.isTorchLit || false;
    this.torchBurnTime = torchState.torchBurnTime || 0;
    this.torchCurrentStokes = torchState.torchCurrentStokes || 0;
    this.torchLightRadius = torchState.torchLightRadius || 150;
    this.torchScale = torchState.torchScale || 0.75;
    this.torchOriginY = torchState.torchOriginY || 0.75;

    console.log('Restored cooking state - isCooking:', this.isCooking, 'cookingTime:', this.cookingTime, 'cookingComplete:', this.cookingComplete, 'cookedFoodItem:', this.cookedFoodItem);

    // Enable lighting with a slightly brighter ambient color
    this.lights.enable().setAmbientColor(0x444444);

    // Load tilemap and add background
    const map = this.make.tilemap({ key: 'campsite_map' });
    const campsiteLayer = map.images.find(layer => layer.name === 'campsite');
    if (campsiteLayer) {
      this.add.image(0, 0, 'forest_night').setOrigin(0, 0).setScale(1).setPipeline('Light2D');
    }

    // Create player
    this.player = this.physics.add.sprite(288, 288, 'player')
      .setScale(2)
      .setDepth(2)
      .setPipeline('Light2D');
    this.player.pipelineData = { castShadows: false };
    this.player.body.setSize(24, 24).setOffset(12, 20);

    // Player animations
    this.anims.create({ key: 'idleDown', frames: this.anims.generateFrameNumbers('player', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'moveRight', frames: this.anims.generateFrameNumbers('player', { start: 6, end: 11 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'idleUp', frames: this.anims.generateFrameNumbers('player', { start: 12, end: 17 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'moveDown', frames: this.anims.generateFrameNumbers('player', { start: 18, end: 23 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'moveLeft', frames: this.anims.generateFrameNumbers('player', { start: 24, end: 29 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'moveUp', frames: this.anims.generateFrameNumbers('player', { start: 30, end: 35 }), frameRate: 10, repeat: -1 });
    this.player.play('idleDown');

    // Create campfire
    const campfireLayer = map.getObjectLayer('campfire');
    if (campfireLayer && campfireLayer.objects.length > 0) {
      const campfireObj = campfireLayer.objects[0];
      const originalCampfireY = campfireObj.y + (campfireObj.height / 2) - 10;
      const campfireX = campfireObj.x + (campfireObj.width / 2);

      this.campfire = this.physics.add.sprite(campfireX, originalCampfireY, 'smoke')
        .setScale(0.5)
        .setDepth(1)
        .setPipeline('Light2D')
        .setOrigin(0.5, this.campfireOriginY);

      this.anims.create({ key: 'smokeRise', frames: this.anims.generateFrameNumbers('smoke', { start: 0, end: 4 }), frameRate: 5, repeat: -1 });
      this.campfire.play('smokeRise');

      this.anims.create({ key: 'campfireBurn', frames: this.anims.generateFrameNumbers('campfire', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });

      this.campfireLight = this.lights.addLight(campfireX, originalCampfireY, 0, 0xffaa33, 3);
      if (this.isFireLit) {
        this.campfire.setTexture('campfire').play('campfireBurn');
        this.campfire.setScale(this.campfireScale).setOrigin(0.5, this.campfireOriginY);
        this.campfire.setY(originalCampfireY + 30);
        this.campfireLight.setRadius(this.lightRadius);
      }

      // Make campfire interactive
      this.campfire.setInteractive();
      this.campfire.on('pointerdown', this.handleFireClick, this);
    }

    // Create torch
    const torchLayer = map.getObjectLayer('site_torch');
    if (torchLayer && torchLayer.objects.length > 0) {
      const torchObj = torchLayer.objects[0];
      const originalTorchY = torchObj.y + (torchObj.height / 2) - 20;
      const torchX = torchObj.x + (torchObj.width / 2);

      this.torch = this.physics.add.sprite(torchX, originalTorchY, 'smoke')
        .setScale(0.25)
        .setDepth(1)
        .setPipeline('Light2D')
        .setOrigin(0.5, this.torchOriginY);
      this.torch.play('smokeRise');

      this.torchLight = this.lights.addLight(torchX, originalTorchY, 0, 0xffaa33, 3);
      if (this.isTorchLit) {
        this.torch.setTexture('campfire').play('campfireBurn');
        this.torch.setScale(this.torchScale).setOrigin(0.5, this.torchOriginY);
        this.torch.setY(originalTorchY + 30);
        this.torchLight.setRadius(this.torchLightRadius);
      }

      this.torchBurnMeter = this.add.graphics();
      this.updateTorchBurnMeter();
    }

    // Add dark overlay
    this.darkOverlay = this.add.rectangle(288, 288, 576, 576, 0x000000, 0.7)
      .setOrigin(0.5)
      .setDepth(3)
      .setPipeline('Light2D');
    this.darkOverlay.setBlendMode(Phaser.BlendModes.SCREEN);

    // Create burn meter
    this.burnMeter = this.add.graphics();
    this.updateBurnMeter();

    // Restore cooking UI and state
    if ((this.isCooking || this.cookingComplete) && this.cookingStartTime > 0) {
      this.skillet = this.add.image(this.campfire.x, this.campfire.y + 5, 'skillet').setScale(3).setDepth(2);
      this.progressBar = this.add.graphics().setDepth(3);

      // Calculate elapsed time since cooking started
      const currentTime = Date.now();
      const totalElapsedTime = Math.floor((currentTime - this.cookingStartTime) / 1000); // In seconds
      const adjustedCookingTime = this.cookingTime + totalElapsedTime;

      if (adjustedCookingTime >= this.cookingDuration) {
        // Cooking is complete
        this.cookingComplete = true;
        this.isCooking = false;
        this.progressBar.fillStyle(0x0000ff, 1);
        this.progressBar.fillRect(this.campfire.x - 25, this.campfire.y - 40, 50, 5);
        this.claimText = this.add.text(this.campfire.x, this.campfire.y - 60, 'Claim', {
          fontSize: '14px',
          color: '#ffffff'
        }).setOrigin(0.5).setDepth(3);

        // Update registry when cooking completes on restore
        this.registry.set('cookingState', {
          isCooking: false,
          cookingTime: adjustedCookingTime,
          cookingComplete: true,
          cookedFoodItem: this.cookedFoodItem,
          cookingStartTime: this.cookingStartTime
        });
      } else if (this.isFireLit) {
        // Resume cooking
        this.cookingTime = adjustedCookingTime;
        this.isCooking = true;
        this.progressBar.fillStyle(0x00ff00, 1);
        this.progressBar.fillRect(this.campfire.x - 25, this.campfire.y - 40, 50 * (this.cookingTime / this.cookingDuration), 5);
        this.cookingTimer = this.time.addEvent({
          delay: 1000,
          callback: this.updateCooking,
          callbackScope: this,
          loop: true
        });
      } else {
        // Fire is out, stop cooking and discard item
        this.isCooking = false;
        this.cookingComplete = false;
        this.skillet.destroy();
        this.progressBar.destroy();
        this.cookedFoodItem = null;

        // Update registry when cooking is discarded
        this.registry.set('cookingState', {
          isCooking: false,
          cookingTime: 0,
          cookingComplete: false,
          cookedFoodItem: null,
          cookingStartTime: 0
        });
      }
    }

    // Set world and camera bounds
    this.physics.world.setBounds(0, 0, 576, 576);
    this.cameras.main.setBounds(0, 0, 576, 576).startFollow(this.player, true);

    // Input setup
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      stoke: Phaser.Input.Keyboard.KeyCodes.F,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      select: Phaser.Input.Keyboard.KeyCodes.ENTER,
      dialogUp: Phaser.Input.Keyboard.KeyCodes.UP,
      dialogDown: Phaser.Input.Keyboard.KeyCodes.DOWN,
      increaseQty: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      decreaseQty: Phaser.Input.Keyboard.KeyCodes.LEFT
    });

    // Stoke fire or torch with F key
    this.input.keyboard.on('keydown-F', () => {
      if (!this.dialogVisible && !this.stokingDialogVisible) {
        const playerPos = this.player.getCenter();
        const campfirePos = this.campfire.getCenter();
        const distanceToCampfire = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, campfirePos.x, campfirePos.y);

        if (distanceToCampfire < 50) {
          this.showStokingMenu('campfire');
        } else if (this.torch) {
          const torchPos = this.torch.getCenter();
          const distanceToTorch = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, torchPos.x, torchPos.y);
          if (distanceToTorch < 50) {
            this.showStokingMenu('torch');
          }
        }
      }
    });

    // Exit with ESC key
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.dialogVisible) {
        this.closeDialog();
      } else if (this.stokingDialogVisible) {
        this.closeStokingDialog();
      } else {
        this.returnToMainScene();
      }
    });

    // Dialog navigation with UP key
    this.input.keyboard.on('keydown-UP', () => {
      if (this.dialogVisible) {
        this.selectedItemIndex = Math.max(0, this.selectedItemIndex - 1);
        this.updateDialogSelection();
      } else if (this.stokingDialogVisible && !this.quantityInputVisible) {
        this.selectedItemIndex = Math.max(0, this.selectedItemIndex - 1);
        this.updateStokingDialogSelection();
      }
    });

    // Dialog navigation with DOWN key
    this.input.keyboard.on('keydown-DOWN', () => {
      if (this.dialogVisible) {
        this.selectedItemIndex = Math.min(this.cookableItems.length - 1, this.selectedItemIndex + 1);
        this.updateDialogSelection();
      } else if (this.stokingDialogVisible && !this.quantityInputVisible) {
        this.selectedItemIndex = Math.min(this.stokingItems.length - 1, this.selectedItemIndex + 1);
        this.updateStokingDialogSelection();
      }
    });

    // Quantity adjustment with LEFT and RIGHT keys
    this.input.keyboard.on('keydown-LEFT', () => {
      if (this.stokingDialogVisible && this.quantityInputVisible) {
        const maxQty = this.stokingItems[this.selectedItemIndex].quantity;
        this.selectedQuantity = Math.max(1, this.selectedQuantity - 1);
        this.updateQuantityInput(maxQty);
      }
    });

    this.input.keyboard.on('keydown-RIGHT', () => {
      if (this.stokingDialogVisible && this.quantityInputVisible) {
        const maxQty = this.stokingItems[this.selectedItemIndex].quantity;
        this.selectedQuantity = Math.min(maxQty, this.selectedQuantity + 1);
        this.updateQuantityInput(maxQty);
      }
    });

    // Select item with ENTER key
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.dialogVisible) {
        this.selectCookableItem();
      } else if (this.stokingDialogVisible) {
        if (!this.quantityInputVisible) {
          this.showQuantityInput();
        } else {
          this.useStokingItem();
        }
      }
    });

    // Start burn timer
    this.startBurnTimer();
  }

  update() {
    this.player.setVelocity(0);
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-100).anims.play('moveLeft', true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(100).anims.play('moveRight', true);
    } else if (this.cursors.up.isDown) {
      this.player.setVelocityY(-100).anims.play('moveUp', true);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(100).anims.play('moveDown', true);
    } else {
      this.player.anims.play('idleDown', true);
    }
  }

  // **Added: Method to update stats display**
  updateStatsText() {
    this.statsText.setText(
      `Health: ${this.playerStats.health}\n` +
      `Stamina: ${this.playerStats.stamina}\n` +
      `Hunger: ${this.playerStats.hunger}\n` +
      `Thirst: ${this.playerStats.thirst}\n` +
      `Oromozi: ${this.playerStats.oromozi}`
    );
  }

  stokeFire(item, quantity) {
    if (this.currentStokes < this.maxStokes) {
      const name = item.name.toLowerCase();
      let stokes = 0;

      if (name.includes("wood")) stokes = 3;
      else if (name === "lint" || name === "trash") stokes = 0.1;

      if (stokes > 0) {
        item.quantity -= quantity;
        if (item.quantity <= 0) {
          const index = this.inventory.indexOf(item);
          if (index > -1) this.inventory.splice(index, 1);
        }

        const totalStokes = stokes * quantity;
        this.currentStokes = Math.min(this.currentStokes + totalStokes, this.maxStokes);
        this.burnTime = this.currentStokes * 30;

        this.lightRadius = Math.min(this.lightRadius + (20 * totalStokes), this.maxLightRadius);
        this.campfireLight.setRadius(this.lightRadius);
        this.campfireScale = Math.min(this.campfireScale + (0.1 * totalStokes), this.maxCampfireScale);
        this.campfireOriginY = Math.min(this.campfireOriginY + (0.01 * totalStokes), this.maxCampfireOriginY);
        if (!this.isFireLit) {
          this.campfire.setY(this.campfire.y + 30);
        }
        this.campfire.setScale(this.campfireScale).setOrigin(0.5, this.campfireOriginY);

        if (!this.isFireLit) {
          this.isFireLit = true;
          this.campfire.setTexture('campfire').play('campfireBurn');
        }

        this.updateBurnMeter();
        console.log(`Stoked campfire with ${quantity} ${item.name}! Stokes: ${this.currentStokes}, Burn time: ${this.burnTime}s`);

        // Update fire state in registry
        this.registry.set('fireState', {
          isFireLit: this.isFireLit,
          burnTime: this.burnTime,
          currentStokes: this.currentStokes,
          lightRadius: this.lightRadius,
          campfireScale: this.campfireScale,
          campfireOriginY: this.campfireOriginY
        });
      }
    } else {
      console.log("Max stokes reached for campfire!");
    }
  }

  stokeTorch(item, quantity) {
    if (this.torchCurrentStokes < this.maxStokes) {
      const name = item.name.toLowerCase();
      let stokes = 0;

      if (name.includes("wood")) stokes = 3;
      else if (name === "lint" || name === "trash") stokes = 0.1;

      if (stokes > 0) {
        item.quantity -= quantity;
        if (item.quantity <= 0) {
          const index = this.inventory.indexOf(item);
          if (index > -1) this.inventory.splice(index, 1);
        }

        const totalStokes = stokes * quantity;
        this.torchCurrentStokes = Math.min(this.torchCurrentStokes + totalStokes, this.maxStokes);
        this.torchBurnTime = this.torchCurrentStokes * 30;

        this.torchLightRadius = Math.min(this.torchLightRadius + (20 * totalStokes), this.maxLightRadius);
        this.torchLight.setRadius(this.torchLightRadius);
        this.torchScale = Math.min(this.torchScale + (0.1 * totalStokes), this.maxTorchScale);
        this.torchOriginY = Math.min(this.torchOriginY + (0.01 * totalStokes), this.maxTorchOriginY);
        if (!this.isTorchLit) {
          this.torch.setY(this.torch.y + 30);
        }
        this.torch.setScale(this.torchScale).setOrigin(0.5, this.torchOriginY);

        if (!this.isTorchLit) {
          this.isTorchLit = true;
          this.torch.setTexture('campfire').play('campfireBurn');
        }

        this.updateTorchBurnMeter();
        console.log(`Stoked torch with ${quantity} ${item.name}! Stokes: ${this.torchCurrentStokes}, Burn time: ${this.torchBurnTime}s`);

        // Update torch state in registry
        this.registry.set('torchState', {
          isTorchLit: this.isTorchLit,
          torchBurnTime: this.torchBurnTime,
          torchCurrentStokes: this.torchCurrentStokes,
          torchLightRadius: this.torchLightRadius,
          torchScale: this.torchScale,
          torchOriginY: this.torchOriginY
        });
      }
    } else {
      console.log("Max stokes reached for torch!");
    }
  }

  findStokeItems() {
    return this.inventory.filter(item => {
      const name = item.name.toLowerCase();
      return (name.includes("wood") || name === "lint" || name === "trash") && item.quantity > 0;
    });
  }

  showStokingMenu(target) {
    this.stokingItems = this.findStokeItems();
    if (this.stokingItems.length === 0) {
      console.log(`No stoking items in inventory for ${target}!`);
      return;
    }

    this.stokingDialogVisible = true;
    this.stokingTarget = target;
    this.selectedItemIndex = 0;
    this.quantityInputVisible = false;
    this.selectedQuantity = 1;

    this.stokingDialogBox = this.add.rectangle(288, 288, 200, 150, 0x000000, 0.9).setDepth(5);
    this.stokingDialogBox.setStrokeStyle(2, 0xffffff, 1);

    this.stokingDialogTitle = this.add.text(288, 230, 'Select Item to Stoke', { fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(6);

    this.stokingDialogTextItems = [];
    this.stokingItems.forEach((item, index) => {
      const text = this.add.text(288, 260 + index * 20, `${item.name} (x${item.quantity})`, { fontSize: '14px', color: '#ffffff' })
        .setOrigin(0.5)
        .setDepth(6);
      this.stokingDialogTextItems.push(text);
    });

    this.updateStokingDialogSelection();
  }

  updateStokingDialogSelection() {
    this.stokingDialogTextItems.forEach((text, index) => {
      text.setColor(index === this.selectedItemIndex ? '#ffff00' : '#ffffff');
    });
  }

  showQuantityInput() {
    this.quantityInputVisible = true;
    const selectedItem = this.stokingItems[this.selectedItemIndex];
    const maxQty = selectedItem.quantity;

    this.stokingDialogTextItems.forEach(text => text.destroy());
    this.stokingDialogTextItems = [];

    const text = this.add.text(288, 260, `How many ${selectedItem.name} to use?`, { fontSize: '14px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(6);
    this.stokingDialogTextItems.push(text);

    this.quantityInputText = this.add.text(288, 280, `Quantity: ${this.selectedQuantity} (Max: ${maxQty})`, { fontSize: '14px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(6);
    this.stokingDialogTextItems.push(this.quantityInputText);
  }

  updateQuantityInput(maxQty) {
    this.quantityInputText.setText(`Quantity: ${this.selectedQuantity} (Max: ${maxQty})`);
  }

  useStokingItem() {
    const selectedItem = this.stokingItems[this.selectedItemIndex];
    const quantity = this.selectedQuantity;

    if (this.stokingTarget === 'campfire') {
      this.stokeFire(selectedItem, quantity);
    } else if (this.stokingTarget === 'torch') {
      this.stokeTorch(selectedItem, quantity);
    }

    this.closeStokingDialog();
  }

  closeStokingDialog() {
    this.stokingDialogVisible = false;
    if (this.stokingDialogBox) this.stokingDialogBox.destroy();
    if (this.stokingDialogTitle) this.stokingDialogTitle.destroy();
    this.stokingDialogTextItems.forEach(text => text.destroy());
    this.stokingDialogTextItems = [];
    this.stokingItems = [];
    this.stokingTarget = null;
    this.quantityInputVisible = false;
    this.selectedItemIndex = 0;
    this.selectedQuantity = 1;
    if (this.quantityInputText) {
      this.quantityInputText.destroy();
      this.quantityInputText = null;
    }
  }

  updateBurnMeter() {
    this.burnMeter.clear();
    const meterX = this.campfire.x + 40;
    const meterY = this.campfire.y - 20;
    const meterWidth = 50;
    const meterHeight = 10;
    const maxBurnTime = this.maxStokes * 30;
    const remainingPercent = this.burnTime / maxBurnTime;

    this.burnMeter.fillStyle(0x000000, 0.7).fillRect(meterX, meterY, meterWidth, meterHeight);
    this.burnMeter.fillStyle(0xffaa33, 1).fillRect(meterX, meterY, meterWidth * remainingPercent, meterHeight);
    this.burnMeter.setDepth(4);
  }

  updateTorchBurnMeter() {
    this.torchBurnMeter.clear();
    const meterX = this.torch.x + 40;
    const meterY = this.torch.y - 20;
    const meterWidth = 50;
    const meterHeight = 10;
    const maxBurnTime = this.maxStokes * 30;
    const remainingPercent = this.torchBurnTime / maxBurnTime;

    this.torchBurnMeter.fillStyle(0x000000, 0.7).fillRect(meterX, meterY, meterWidth, meterHeight);
    this.torchBurnMeter.fillStyle(0xffaa33, 1).fillRect(meterX, meterY, meterWidth * remainingPercent, meterHeight);
    this.torchBurnMeter.setDepth(4);
  }

  startBurnTimer() {
    if (this.timerEvent) this.timerEvent.remove();
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.burnTime > 0) {
          this.burnTime--;
          this.updateBurnMeter();
          if (this.burnTime <= 0) this.extinguishFire();
        }
        if (this.torch && this.torchBurnTime > 0) {
          this.torchBurnTime--;
          this.updateTorchBurnMeter();
          if (this.torchBurnTime <= 0) this.extinguishTorch();
        }
      },
      loop: true
    });
  }

  extinguishFire() {
    this.lightRadius = 0;
    this.campfireLight.setRadius(this.lightRadius);
    this.campfireScale = 0.5;
    this.campfire.setScale(this.campfireScale);
    this.isFireLit = false;
    this.campfire.anims.stop().setTexture('smoke').play('smokeRise');
    if (this.isCooking && !this.cookingComplete) {
      this.isCooking = false;
      if (this.cookingTimer) this.cookingTimer.remove();
      if (this.skillet) this.skillet.destroy();
      if (this.progressBar) this.progressBar.destroy();
      if (this.claimText) this.claimText.destroy();
      this.cookingComplete = false;
      this.cookedFoodItem = null;
      console.log("Cooking stopped: Fire is out!");

      // Update cooking state in registry
      this.registry.set('cookingState', {
        isCooking: false,
        cookingTime: 0,
        cookingComplete: false,
        cookedFoodItem: null,
        cookingStartTime: 0
      });
    }
    console.log("Fire extinguished!");

    // Update fire state in registry
    this.registry.set('fireState', {
      isFireLit: false,
      burnTime: 0,
      currentStokes: 0,
      lightRadius: 0,
      campfireScale: this.campfireScale,
      campfireOriginY: this.campfireOriginY
    });
  }

  extinguishTorch() {
    this.torchLightRadius = 0;
    this.torchLight.setRadius(this.torchLightRadius);
    this.torchScale = 0.25;
    this.torch.setScale(this.torchScale);
    this.isTorchLit = false;
    this.torch.anims.stop().setTexture('smoke').play('smokeRise');
    console.log("Torch extinguished!");

    // Update torch state in registry
    this.registry.set('torchState', {
      isTorchLit: false,
      torchBurnTime: 0,
      torchCurrentStokes: 0,
      torchLightRadius: 0,
      torchScale: this.torchScale,
      torchOriginY: this.torchOriginY
    });
  }

  returnToMainScene() {
    if (this.timerEvent) this.timerEvent.remove();
    if (this.cookingTimer) this.cookingTimer.remove();
    if (this.regenTimer) this.regenTimer.remove(); // **Added: Clean up regeneration timer**

    // Update registry with current states before leaving
    this.registry.set('cookingState', {
      isCooking: this.isCooking,
      cookingTime: this.cookingTime,
      cookingComplete: this.cookingComplete,
      cookedFoodItem: this.cookedFoodItem,
      cookingStartTime: this.cookingStartTime
    });

    this.registry.set('fireState', {
      isFireLit: this.isFireLit,
      burnTime: this.burnTime,
      currentStokes: this.currentStokes,
      lightRadius: this.lightRadius,
      campfireScale: this.campfireScale,
      campfireOriginY: this.campfireOriginY
    });

    this.registry.set('torchState', {
      isTorchLit: this.isTorchLit,
      torchBurnTime: this.torchBurnTime,
      torchCurrentStokes: this.torchCurrentStokes,
      torchLightRadius: this.torchLightRadius,
      torchScale: this.torchScale,
      torchOriginY: this.torchOriginY
    });

    const mainScene = this.scene.get('MainGameScene');
    this.scene.start('MainGameScene', {
      zone: zoneList.find(z => z.name === "Village"),
      inventory: this.inventory,
      promptCount: mainScene ? mainScene.promptCount : 0,
      playerStats: this.playerStats // **Added: Pass updated player stats back**
    });
  }

  handleFireClick() {
    if (this.isFireLit && !this.isCooking && !this.cookingComplete) {
      this.cookableItems = this.inventory.filter(item => item.name.toLowerCase() === 'cod');
      if (this.cookableItems.length > 0) {
        this.showDialog();
      } else {
        console.log("No food items in inventory!");
      }
    } else if (this.cookingComplete) {
      this.claimCookedFood();
    }
  }

  showDialog() {
    this.dialogVisible = true;
    this.selectedItemIndex = 0;

    this.dialogBox = this.add.rectangle(288, 288, 200, 150, 0x000000, 0.9).setDepth(5);
    this.dialogBox.setStrokeStyle(2, 0xffffff, 1);

    this.dialogTitle = this.add.text(288, 230, 'Select Item to Cook', { fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(6);

    this.dialogTextItems = [];
    this.cookableItems.forEach((item, index) => {
      const text = this.add.text(288, 260 + index * 20, item.name, { fontSize: '14px', color: '#ffffff' })
        .setOrigin(0.5)
        .setDepth(6);
      this.dialogTextItems.push(text);
    });

    this.updateDialogSelection();
  }

  updateDialogSelection() {
    this.dialogTextItems.forEach((text, index) => {
      text.setColor(index === this.selectedItemIndex ? '#ffff00' : '#ffffff');
    });
  }

  selectCookableItem() {
    const selectedItem = this.cookableItems[this.selectedItemIndex];
    this.closeDialog();
    this.startCooking(selectedItem);
  }

  closeDialog() {
    this.dialogVisible = false;
    if (this.dialogBox) this.dialogBox.destroy();
    if (this.dialogTitle) this.dialogTitle.destroy();
    this.dialogTextItems.forEach(text => text.destroy());
    this.dialogTextItems = [];
    this.cookableItems = [];
    this.selectedItemIndex = 0;
    this.dialogTitle = null;
  }

  startCooking(foodItem) {
    const index = this.inventory.findIndex(item => item.name.toLowerCase() === foodItem.name.toLowerCase());
    if (index > -1) {
      this.inventory.splice(index, 1); // Remove item immediately
    }

    this.cookingStartTime = Date.now(); // Record start time

    this.skillet = this.add.image(this.campfire.x, this.campfire.y + 5, 'skillet').setScale(3).setDepth(2);
    this.isCooking = true;
    this.cookingTime = 0;
    this.cookingComplete = false;
    this.cookedFoodItem = { name: 'Cooked ' + foodItem.name, quantity: 1 };

    this.progressBar = this.add.graphics().setDepth(3);
    this.updateCooking();

    this.cookingTimer = this.time.addEvent({
      delay: 1000,
      callback: this.updateCooking,
      callbackScope: this,
      loop: true
    });

    // Update cooking state in registry
    this.registry.set('cookingState', {
      isCooking: true,
      cookingTime: 0,
      cookingComplete: false,
      cookedFoodItem: this.cookedFoodItem,
      cookingStartTime: this.cookingStartTime
    });
  }

  updateCooking() {
    if (this.isCooking && this.isFireLit) {
      this.cookingTime++;
      const progress = this.cookingTime / this.cookingDuration;
      this.progressBar.clear();

      if (this.cookingTime >= this.cookingDuration) {
        this.isCooking = false;
        this.cookingComplete = true;
        this.cookingTimer.remove();
        console.log("Cooking complete! Click to claim.");

        this.progressBar.fillStyle(0x0000ff, 1);
        this.progressBar.fillRect(this.campfire.x - 25, this.campfire.y - 40, 50, 5);

        if (!this.claimText) {
          this.claimText = this.add.text(this.campfire.x, this.campfire.y - 60, 'Claim', { fontSize: '14px', color: '#ffffff' })
            .setOrigin(0.5)
            .setDepth(3);
        }

        // Update cooking state in registry
        this.registry.set('cookingState', {
          isCooking: false,
          cookingTime: this.cookingTime,
          cookingComplete: true,
          cookedFoodItem: this.cookedFoodItem,
          cookingStartTime: this.cookingStartTime
        });
      } else {
        this.progressBar.fillStyle(0x00ff00, 1);
        this.progressBar.fillRect(this.campfire.x - 25, this.campfire.y - 40, 50 * progress, 5);
      }
    }
  }

  claimCookedFood() {
    if (this.cookingComplete) {
      this.inventory.push(this.cookedFoodItem);
      this.skillet.destroy();
      this.progressBar.destroy();
      if (this.claimText) {
        this.claimText.destroy();
        this.claimText = null;
      }
      this.cookingComplete = false;
      this.cookedFoodItem = null;
      console.log("Claimed cooked food:", this.inventory);

      // Update cooking state in registry
      this.registry.set('cookingState', {
        isCooking: false,
        cookingTime: 0,
        cookingComplete: false,
        cookedFoodItem: null,
        cookingStartTime: 0
      });
    }
  }
}