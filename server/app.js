const config = require('config');
const expressApp = require('./server');
const redisClient = require('../clients/redis-client');

const redisOptions = {
  host: config.get('redis.host') || '127.0.0.1',
  port: config.get('redis.port') || '6379'
};

global.redisClient = new redisClient(redisOptions);
new expressApp(redisOptions);
