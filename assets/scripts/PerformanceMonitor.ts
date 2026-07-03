import { _decorator, Component, Node, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PerformanceMonitor')
export class PerformanceMonitor extends Component {
    @property
    targetFPS: number = 60;

    @property
    maxMemoryUsage: number = 100; // MB

    private currentFPS: number = 0;
    private frameCount: number = 0;
    private lastTime: number = 0;
    private memoryUsage: number = 0;

    start() {
        console.log('PerformanceMonitor initialized');
        this.lastTime = Date.now();
    }

    update(deltaTime: number) {
        this.frameCount++;
        
        const currentTime = Date.now();
        const elapsed = currentTime - this.lastTime;
        
        if (elapsed >= 1000) {
            this.currentFPS = this.frameCount / (elapsed / 1000);
            this.frameCount = 0;
            this.lastTime = currentTime;
            
            this.checkPerformance();
        }
    }

    checkPerformance() {
        // 检查FPS
        if (this.currentFPS < this.targetFPS * 0.9) {
            console.warn('FPS below target:', this.currentFPS, 'Target:', this.targetFPS);
        }
        
        // 检查内存使用
        this.memoryUsage = this.getMemoryUsage();
        if (this.memoryUsage > this.maxMemoryUsage) {
            console.warn('Memory usage too high:', this.memoryUsage, 'MB');
        }
    }

    getMemoryUsage(): number {
        // 获取内存使用情况
        // 这里可以使用微信小游戏的性能API
        if (typeof wx !== 'undefined' && wx.getPerformance) {
            const performance = wx.getPerformance();
            const memory = performance.memory;
            if (memory) {
                return memory.usedJSHeapSize / 1024 / 1024; // 转换为MB
            }
        }
        return 0;
    }

    getCurrentFPS(): number {
        return this.currentFPS;
    }

    getMemoryUsageMB(): number {
        return this.memoryUsage;
    }

    isPerformanceGood(): boolean {
        return this.currentFPS >= this.targetFPS * 0.9 && 
               this.memoryUsage <= this.maxMemoryUsage;
    }
}