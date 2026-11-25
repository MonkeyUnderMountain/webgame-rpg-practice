import Phaser from 'phaser';
import worldText from '../content/game/world.json';
import { createArt, preloadArt } from './art';
import {
  ARCH_DOOR, BRIDGE_END, BRIDGE_ROW, BRIDGE_START, COLS, EAST_MARK, GATE_WINCH,
  HEIGHT, HOME_DOOR, LAMP, LANDING_DECOR, ROWS, RUIN_DECOR, RUIN_ENTRY, RUIN_EXIT, RUIN_REST,
  SENTINEL, TILE, WAYFARER, WAYSTATION_ENTRY, WAYSTATION_FROM_RUIN, WAYSTATION_REST,
  WEST_MARK, WIDTH, cellKey, layout, pixel,
  type Area, type Placement, type Position, type Tile,
} from './game/maps';
import { movePosition } from './game/movement';



// 网页和 Phaser 之间共享的输入、状态与回调。
export type Direction = 'up' | 'down' | 'left' | 'right';

type GameState = {
  area: string;
  objective: string;
  prompt: string;
  health: number;
  maxHealth: number;
  hasLamp: boolean;
  complete: boolean;
};

export type Encounter = {
  name: string;
  damage: number;
  health: number;
  confirm: () => void;
  cancel: () => void;
};

export type GameCallbacks = {
  onReturnHome: () => void;
  onState: (state: GameState) => void;
  onEncounter: (encounter: Encounter) => void;
};

export type GameControls = {
  enterWorld: () => void;
  setDirection: (direction: Direction, pressed: boolean) => void;
  interact: () => void;
  pause: (paused: boolean) => void;
};



// 同一个交互距离供键盘、触屏和点击选择目标。
type Target = { x: number; y: number; prompt: () => string; act: () => void };

const INTERACTION_RADIUS = TILE * 1.73;
const MAX_HEALTH = 8;
const SENTINEL_DAMAGE = 3;
const { shared, waystation, ruin } = worldText;



class Adventure extends Phaser.Scene {
  // 这些进度属于整局游戏：重画地图或暂时回到书房都会保留。
  private health = MAX_HEALTH;
  private hasLamp = false;
  private sentinelDefeated = false;
  private sideGateOpen = false;
  private bridgeRevealed = false;
  private crossedBridge = false;

  // 这些对象属于当前区域，切换地图时会重新摆放。
  private area: Area = 'waystation';
  private tiles: Tile[][] = [];
  private targets: Target[] = [];
  private solid = new Set<string>();
  private hero!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private motes: { sprite: Phaser.GameObjects.Ellipse; x: number; y: number; phase: number }[] = [];
  private bridgeOrigin: 'east' | 'west' | undefined;
  private direction: Direction = 'down';

  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly touch = new Set<Direction>();
  private locked = false;
  private encounterOpen = false;
  private note = '';
  private noteUntil = 0;
  private lastState = '';
  private elapsed = 0;
  private ready = false;



  // Phaser 启动、输入与每帧更新。打开网页弹窗时暂时锁住玩家操作。
  constructor(private readonly callbacks: GameCallbacks) {
    super('Adventure');
  }

  preload(): void {
    preloadArt(this);
  }

  create(): void {
    createArt(this);
    this.keys = this.input.keyboard?.addKeys({
      w: 'W', a: 'A', s: 'S', d: 'D', e: 'E',
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
    }, false) as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    this.input.keyboard?.addCapture('UP,DOWN,LEFT,RIGHT');
    this.pause(this.locked);
    this.game.events.on(Phaser.Core.Events.BLUR, () => this.clearInput());
    this.ready = true;
    this.enterWorld();
  }

  enterWorld(): void {
    // 首次启动由 create() 进入；再次出门时网页先显示画布容器。
    if (!this.ready) return;
    this.scale.getParentBounds();
    this.scale.refresh();
    this.clearInput();
    this.lastState = '';
    this.enter('waystation', WAYSTATION_ENTRY);
  }

