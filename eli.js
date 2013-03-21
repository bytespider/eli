var path = require('path');
var EE = require('events').EventEmitter;

var eli = module.exports = Object.create(EE.prototype, {constructor: {value: null, writable: true, configurable: true}});
EE.call(eli);

eli.package = require(path.resolve('package'));
eli.version = eli.package.version;
eli.config  = require(path.resolve('.', 'config'));

eli.plugins = 'plugins' in eli.config ? eli.config.plugins : ['eli-plugin-static'];
loadPlugins(eli);

eli.pubsub = createRedisConnection(eli.config);
eli.redis  = createRedisConnection(eli.config);

eli.pubsub.subscribe('eli.posts.publish');
eli.pubsub.subscribe('eli.posts.draft');

eli.pubsub.on('message', function (channel, message) {
    var action = channel.match(/publish|draft/);
    if (!action) {
        return;
    }

    // parse message into post and metadata
    var message_data = parseMessage(message);
    if (message_data == null) {
        return;
    }

    var count = EE.listenerCount(eli, action);

    console.log('Dispatching ‘%s’ to %d plugins.', action, count);
    eli.emit(action, message_data.post, message_data.metadata || {}, cb);

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
        var node_modules = path.resolve('node_modules');
        try {
            return require(path.resolve(node_modules, plugin))(eli);
        } catch (err) {
            // plugin could not be loaded
            console.log('Eli plugin ‘%s’ could not be loaded.', plugin);
            console.error(err);
        }
    }
}

function parseMessage(message) {
    var message_data = JSON.parse(message);
    if (!('post' in message_data)) {
       return null;    
    }

    var post = message_data.post;
    delete message_data.post;

    return {
        post: post, 
        metadata: message_data
    };
}
