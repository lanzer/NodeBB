
'use strict';

var nconf = require('nconf');
var util = require('util');
var winston = require('winston');
var EventEmitter = require('events').EventEmitter;
var pg = require('pg');

var PubSub = function (pool, subClient) {
	var self = this;

	this.pool = pool;

	subClient.connect(function (err) {
		if (err) {
			winston.error(err);
			return;
		}

		subClient.query('LISTEN pubsub', function (err) {
			if (err) {
				winston.error(err);
			}
		});

		subClient.on('notification', function (message) {
			if (message.channel !== 'pubsub') {
				return;
			}

			try {
				var msg = JSON.parse(message.payload);
				self.emit(msg.event, msg.data);
			} catch (err) {
				winston.error(err.stack);
			}
		});
	});
};

util.inherits(PubSub, EventEmitter);

PubSub.prototype.publish = function (event, data) {
	this.pool.query({
		name: 'pubSubPublish',
		text: `SELECT pg_notify('pubsub', $1::TEXT)`,
		values: [JSON.stringify({ event: event, data: data })],
	});
};

module.exports = function (pool, postgresModule, connString) {
	if (!nconf.get('redis')) {
		postgresModule.pubsub = new PubSub(pool, new pg.Client(connString));
	}
};
