import { config } from './config.js';


export class MainScene extends Phaser.Scene {
	


  preload() {
    this.load.image('bg', 'assets/bg/background.png');
    this.load.image('player', 'assets/sprites/player.png');
    this.load.image('enemy', 'assets/sprites/enemy.png');
	this.load.audio('hit', 'assets/sound/hit.mp3');
	this.load.image('bullet',  'assets/sprites/enemy.png');


  }

  create() {
    this.add.image(400, 300, 'bg');
    this.player = this.physics.add.sprite(100, 100, 'player');
    this.enemy  = this.physics.add.sprite(300, 300, 'enemy');
	
	this.player.setDisplaySize(64, 64);
	this.enemy.setDisplaySize(64, 64);
	

    this.player.setCollideWorldBounds(true);
    this.physics.add.overlap(this.player, this.enemy, this.hitEnemy, null, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.score = 0;
    this.scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '24px', fill: '#fff' });
	this.enemy.setTint(0xffffff);

     //this.pathGfx  = this.add.graphics({ lineStyle: { width: 5, color: 0xffffff } });
	 
     this.pathGfx = this.add.graphics({ lineStyle: { width: 5, color: 0xffffff, alpha: 0.7 } })

  this.pathLine = new Phaser.Geom.Line();
  this.path     = [];                 // stores points along the route
  this.path.push({ x: this.player.x, y: this.player.y });
  
  
  
  // --- enemy bullets ---
this.bullets = this.physics.add.group({
  classType: Phaser.Physics.Arcade.Sprite,
  maxSize:   30,
  runChildUpdate: true
});

// fire a bullet toward the player every 1.2 s

this.enemyFireTimer = this.time.addEvent({
  delay: 2200,
  callback: this.enemyShoot2,
  callbackScope: this,
  loop: true
});


this.randomFireTimer = this.time.addEvent({
    delay: Phaser.Math.Between(800, 2200),
    callback: () => this.enemyShoot(),
    callbackScope: this,
    repeat: -1
  });
  
// bullet vs player collision
this.physics.add.overlap(this.player, this.bullets, this.hitPlayer, null, this);

  
  
  // 1.  Help button (top-right corner)
const helpBtn = this.add.text(750, 20, '?', {
  fontSize: '32px',
  fill: '#fff',
  backgroundColor: '#000a',
  padding: { x: 12, y: 6 }
}).setInteractive().setScrollFactor(0);

// 2.  Pre-defined help text (hidden by default)
const helpText = this.add.text(400, 300,
  'Arrow keys = move\n' +
  'Esc keys = pause/resume\n' +
  'Touch enemy = +10 score\n' +
  'Touch carrot = +3 score\n' +
  'Red bullets = -1 score\n' +
  'Goal: survive & score high and \ntouch the enemy \n(just escape from enemies bullets \n Negative score means enemy is winning!\n Credit: Pompy',
  { fontSize: '24px', fill: '#fff', align: 'center', backgroundColor: '#000c', padding: 12 }
).setOrigin(0.5).setScrollFactor(0).setVisible(false);

// 3.  Toggle visibility on click
helpBtn.on('pointerdown', () => helpText.setVisible(!helpText.visible));


/* click-outside to close */
  this.input.on('pointerdown', (pointer) => {
    // ignore clicks on the help button itself
    if (helpBtn.getBounds().contains(pointer.x, pointer.y)) return;
    helpText.setVisible(false);
  });

  /* ESC key to close */
  this.input.keyboard.on('keydown-ESC', () => helpText.setVisible(false));




 // 1) build a 32×32 carrot texture
  const g = this.make.graphics({ x: 0, y: 0 });
  g.fillStyle(0xff6600);            // orange body
  g.fillTriangle(16, 0, 0, 32, 32, 32);
  g.generateTexture('carrotTex', 32, 32);
  g.destroy();                      // free the temp graphics

  // 2) carrot group
  this.carrots = this.physics.add.group();
  this.physics.add.overlap(this.player, this.carrots, this.collectCarrot, null, this);

  // 3) spawn timer  (1–3 s random)
  this.carrotTimer = this.time.addEvent({
    delay: Phaser.Math.Between(1000, 3000),
    callback: this.spawnCarrot,
    callbackScope: this,
    loop: true
  });
  
  
  
  // --- PAUSE / RESTART UI ---
  this.isPaused = false;

  const style = { fontSize: '24px', fill: '#fff', backgroundColor: '#000a', padding: 8 };

  this.pauseBtn = this.add.text(320, 20, '⏸️', style)
    .setInteractive()
    .setScrollFactor(0)
    .on('pointerdown', () => this.togglePause());

  this.restartBtn = this.add.text(420, 20, '↻', style)
    .setInteractive()
    .setScrollFactor(0)
    .on('pointerdown', () => this.scene.restart());
	
