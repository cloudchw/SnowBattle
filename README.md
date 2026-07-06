# 滑雪大冒险 (Snow Battle)

微信小游戏 - 2D横版卷轴无尽跑酷游戏

## 开发环境要求

### 必需软件
1. **Cocos Creator 3.8+**
   - 下载地址：https://www.cocos.com/creator
   - 选择 Cocos Creator 3.8.x 版本

2. **Node.js 16+**
   - 下载地址：https://nodejs.org/
   - 用于包管理和构建工具

3. **Git**
   - 下载地址：https://git-scm.com/
   - 版本控制

4. **微信开发者工具**
   - 下载地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
   - 用于调试和预览微信小游戏

### 可选软件
- **VS Code** - 代码编辑器
- **TypeScript** - 类型检查（已包含在项目中）

## 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd SnowBattle
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **打开 Cocos Creator**
   - 启动 Cocos Creator
   - 选择"打开项目"
   - 选择 `D:\GitHub\SnowBattle` 目录

4. **配置微信开发者工具**
   - 在 Cocos Creator 中选择"项目" -> "项目设置"
   - 在"微信小游戏"标签下填入你的 AppID
   - 如果没有 AppID，可以使用测试号

## 项目结构

```
SnowBattle/
├── assets/                  # 资源目录
│   ├── scripts/            # TypeScript/JavaScript 脚本
│   ├── scenes/             # 游戏场景文件
│   ├── resources/          # 动态加载的资源
│   ├── textures/           # 纹理和图片资源
│   ├── audio/              # 音频资源
│   └── prefabs/            # 预制体文件
├── settings/               # 项目设置
├── extensions/             # 扩展插件
├── package.json            # 项目配置
├── .gitignore              # Git 忽略文件
└── README.md               # 项目说明
```

## 开发指南

### 运行游戏
1. 在 Cocos Creator 中打开项目
2. 点击顶部工具栏的"播放"按钮
3. 在浏览器中预览游戏

### Agent Team 协作规范
- 项目级 Agent 规则见 `AGENTS.md`
- 详细角色定义与全任务 Team 流程见 `doc/guides/agent-team.md`

### 构建微信小游戏
1. 选择"项目" -> "构建发布"
2. 在"发布平台"中选择"微信小游戏"
3. 填写 AppID（如果没有可以留空，使用测试号）
4. 点击"构建"
5. 构建完成后，用微信开发者工具打开 `build/wechatgame` 目录

### 调试
- **浏览器调试**：使用 Chrome DevTools
- **真机调试**：使用微信开发者工具的真机调试功能
- **性能分析**：使用 Cocos Creator 的性能分析工具

## 游戏特性

- 横屏模式（16:9比例）
- 左侧控制：起跳/俯冲按钮
- 右侧控制：方向调整
- 无尽跑酷玩法
- 多种障碍物和道具
- 角色解锁系统
- 微信好友排行榜

## 技术栈

- **游戏引擎**：Cocos Creator 3.8+
- **开发语言**：TypeScript
- **目标平台**：微信小游戏
- **性能目标**：60FPS，<100MB内存，<10MB包大小

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

MIT License - 详见 LICENSE 文件
