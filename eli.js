var path = require('path');
var EE = require('events').EventEmitter;

var faye = require('faye');

var eli = module.exports = Object.create(EE.prototype, {constructor: {value: null, writable: true, configurable: true}});
EE.call(eli);

eli.package = require(path.resolve('package'));
eli.version = eli.package.version;
eli.config  = require(path.resolve('.', 'config'));

eli.plugins = 'plugins' in eli.config ? eli.config.plugins : ['eli-plugin-static'];
loadPlugins(eli);


eli.pubsub = new faye.NodeAdapter({ mount: '/', timeout: 45 });
eli.client = eli.pubsub.getClient();

eli.client.subscribe('eli.posts', function (message) {
    console.log('Message received: ‘%s’', message);

    // parse message into post and metadata
    console.log('Parsing data...');
    var message_data = parseMessage(message);
    console.log('Parsed message data: ', message_data);

    if (!message_data) {
        console.error('No message data found.');
        return;
    }

    var action = message_data.action;

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

function loadPlugins(eli) {
    var plugins = eli.plugins;
    plugins.forEach(loadPluginsIterator);

    function loadPluginsIterator(plugin, i, plugins) {
        var node_modules = path.resolve('node_modules');
        var module_path = path.resolve(node_modules, plugin);

        try {
            var plugin = require(module_path);
            return plugin(eli);
        } catch (error) {
            console.error(error);
        }
        
        return false;
    }
}

function parseMessage(message) {
    try {
        var message_data = JSON.parse(message.toString());
    } catch (err) {
        console.error(err);
        return;
    }
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