  setDirection(direction: Direction, pressed: boolean): void {
    if (pressed && !this.locked) this.touch.add(direction);
    else this.touch.delete(direction);
  }

  pause(paused: boolean): void {
    this.locked = paused;
    if (paused) this.input?.keyboard?.disableGlobalCapture();
    else this.input?.keyboard?.enableGlobalCapture();
    this.clearInput();
  }

  private clearInput(): void {
    this.touch.clear();
    this.input?.keyboard?.resetKeys();
  }

  interact(): void {
    if (!this.ready || this.locked || this.encounterOpen) return;
    this.nearest()?.act();
    this.emit();
  }

  update(_time: number, dt: number): void {
    if (!this.ready) return;
    this.elapsed += dt;
    for (const mote of this.motes) {
      mote.sprite.setPosition(mote.x + Math.sin(this.elapsed / 1400 + mote.phase) * 9,
        mote.y + Math.cos(this.elapsed / 1150 + mote.phase) * 5);
      mote.sprite.setAlpha(0.18 + (Math.sin(this.elapsed / 500 + mote.phase) + 1) * 0.17);
    }
    if (this.locked || this.encounterOpen) return;

    const active = (direction: Direction, letter: string) =>
      this.touch.has(direction) || this.keys?.[direction].isDown || this.keys?.[letter].isDown;
    const dx = Number(Boolean(active('right', 'd'))) - Number(Boolean(active('left', 'a')));
    const dy = Number(Boolean(active('down', 's'))) - Number(Boolean(active('up', 'w')));
    if (dx || dy) this.move(dx, dy, Math.min(dt, 34));

    if (this.keys?.e && Phaser.Input.Keyboard.JustDown(this.keys.e)) this.interact();
    this.emit();
  }



  // 区域切换与绘制。地图对象随区域重建，进度仍留在这个场景里。
  private enter(area: Area, spawn: Position): void {
    this.area = area;
    this.note = '';
    this.noteUntil = 0;
    this.bridgeOrigin = undefined;
    this.drawArea(spawn);
    this.emit();
  }

