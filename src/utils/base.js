const os = require('os');
const fs = require('fs');
const readFile = require("util").promisify(fs.readFile);

const path = require('path');
const hx = require('hbuilderx');

const JSONC = require('json-comments');

// 扫描目录时排除这些目录
const excludeOther = ['.DS_Store', 'package-lock.json', 'etc']
const excludePluginList = [
    'about', 'hbuilder.root', 'snippet', 'pm', 'ls','SVN','Git',
    'format-prettier','format','formator-stylus-supremacy','formator-prettier',
    'css', 'css-language-features', 'html', 'javascript',
    'jshint', 'eslint-js', 'eslint-vue',
    'node', 'jre', 'npm', 'node_modules', 'nodeserver',
    'qtwebengine', 'hxsimplebrowser', 'cef3', 'qrencode',
    'builtincef3browser','builtincef3terminal',
    'templates', 'akamud.vscode-theme-onedark-2.1.0',
    'theme-default', 'theme-icons-default', 'theme-icons-default-colorful',
    'theme-seti', 'theme-vsode', 'builtinterminal','builtinbrowser' ,'plugin-manager',
    'weapp-tools', 'uniapp', 'uniapp-cli','uniapp-debugger' ,'launcher',
    'command-palette',
    'compile-es6','compile-less','compile-node-sass','compile-pug-cli','compile-stylus',
    'compile-typescript','compile-coffeescript','typescript','typescript-server',
    'php', 'php-intellisense','php-cs-fixer',
    'validate-html','validate-stylelint'
];

/**
 * @description 目录遍历
 * @param {Object} dir
 * @param {Object} filelist
 */
var fileList = [];
var walkSync = function(dir, filelist) {
    filelist = filelist || [];
    files = fs.readdirSync(dir);
    // 过滤文件
    files = files.filter(item =>
        !excludePluginList.includes(item) && !excludeOther.includes(item)
    );

    const hxPluginDir = path.join(hx.env.appRoot, 'plugins');
    files.forEach(function(file) {
        let packagePath = path.join(hxPluginDir, file, 'package.json');
        if (fs.existsSync(packagePath)) {
            filelist.push(file);
        };
    });
    return filelist;
};

/**
 * @description 获取HBuilderX本机已安装的插件列表
 */
function getLocalInstalledPluginsList(hxPluginDir) {
    return new Promise((resolve, reject) => {
        let newData = walkSync(hxPluginDir);
        if (newData) {
            resolve(newData)
        } else {
            reject([])
        }
    });
};

/**
 * @description 从package.json获取插件详情
 * @param {Object} hxPluginDir
 * @param {String} pluginName
 */
async function getPluginDetails(hxPluginDir, pluginName) {
    var info = {
        "pluginName": pluginName,
        "displayName": '',
        "data": []
    }
    try {
        let packagePath = path.join(hxPluginDir, pluginName, 'package.json');
        let fr = await readFile(packagePath, "utf-8");
        const FileContext = JSONC.parse(fr);
        if (FileContext) {
            if (FileContext.hasOwnProperty('contributes')) {
                if (FileContext.contributes.hasOwnProperty('commands')) {
                    info['data'] = FileContext.contributes.commands;
                };
            };
            if (FileContext.hasOwnProperty('displayName')) {
                info["displayName"] = FileContext.displayName;
            }
        };
        return info;
    } catch (err) {
        return info;
    }
};

/**
 * @description get hx plugins commands info
 */
async function getPluginsCommands() {
    console.log('[command-palette] start read third plugins package.json.....');

    // check user config
    let config = hx.workspace.getConfiguration();
    let isShowThirdPluginCommand = config.get('commandPalette.isShowThirdPluginCommand');
    if (!isShowThirdPluginCommand) {
        return []
    };

    // get hx base info
    let hxPluginDir = path.join(hx.env.appRoot, 'plugins');

    // get local HBuilderX installed list
    var installedPluginsList = await getLocalInstalledPluginsList(hxPluginDir);

    const promises = installedPluginsList.map(pluginName => {
        return getPluginDetails(hxPluginDir, pluginName);
    });

    var result = [];
    Promise.all(promises).then(function(plugins) {
        for (let p of plugins) {
            if ('data' in p && 'pluginName' in p) {
                if (p.data.length || p.data !== undefined) {
                    let tmp1 = p.data.map(function(v) {
                        let commandInfo = {
                            'label': v['title'],
                            'description': p.pluginName,
                            'command': v['command'],
                            'type': 'plugin_command',
                            'pluginName': p.pluginName
                        };
                        if (p.displayName.length < 15) {
                            commandInfo.label = p.displayName + ': ' + v['title']
                        };
                        return commandInfo;
                    });
                    result = [...result, ...tmp1];
                };
            };
        };
        if (result.length !== 0) {
            let fpath = path.join(__dirname,'thirdPlugin.json');
            let str = JSON.stringify(
                {"commands":result,"installedPluginsList":installedPluginsList},"","\t"
            );
            fs.writeFile(fpath, str, function(err) {
                if (err) {
                    console.log('[command-palette] 读取其他插件command命令菜单错误.....',err)
                }
            });  
        }
        console.log('[command-palette] read end.....');
    });
}

module.exports = {
    getPluginsCommands
}
