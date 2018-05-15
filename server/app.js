const config = require('config');
const expressApp = require('./server');
const redisClient = require('./redis-client');

const redisOptions = {
  host: config.get('redis.host') || '127.0.0.1',
  port: config.get('redis.port') || '6379'
};

new redisClient(redisOptions); // This will set the redisClient in a global variable
new expressApp(redisOptions);
