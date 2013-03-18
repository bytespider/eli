var pubsub = require('redis-pubsub');
var config = require('config');

var host = config.server.host || 'localhost';
var port = config.server.port || 6379;

// Subscribe to channel 'foobar' on a local server.
var channel = pubsub.createChannel(port, host, 'posts.publish.*');
channel.on('ready', function() {
    channel.on('message', function(msg) {
        console.log(msg.greeting);
        channel.end();
    });
    channel.send({ greeting: 'Hello world!' });
});
