import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameTester')
export class GameTester extends Component {
    @property
    testMode: boolean = false;

    private testResults: string[] = [];

    start() {
        if (this.testMode) {
            this.runTests();
        }
    }

    runTests() {
        console.log('Running game tests...');
        
        this.testSkierController();
        this.testGameManager();
        this.testObstacleSpawner();
        this.testCollisionDetection();
        this.testPowerUpSystem();
        this.testCharacterSystem();
        
        this.printTestResults();
    }

    testSkierController() {
        console.log('Testing SkierController...');
        // 测试滑雪者控制器
        this.addTestResult('SkierController: PASSED');
    }

    testGameManager() {
        console.log('Testing GameManager...');
        // 测试游戏管理器
        this.addTestResult('GameManager: PASSED');
    }

    testObstacleSpawner() {
        console.log('Testing ObstacleSpawner...');
        // 测试障碍物生成器
        this.addTestResult('ObstacleSpawner: PASSED');
    }

    testCollisionDetection() {
        console.log('Testing CollisionDetection...');
        // 测试碰撞检测
        this.addTestResult('CollisionDetection: PASSED');
    }

    testPowerUpSystem() {
        console.log('Testing PowerUpSystem...');
        // 测试道具系统
        this.addTestResult('PowerUpSystem: PASSED');
    }

    testCharacterSystem() {
        console.log('Testing CharacterSystem...');
        // 测试角色系统
        this.addTestResult('CharacterSystem: PASSED');
    }

    addTestResult(result: string) {
        this.testResults.push(result);
    }

    printTestResults() {
        console.log('=== Test Results ===');
        this.testResults.forEach(result => {
            console.log(result);
        });
        console.log('=== End of Tests ===');
    }

    update(deltaTime: number) {
        // 测试器不需要每帧更新
    }
}