	this.input.keyboard.on('keydown-ESC', () => this.togglePause());


  }

  update() {

/*
  const { left, right, up, down } = this.cursors;
  const speed = 200;
  let vx = 0, vy = 0;

  // only ONE arrow key is allowed at a time
  if (left.isDown)  vx = -speed;
  else if (right.isDown) vx = speed;
  else if (up.isDown)    vy = -speed;
  else if (down.isDown)  vy = speed;

  this.player.setVelocity(vx, vy);
  */
  
   const speed = 200;

  // store the current direction vector
  if (!this.playerDir) this.playerDir = { x: 0, y: 0 };

  // pick up the *last* arrow pressed
  if (this.cursors.left.isDown)   this.playerDir = { x: -speed, y: 0 };
  if (this.cursors.right.isDown)  this.playerDir = { x:  speed, y: 0 };
  if (this.cursors.up.isDown)     this.playerDir = { x: 0, y: -speed };
  if (this.cursors.down.isDown)   this.playerDir = { x: 0, y:  speed };

  // keep moving with that vector until a new arrow arrives
  this.player.setVelocity(this.playerDir.x, this.playerDir.y);
  
  
  
  
    // ---------- path-drawing ----------
  // add current position every frame
  this.path.push({ x: this.player.x, y: this.player.y });

  // keep array small (last 200 points)
  if (this.path.length > 8) this.path.shift();

  // redraw polyline
  this.pathGfx.clear();
 for (let i = 1; i < this.path.length; i++) {
  const p1 = this.path[i - 1];
  const p2 = this.path[i];
  this.pathLine.setTo(p1.x, p1.y, p2.x, p2.y);
  this.pathGfx.strokeLineShape(this.pathLine);
}



this.bullets.children.entries.forEach(b => {
  if (b.active && (b.x < 0 || b.x > 800 || b.y < 0 || b.y > 600)) {
    b.setActive(false).setVisible(false);
  }
});

  
  
   // auto-despawn
  this.carrots.children.entries.forEach(c => {
    if (this.time.now - c.birth > c.lifespan) c.destroy();
  });
  
  }

  hitEnemy() {

	
  this.enemy.setTint(0xff0000);
  this.time.delayedCall(1000, () => this.enemy.clearTint());

  this.score=this.score+10;
  this.scoreText.setText(`Score: ${this.score}`);

  // move enemy to a new random spot
  this.enemy.setPosition(
    Phaser.Math.Between(50, 750),
    Phaser.Math.Between(50, 550)
  );
  
  //game shake on collision
  this.sound.play('hit');
  this.cameras.main.shake(120, 0.01);
  
  
  }
  
  
  
  
  
  enemyShoot() {
  if (!this.player.active) return;

  const bullet = this.bullets.get(this.enemy.x, this.enemy.y, 'bullet');
  if (!bullet) return;

  bullet.setActive(true).setVisible(true).setDisplaySize(10, 10);

  // randomised curved shot
  const angle = Phaser.Math.Angle.Between(this.enemy.x, this.enemy.y,
                                          this.player.x, this.player.y);
  const speed = 420 + Phaser.Math.Between(-30, 30);
  this.physics.velocityFromRotation(angle, speed, bullet.body.velocity);

  /* gravity makes it arc downward */
  bullet.body.setGravityY(Phaser.Math.Between(150, 400));   // tweak for more/less curve
}

  
  enemyShoot2() {
  if (!this.player.active) return;          // game over guard

  const bullet = this.bullets.get(this.enemy.x, this.enemy.y, 'bullet');
  if (!bullet) return;                      // pool exhausted

  bullet.setActive(true).setVisible(true).setDisplaySize(8, 8);

  // vector toward player
  const angle = Phaser.Math.Angle.Between(this.enemy.x, this.enemy.y,
                                          this.player.x, this.player.y);
  const speed = 250;
  this.physics.velocityFromRotation(angle, speed, bullet.body.velocity);
  
  
}



hitPlayer(player, bullet) {

  // allow negative scores
  if (!bullet.active || player.invulnerable) return;  // ignore re-entrants

  bullet.setActive(false).setVisible(false);

  // one-time score drop
  this.score -= 1;
  this.scoreText.setText(`Score: ${this.score}`);

  // short invulnerability window (200 ms)
  player.invulnerable = true;
  player.setTint(0xff0000);
  this.time.delayedCall(200, () => {
    player.clearTint();
    player.invulnerable = false;
  });
}


spawnCarrot() {
  const x = Phaser.Math.Between(50, 750);
  const y = Phaser.Math.Between(50, 550);

  const carrot = this.carrots.create(x, y, 'carrotTex');
  carrot.setDisplaySize(32, 32);

  // disappear after 3 seconds
  carrot.lifespan = 3000;
  carrot.birth = this.time.now;
}

collectCarrot(player, carrot) {
  carrot.destroy();
  this.score += 3;
  this.scoreText.setText(`Score: ${this.score}`);
}


togglePause() {
  this.isPaused = !this.isPaused;

  if (this.isPaused) {
    this.physics.pause();
    this.carrotTimer.paused = true;
    this.enemyFireTimer?.paused && (this.enemyFireTimer.paused = true);
    this.pauseBtn.setText('▶️');
  } else {
    this.physics.resume();
    this.carrotTimer.paused = false;
    this.enemyFireTimer?.paused && (this.enemyFireTimer.paused = false);
    this.pauseBtn.setText('⏸️');
  }
}


}


