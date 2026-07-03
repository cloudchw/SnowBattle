import { _decorator, Component, Node, director } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 主菜单 UI（Cocos Component）。
 * 绑定开始/设置/商店按钮节点并响应点击。
 */
@ccclass('MainMenuUI')
export class MainMenuUI extends Component {
  @property(Node)
  startButton: Node = null!;

  @property(Node)
  settingsButton: Node = null!;

  @property(Node)
  shopButton: Node = null!;

  start() {
    this.setupMenu();
  }

  private setupMenu(): void {
    if (this.startButton) {
      this.startButton.on('click', this.onStartClick, this);
    }
    if (this.settingsButton) {
      this.settingsButton.on('click', this.onSettingsClick, this);
    }
    if (this.shopButton) {
      this.shopButton.on('click', this.onShopClick, this);
    }
  }

  private onStartClick(): void {
    // TODO: 新架构主场景按 scene_config.json 的 "Main" 重建后，替换为正式场景名。
    director.loadScene('GameScene');
  }

  private onSettingsClick(): void {
    // TODO: 打开设置界面
  }

  private onShopClick(): void {
    // TODO: 打开商店界面
  }
}
