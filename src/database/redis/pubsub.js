'use strict';

var nconf = require('nconf');
var util = require('util');
var winston = require('winston');
var EventEmitter = require('events').EventEmitter;

var channelName;

var PubSub = function (redisModule) {
	var self = this;
	var subClient = redisModule.connect();
	this.pubClient = redisModule.connect();

	channelName = 'db:' + nconf.get('redis:database') + 'pubsub_channel';
	subClient.subscribe(channelName);

	subClient.on('message', function (channel, message) {
		if (channel !== channelName) {
			return;
		}

		try {
			var msg = JSON.parse(message);
			self.emit(msg.event, msg.data);
		} catch (err) {
			winston.error(err.stack);
		}
	});
};

util.inherits(PubSub, EventEmitter);

PubSub.prototype.publish = function (event, data) {
	this.pubClient.publish(channelName, JSON.stringify({ event: event, data: data }));
};

module.exports = function (redisClient, redisModule) {
	redisModule.pubsub = new PubSub(redisModule);
};