  private drawArea(spawn: Position): void {
    for (const child of [...this.children.getChildren()]) child.destroy();
    this.targets = [];
    this.solid.clear();
    this.motes = [];
    this.tiles = layout(this.area, this.bridgeRevealed, this.sideGateOpen);

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const tile = this.tiles[row][col];
        const image = this.add.image(pixel(col), pixel(row), tile);
        const variant = (col * 19 + row * 31 + col * row * 17) % 13;
        if (tile === 'grass' || tile === 'stone') {
          if (variant > 10) image.setTint(0xe1dcee);
          if (variant < 2) image.setTint(0xc8cad7);
        }
      }
    }

    if (this.area === 'waystation') this.drawWaystation();
    else this.drawRuin();

    this.shadow = this.add.ellipse(pixel(spawn[0]), pixel(spawn[1]) + 7, 18, 7, 0x0b0915, 0.5).setDepth(30);
    this.direction = 'down';
    this.hero = this.add.image(pixel(spawn[0]), pixel(spawn[1]), 'heroDown').setDepth(31);
    for (let i = 0; i < 29; i += 1) {
      const x = 55 + (i * 89) % (WIDTH - 110);
      const y = 58 + (i * 43) % (HEIGHT - 103);
      const color = this.area === 'waystation' ? 0xc9e9d0 : 0x89b3da;
      const mote = this.add.ellipse(x, y, i % 5 ? 2 : 3, 2, color, 0.24).setDepth(10);
      this.motes.push({ sprite: mote, x, y, phase: i * 2.7 });
    }
  }

  private drawWaystation(): void {
    this.decorate(LANDING_DECOR);
    this.block(...LANDING_DECOR.filter(([texture]) => texture === 'tree').map(([, col, row]): Position => [col, row]));
    this.glow(pixel(ARCH_DOOR[0]), pixel(ARCH_DOOR[1]), 61, 0x76abb6, 0.035);
    this.glow(pixel(WAYFARER[0]), pixel(WAYFARER[1] + 1), 68, 0xffb965, 0.038);
    this.portal(HOME_DOOR, waystation.studyDoor.label, waystation.studyDoor.prompt, () => this.callbacks.onReturnHome(), 1.24);
    this.portal(ARCH_DOOR, ruin.name, waystation.archPrompt, () => this.enter('ruin', RUIN_ENTRY), 1.5);

    this.sprite('npc', ...WAYFARER);
    this.block(WAYFARER);
    this.target(WAYFARER, () => waystation.wayfarer.prompt, () => {
      this.say(this.crossedBridge ? waystation.wayfarer.afterCrossing : waystation.wayfarer.beforeCrossing, 5500);
    });
    this.drawRestPoint(WAYSTATION_REST, waystation.restPrompt);
  }

  private drawRuin(): void {
    this.decorate(RUIN_DECOR);
    this.portal(RUIN_EXIT, ruin.returnDoor.label, ruin.returnDoor.prompt, () => this.enter('waystation', WAYSTATION_FROM_RUIN), 1.16);
    this.drawRestPoint(RUIN_REST, ruin.restPrompt);

    const winch = this.sprite('crate', ...GATE_WINCH).setTint(0xa8ccc9);
    this.target(GATE_WINCH, () => this.sideGateOpen ? ruin.gate.openPrompt : ruin.gate.closedPrompt,
      () => this.useGateWinch(), winch);

    if (!this.sentinelDefeated) {
      const sentinel = this.sprite('enemy', ...SENTINEL).setScale(1.14);
      this.block(SENTINEL);
      this.target(SENTINEL, () => ruin.sentinel.prompt, () => this.encounter(), sentinel);
      this.tag(...SENTINEL, ruin.sentinel.label, -18);
    }

    if (!this.hasLamp) {
      const lamp = this.sprite('lamp', ...LAMP).setScale(1.47);
      this.glow(pixel(LAMP[0]), pixel(LAMP[1]), 69, 0x96ebe7, 0.045);
      this.tag(...LAMP, ruin.lamp.label, -22);
      this.target(LAMP, () => ruin.lamp.prompt, () => this.takeLamp(), lamp);
    }

    for (const position of [WEST_MARK, EAST_MARK]) {
      const marker = this.sprite('marker', ...position);
      this.target(position, () => this.bridgePrompt(), () => this.inspectBridge(), marker);
    }

    const glimmer = this.add.graphics().setDepth(2);
    for (let col = BRIDGE_START; col <= BRIDGE_END; col += 1) {
      glimmer.fillStyle(this.bridgeRevealed ? 0x8cddd6 : 0x727aaf, this.bridgeRevealed ? 0.76 : 0.28);
      glimmer.fillRect(pixel(col) - 1, pixel(BRIDGE_ROW) - 1, 2, 2);
    }
    if (this.bridgeRevealed) {
      const middleCol = (BRIDGE_START + BRIDGE_END) / 2;
      this.glow(pixel(middleCol), pixel(BRIDGE_ROW), 58, 0x92d8d8, 0.025);
    }
  }

  private redrawRuin(): void {
    const { x, y } = this.hero;
    const direction = this.direction;
    this.drawArea([x / TILE - 0.5, y / TILE - 0.5]);
    this.direction = direction;
    this.hero.setTexture(`hero${direction[0].toUpperCase()}${direction.slice(1)}`);
  }



  // 物件绘制与互动注册。图片位置、互动距离和占用格分别设置。
  private decorate(placements: Placement[]): void {
    for (const [texture, col, row, scale = 1] of placements) {
      if (!this.textures.exists(texture)) continue;
      this.sprite(texture, col, row).setScale(scale).setDepth(7);
    }
  }

  private sprite(texture: string, col: number, row: number): Phaser.GameObjects.Image {
    return this.add.image(pixel(col), pixel(row), texture).setDepth(8);
  }

  private block(...positions: Position[]): void {
    for (const [col, row] of positions) this.solid.add(cellKey(col, row));
  }

  private portal(position: Position, label: string, prompt: string, enter: () => void, scale: number): void {
    const sprite = this.sprite('portal', ...position).setScale(scale).setDepth(9);
    this.tag(...position, label, -22);
    this.target(position, () => prompt, enter, sprite);
  }

  private drawRestPoint(position: Position, restPrompt: string): void {
    this.sprite('rest', ...position);
    this.target(position, () => this.health === MAX_HEALTH ? restPrompt : shared.rest.healPrompt, () => this.rest());
    this.tag(...position, shared.rest.label, 17);
  }

  private tag(col: number, row: number, label: string, offset: number): Phaser.GameObjects.Text {
    return this.add.text(pixel(col), pixel(row) + offset, label, {
      color: '#f4e5c7', backgroundColor: '#171726', fontFamily: 'monospace', fontSize: '10px',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(24);
  }

  private glow(x: number, y: number, radius: number, color: number, alpha: number): void {
    const halo = this.add.graphics().setDepth(4);
    for (let scale = 1; scale >= 0.25; scale -= 0.15) {
      halo.fillStyle(color, alpha);
      halo.fillEllipse(x, y, radius * scale * 2, radius * scale * 1.36);
    }
  }

  private target(position: Position, prompt: () => string, act: () => void, sprite?: Phaser.GameObjects.Image): void {
    const target = { x: pixel(position[0]), y: pixel(position[1]), prompt, act };
    this.targets.push(target);
    sprite?.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.locked && !this.encounterOpen && this.distance(target) < INTERACTION_RADIUS) {
        act();
        this.emit();
      }
    });
  }

  private distance(target: Target): number {
    return Math.hypot(this.hero.x - target.x, this.hero.y - target.y);
  }

  private nearest(): Target | undefined {
    let candidate: Target | undefined;
    let distance = INTERACTION_RADIUS;
    for (const target of this.targets) {
      const current = this.distance(target);
      if (current < distance) {
        candidate = target;
        distance = current;
      }
    }
    return candidate;
  }

  private move(dx: number, dy: number, dt: number): void {
    const direction: Direction = dx ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    if (direction !== this.direction) {
      this.direction = direction;
      this.hero.setTexture(`hero${direction[0].toUpperCase()}${direction.slice(1)}`);
    }

    const previousCol = Math.floor(this.hero.x / TILE);
    const { x, y } = movePosition(this.tiles, this.solid, this.hero, dx, dy, dt);
    this.hero.x = x;
    this.hero.y = y;
    this.shadow.setPosition(this.hero.x, this.hero.y + 7);
    this.trackBridgeCrossing(previousCol);
  }



  // 机关改变地图后要重画，才能同时更新地块、碰撞格和互动目标。
  private useGateWinch(): void {
    if (this.sideGateOpen) {
      this.say(ruin.gate.alreadyOpen, 3200);
      return;
    }
    this.sideGateOpen = true;
    this.redrawRuin();
    this.say(ruin.gate.opening, 5200);
  }

  private takeLamp(): void {
    if (this.hasLamp) return;
    this.hasLamp = true;
    this.redrawRuin();
    this.say(ruin.lamp.acquired, 4600);
  }

  private bridgePrompt(): string {
    if (this.bridgeRevealed) return ruin.bridge.litPrompt;
    return this.hasLamp ? ruin.bridge.lampPrompt : ruin.bridge.brokenPrompt;
  }

  private inspectBridge(): void {
    if (this.bridgeRevealed) {
      this.say(ruin.bridge.alreadyLit, 2600);
      return;
    }
    if (!this.hasLamp) {
      this.say(ruin.bridge.beforeLamp, 5200);
      return;
    }
    this.bridgeRevealed = true;
    this.redrawRuin();
    this.say(ruin.bridge.revealed, 3800);
  }

  private trackBridgeCrossing(previousCol: number): void {
    if (this.area !== 'ruin' || !this.bridgeRevealed || this.crossedBridge) return;
    const col = Math.floor(this.hero.x / TILE);
    const row = Math.floor(this.hero.y / TILE);
    // 上桥时记住出发岸，走回原岸可以重新尝试，抵达对岸才完成任务。
    if (row === BRIDGE_ROW && col >= BRIDGE_START && col <= BRIDGE_END) {
      this.bridgeOrigin ??= previousCol < BRIDGE_START ? 'west' : 'east';
    } else if (this.bridgeOrigin && (col < BRIDGE_START || col > BRIDGE_END)) {
      const bank = col < BRIDGE_START ? 'west' : 'east';
      if (bank !== this.bridgeOrigin) {
        this.crossedBridge = true;
        this.say(ruin.bridge.crossed, 6000);
      }
      this.bridgeOrigin = undefined;
    }
  }



  // 战斗弹窗只预览这次伤害，收到确认后再扣血。休息点可以重复使用。
  private rest(): void {
    this.health = MAX_HEALTH;
    this.say(shared.rest.restored, 2800);
  }

  private encounter(): void {
    if (this.encounterOpen || this.sentinelDefeated) return;
    this.encounterOpen = true;
    this.clearInput();
    this.callbacks.onEncounter({
      name: ruin.sentinel.name, damage: SENTINEL_DAMAGE, health: this.health,
      confirm: () => {
        if (!this.encounterOpen) return;
        this.encounterOpen = false;
        if (SENTINEL_DAMAGE >= this.health) {
          this.say(ruin.sentinel.tooDangerous, 4400);
          return;
        }
        this.health -= SENTINEL_DAMAGE;
        this.sentinelDefeated = true;
        this.redrawRuin();
        this.say(ruin.sentinel.defeated, 3900);
      },
      cancel: () => {
        if (!this.encounterOpen) return;
        this.encounterOpen = false;
        this.clearInput();
        this.emit();
      },
    });
  }



  // 临时消息会短暂盖过附近物件的提示；状态有变化时才通知网页。
  private say(message: string, duration: number): void {
    this.note = message;
    this.noteUntil = this.elapsed + duration;
    this.emit();
  }

  private emit(): void {
    if (!this.hero) return;
    const state: GameState = {
      area: worldText[this.area].name,
      objective: this.objective(),
      prompt: this.noteUntil > this.elapsed ? this.note : this.nearest()?.prompt() ?? '',
      health: this.health,
      maxHealth: MAX_HEALTH,
      hasLamp: this.hasLamp,
      complete: this.crossedBridge,
    };
    const key = JSON.stringify(state);
    if (key === this.lastState) return;
    this.lastState = key;
    this.callbacks.onState(state);
  }

  private objective(): string {
    if (this.crossedBridge) return ruin.objectives.complete;
    if (this.area === 'waystation') return waystation.objective;
    if (this.bridgeRevealed) return ruin.objectives.crossBridge;
    if (this.hasLamp) return ruin.objectives.returnWithLamp;
    return ruin.objectives.findPath;
  }
}



// 把 Phaser 画布挂到网页，提供出门、触控和暂停所需的操作。
export function startGame(parent: HTMLElement, callbacks: GameCallbacks): GameControls {
  const scene = new Adventure(callbacks);
  new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#141322',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
    scene,
  });
  return {
    enterWorld: () => scene.enterWorld(),
    setDirection: (direction, pressed) => scene.setDirection(direction, pressed),
    interact: () => scene.interact(),
    pause: (paused) => scene.pause(paused),
  };
}
