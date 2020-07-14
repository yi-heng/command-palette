const hx = require('hbuilderx');
const path = require('path');
const main = require('./src/main.js');
const base = require('./src/utils/base.js');
var check = require('./src/checkUpdate.js');

var isScanPlugin = false;

//该方法将在插件激活的时候调用
function activate(context) {

    var config = hx.workspace.getConfiguration();

    // form plugins/xxx/package.json, get third plugin command
    async function getThirdPluginsCommand() {
        if (!isScanPlugin) {
            await base.getPluginsCommands();
            isScanPlugin = true;
        }
    };

    let commandPalette = hx.commands.registerCommand('extension.commandPalette', (parm) => {
        let status = config.get('commandPalette.isDisable');
        if (status) {
            return hx.window.showErrorMessage('此插件已禁用, 若想使用, 请重新开启。', ['启用', '我再想想']).then(result => {
                if (result == '启用') {
                    config.update("commandPalette.isDisable", false).then(() => {
                        hx.commands.executeCommand('extension.commandPalette');
                    });
                };
            });
        } else {
            getThirdPluginsCommand();
            main.main(parm);
            check.checkUpdate();
        };
    });
    //订阅销毁钩子，插件禁用的时候，自动注销该command。
    context.subscriptions.push(commandPalette);
}
//该方法将在插件禁用的时候调用（目前是在插件卸载的时候触发）
function deactivate() {

}
module.exports = {
    activate,
    deactivate
}
