var client = createDBConnection();
var pubsub = createDBConnection();

client.smembers('posts.publish', function (err, obj) {
    if (err) {
        throw new Error(err);
    }

    obj.forEach(function (post) {
        createStatic(post);
    });
});
client.smembers('posts.draft', function (err, obj) { /* do nothing with drafts for now */ });

pubsub.psubscribe('posts.publish.*');
pubsub.psubscribe('posts.draft.*');

pubsub.on('pmessage', function (pattern, channel, message) {
    var matches = channel.match(/posts.(publish|draft).(\d{4}\d{2}\d{2})/);
    client.sadd('posts.' + matches[1], matches[2]);
    channel_handlers[pattern](message);
});

function createDBConnection() {
    var redis   = require('redis');
    var config  = require('./config');

    var host    = config.db.host    || 'localhost';
    var port    = config.db.port    || 6379;
    var options = config.db.options || null;

    return redis.createClient(port, host, options);
}

function createStatic(post) {
    console.log(post);
}

var channel_handlers = {
    'posts.publish.*': function (message) {
        console.log(message);
    }
};
