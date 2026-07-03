import { _decorator, Component, Node, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MainMenuUI')
export class MainMenuUI extends Component {
    @property
    startButton: Node = null;

    @property
    settingsButton: Node = null;

    @property
    shopButton: Node = null;

    start() {
        // 初始化主菜单
        this.setupMenu();
    }

    setupMenu() {
        console.log('MainMenuUI initialized');
        
        // 设置按钮事件
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

    onStartClick() {
        console.log('Start button clicked');
        // 加载游戏场景
        director.loadScene('GameScene');
    }

    onSettingsClick() {
        console.log('Settings button clicked');
        // 打开设置界面
    }

    onShopClick() {
        console.log('Shop button clicked');
        // 打开商店界面
    }

    update(deltaTime: number) {
        // 主菜单UI不需要每帧更新
    }
}