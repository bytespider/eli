var path = require('path');
var EE = require('events').EventEmitter;

var eli = module.exports = Object.create(EE.prototype, {constructor: {value: null, writable: true, configurable: true}});
EE.call(eli);

eli.package = require(path.resolve('package'));
eli.version = eli.package.version;
eli.config  = require(path.resolve('config'));

eli.plugins = 'plugins' in eli.config ? eli.config.plugins : ['eli-plugin-static'];
loadPlugins(eli);

eli.pubsub = createRedisConnection(eli.config);
eli.redis  = createRedisConnection(eli.config);

eli.pubsub.subscribe('eli.posts.publish');
eli.pubsub.subscribe('eli.posts.draft');

eli.pubsub.on('message', function (channel, message) {
    var action = channel.match(/publish|draft/);
    var count = EE.listenerCount(eli, action);

    console.log('Dispatching ‘%s’ to %d plugins.', action, count);
    eli.emit(action, message, cb);

    function cb() {
        count--;
        if (count == 0) {
            eli.emit(action + '-complete');
        }
    }
});

function createRedisConnection(config) {
    var redis   = require('redis');

    var host    = config.db.host    || 'localhost';
    var port    = config.db.port    || 6379;
    var options = config.db.options || null;

    return redis.createClient(port, host, options);
};


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
