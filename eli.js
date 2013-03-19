var path = require('path');
var EE = require('events').EventEmitter;

var eli = module.exports = Object.create(EE.prototype, {constructor: {value: null, writable: true, configurable: true}});
EE.call(eli);

eli.package = require(path.resolve('package'));
eli.version = eli.package.version;
eli.config  = require(path.resolve('config'));

eli.plugins = ('plugins' in eli.config ? eli.config.plugins : []).concat(['eli-plugin-static']);
loadPlugins(eli);


eli.pubsub = createRedisConnection(eli.config);


eli.pubsub.subscribe('eli.posts');

eli.pubsub.on('message', function (channel, message) {
    var matches = channel.match(/publish|draft/);
    var event = matches[0];
    eli.plugins.forEach(function (plugin, i, plugins) {
        postPluginMessage(plugin, event, message);
    });
});

console.log(eli);
eli.emit('publish', 'some text');

function createRedisConnection(config) {
    var redis   = require('redis');

    var host    = config.db.host    || 'localhost';
    var port    = config.db.port    || 6379;
    var options = config.db.options || null;

    return redis.createClient(port, host, options);
}

function loadPlugins(eli) {
    var plugins = eli.plugins;
    plugins.forEach(loadPluginsIterator);

    function loadPluginsIterator(plugin, i, plugins) {
        try {
            return require(plugin)(eli);
        } catch (err) {
            // plugin could not be loaded
            console.log('Eli plugin ‘%s’ could not be loaded.', plugin);
            console.error(err);
        }
    }
}

function postPluginMessage(plugin, event, message) {
    plugin = require(plugin);
    event = 'on' + event;
    event in plugin ? plugin[event](message) : null;
}
