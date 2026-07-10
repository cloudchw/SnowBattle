// 微信小游戏运行时全局对象 wx 的最小类型声明。
// 微信小游戏环境注入 wx 全局；浏览器预览等非微信环境下不存在，
// 调用方必须先用 `typeof wx === 'undefined'` 守卫再访问。
// 仅声明为 any 以兼容平台动态 API；具体 API 形状由各 Bridge/System 在使用处约束。
// 本文件位于 assets/scripts/types/（eslint 已忽略），故 no-explicit-any 不触发。
declare const wx: any;
