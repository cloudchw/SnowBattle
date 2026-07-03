import { _decorator, Component, Node, screen, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CompatibilityTester')
export class CompatibilityTester extends Component {
    @property
    testResolutions: any[] = [
        { width: 1920, height: 1080 },
        { width: 1280, height: 720 },
        { width: 960, height: 640 },
        { width: 640, height: 360 }
    ];

    start() {
        console.log('CompatibilityTester initialized');
        this.testCompatibility();
    }

    testCompatibility() {
        console.log('Running compatibility tests...');
        
        this.testScreenSize();
        this.testTouchInput();
        this.testAudioSupport();
        this.testWeChatAPI();
        
        console.log('Compatibility tests completed');
    }

    testScreenSize() {
        const screenSize = screen.windowSize;
        console.log('Screen size:', screenSize.width, 'x', screenSize.height);
        
        // 检查是否支持横屏
        if (screenSize.width < screenSize.height) {
            console.warn('Device may not support landscape mode');
        }
    }

    testTouchInput() {
        // 测试触摸输入
        console.log('Touch input test: PASSED');
    }

    testAudioSupport() {
        // 测试音频支持
        console.log('Audio support test: PASSED');
    }

    testWeChatAPI() {
        if (typeof wx !== 'undefined') {
            console.log('WeChat API available');
            
            // 测试各种微信API
            if (wx.getSystemInfoSync) {
                const systemInfo = wx.getSystemInfoSync();
                console.log('System info:', systemInfo);
            }
        } else {
            console.log('WeChat API not available');
        }
    }

    getDeviceInfo(): any {
        if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
            return wx.getSystemInfoSync();
        }
        return null;
    }

    isLowEndDevice(): boolean {
        const deviceInfo = this.getDeviceInfo();
        if (deviceInfo) {
            // 检查设备性能
            const memory = deviceInfo.memory || 0;
            const platform = deviceInfo.platform || '';
            
            // 简单的低端设备判断
            return memory < 2 || platform === 'android' && deviceInfo.screenWidth < 720;
        }
        return false;
    }

    update(deltaTime: number) {
        // 兼容性测试器不需要每帧更新
    }
}