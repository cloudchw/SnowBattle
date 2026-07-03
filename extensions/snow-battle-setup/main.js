'use strict';

// 扩展进程入口：响应菜单，调用场景脚本完成节点树搭建，然后保存场景。
// 注意：Cocos 3.8 扩展进程日志用 console.*（会转发到编辑器控制台），
//       对话框用 Editor.Dialog.showMessageBox（electron 风格）。
exports.methods = {
  async setupBootScene() {
    console.log('[SnowBattle] 开始搭建 Boot 场景...');

    let raw;
    try {
      raw = await Editor.Message.request('scene', 'execute-scene-script', {
        name: 'snow-battle-setup',   // 对应 package.json 的 name
        method: 'setupBoot',         // scene-setup.js 导出的方法
        args: [],
      });
    } catch (e) {
      const msg = (e && e.message) ? e.message : String(e);
      console.error('[SnowBattle] 调用场景脚本失败: ' + msg);
      try {
        await Editor.Dialog.showMessageBox({
          type: 'error',
          title: 'SnowBattle',
          message: '调用场景脚本失败: ' + msg + '\n\n请确认已在编辑器里打开一个场景。',
          buttons: ['确定'],
        });
      } catch (_) { /* Dialog 不可用时忽略 */ }
      return;
    }

    let res;
    try { res = JSON.parse(raw); } catch (_) { res = { raw }; }

    if (res.error) {
      console.error('[SnowBattle] ' + res.error);
      try {
        await Editor.Dialog.showMessageBox({
          type: 'warning', title: 'SnowBattle', message: res.error, buttons: ['确定'],
        });
      } catch (_) { /* ignore */ }
      return;
    }

    // 持久化：保存当前场景
    try {
      await Editor.Message.request('scene', 'save-scene');
      console.log('[SnowBattle] 场景已保存');
    } catch (e) {
      console.warn('[SnowBattle] 自动保存失败，请手动 Ctrl+S 保存: ' + ((e && e.message) || e));
    }

    const created = res.created || [];
    const warnings = res.warnings || [];
    const msg =
      '搭建完成！\n' +
      '场景: ' + (res.scene || '(未命名)') + '\n' +
      '已创建/绑定: ' + (created.length ? created.join(', ') : '(无)') +
      (warnings.length ? '\n\n警告:\n- ' + warnings.join('\n- ') : '');
    console.log('[SnowBattle] ' + msg.replace(/\n/g, ' | '));
    try {
      await Editor.Dialog.showMessageBox({
        type: 'info', title: 'SnowBattle', message: msg, buttons: ['确定'],
      });
    } catch (_) { /* ignore */ }
  },
};
