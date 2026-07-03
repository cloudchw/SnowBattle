'use strict';

// 场景脚本：运行在场景进程，与项目脚本同环境，可直接 require('cc')。
// 通过 addComponent(类名字符串) 挂载 @ccclass 注册的项目组件，
// 并把 GameApp 的 @property 字段指向各子系统组件实例。

const { Node, director, Canvas } = require('cc');

// [组件类名(@ccclass), GameApp 上对应的 @property 字段]
// 与 assets/scripts/core/GameApp.ts 的 @property 声明一一对应。
const SYSTEMS = [
  ['LevelSystem',     'levelSystem'],
  ['PlayerSystem',    'playerSystem'],
  ['ObstacleSystem',  'obstacleSystem'],
  ['WeatherSystem',   'weatherSystem'],
  ['CollectibleSystem','collectibleSystem'],
  ['PowerUpSystem',   'powerupSystem'],
  ['ScoringSystem',   'scoringSystem'],
  ['CharacterSystem', 'characterSystem'],
  ['InputSystem',     'inputSystem'],
  ['UIFramework',     'uiFramework'],
];

exports.methods = {
  async setupBoot() {
    const scene = director.getScene();
    if (!scene) {
      return JSON.stringify({
        error: '当前没有打开的场景。请先 文件→新建场景(Ctrl+N)，再 文件→保存场景(Ctrl+S) 存为 assets/scenes/Boot.scene，然后重试。',
      });
    }

    // Canvas（Cocos 新建场景默认带 Canvas；没有则补建）
    let canvas = scene.getChildByName('Canvas');
    if (!canvas) {
      canvas = new Node('Canvas');
      canvas.parent = scene;
      canvas.addComponent(Canvas);
    }

    // GameApp 节点
    let gameAppNode = canvas.getChildByName('GameApp');
    if (!gameAppNode) {
      gameAppNode = new Node('GameApp');
      gameAppNode.parent = canvas;
    }
    let gameApp = gameAppNode.getComponent('GameApp');
    if (!gameApp) gameApp = gameAppNode.addComponent('GameApp');

    const created = [];
    const warnings = [];
    for (const [cls, prop] of SYSTEMS) {
      let n = gameAppNode.getChildByName(cls);
      if (!n) { n = new Node(cls); n.parent = gameAppNode; }
      let comp = n.getComponent(cls);
      if (!comp) {
        try {
          comp = n.addComponent(cls);
        } catch (e) {
          warnings.push(`addComponent('${cls}') 失败: ${(e && e.message) || e}`);
          continue;
        }
      }
      try { gameApp[prop] = comp; } catch (e) {
        warnings.push(`绑定 GameApp.${prop} 失败: ${(e && e.message) || e}`);
      }
      created.push(cls);
    }

    return JSON.stringify({ ok: true, scene: scene.name, created, warnings });
  },
};
