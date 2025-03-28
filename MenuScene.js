"use strict";

class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  preload() {
    for (let i = 1; i <= 113; i++) {
      this.load.image(`frame_${i}`, `assets/menu/frame (${i}).png`);
    }
  }

  create() {
    let frames = [];
    for (let i = 1; i <= 113; i++) {
      frames.push({ key: `frame_${i}` });
    }

    this.anims.create({
      key: 'menuAnimation',
      frames: frames,
      frameRate: 24, // Adjust if needed
      repeat: -1
    });

    let gifSprite = this.add.sprite(
      this.game.config.width / 2,
      this.game.config.height / 2,
      'frame_1'
    );
    gifSprite.setOrigin(0.5);
    gifSprite.play('menuAnimation');

    const text = this.add.text(
      this.game.config.width / 2,
      this.game.config.height * 0.9,
      'Press Enter',
      { font: '32px Arial', fill: '#ffffff' }
    ).setOrigin(0.5);

    this.input.keyboard.on('keydown-ENTER', () => {
      this.scene.start('MainGameScene');
    });
  }
}