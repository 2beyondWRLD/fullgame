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

    // Player stats properties
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

  init(data) {
    this.inventory = data.inventory || [];
    this.playerStats = data.playerStats || this.playerStats;
    this.zone = data.zone;
  }

  create() {
    // Use the current zone's background
    this.add.image(0, 0, this.zone.backgroundKey)
      .setOrigin(0, 0)
      .setScale(1);
    
    // Add a semi-transparent overlay to darken the scene
    this.darkOverlay = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.5)
      .setOrigin(0, 0);
    
    // Add title
    this.add.text(400, 50, 'Camping', {
      fontSize: '32px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    
    // Add campfire representation using existing crate sprite
    this.campfire = this.add.sprite(400, 300, 'loot_crate')
      .setScale(1.5)
      .setInteractive({ useHandCursor: true });
    
    // Add campfire text
    this.campfireText = this.add.text(400, 250, 'Campfire', {
      fontSize: '24px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    
    // Add return button
    const returnButton = this.add.text(400, 500, 'Return to Game', {
      fontSize: '24px',
      fill: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 }
    })
      .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
    
    // Add button hover effect
    returnButton.on('pointerover', () => returnButton.setScale(1.1));
    returnButton.on('pointerout', () => returnButton.setScale(1));
    
    // Handle return to game
    returnButton.on('pointerdown', () => {
      this.scene.start('MainGameScene', {
        inventory: this.inventory,
        playerStats: this.playerStats,
        zone: this.zone
      });
    });
    
    // Add campfire interaction
    this.campfire.on('pointerdown', () => {
      if (!this.campfire.isLit) {
        this.campfire.setTint(0xff6600);
        this.campfireText.setText('Campfire (Lit)');
        this.campfire.isLit = true;
        
        // Create a simple fire effect
        createSimpleEffect(this, this.campfire.x, this.campfire.y, 0xff6600);
      } else {
        this.campfire.clearTint();
        this.campfireText.setText('Campfire');
        this.campfire.isLit = false;
      }
    });

    // Start the burn timer
    this.startBurnTimer();
  }

  startBurnTimer() {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateBurnTime,
      callbackScope: this,
      loop: true
    });
  }

  updateBurnTime() {
    if (this.campfire && this.campfire.isLit) {
      this.burnTime += 1;
      // Add any burn time related effects here
    }
  }

  update() {
    // Add any update logic here
  }
}