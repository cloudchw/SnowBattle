import { _decorator, Component, Node, Prefab, instantiate, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TerrainGenerator')
export class TerrainGenerator extends Component {
    @property(Prefab)
    terrainPrefabs: Prefab[] = [];

    @property
    spawnInterval: number = 5;

    @property
    terrainLength: number = 20;

    private spawnTimer: number = 0;
    private lastTerrainEnd: number = 0;

    start() {
        this.spawnTimer = this.spawnInterval;
        this.spawnInitialTerrain();
    }

    spawnInitialTerrain() {
        // 生成初始地形
        for (let i = 0; i < 3; i++) {
            this.spawnTerrain();
        }
    }

    update(deltaTime: number) {
        this.spawnTimer -= deltaTime;
        
        if (this.spawnTimer <= 0) {
            this.spawnTerrain();
            this.spawnTimer = this.spawnInterval;
        }
    }

    spawnTerrain() {
        if (this.terrainPrefabs.length === 0) return;

        // 随机选择地形类型
        const randomIndex = Math.floor(Math.random() * this.terrainPrefabs.length);
        const terrainPrefab = this.terrainPrefabs[randomIndex];

        // 生成地形
        const terrain = instantiate(terrainPrefab);
        
        // 设置位置
        terrain.setPosition(new Vec3(this.lastTerrainEnd, 0, 0));
        
        // 添加到场景
        this.node.addChild(terrain);
        
        // 更新最后地形结束位置
        this.lastTerrainEnd += this.terrainLength;
    }
}