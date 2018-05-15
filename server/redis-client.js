const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const redisClient = class RedisClient {
  constructor(options) {
     const client = redis.createClient(options);
     client.on('error', (err) => {
       console.log('error', err);
       process.exit(1); // Exit the node process on redis error.
     });

     client.on('connect', (data) => {
       global.redisClient = client;
     })
  }

  // Create session key with setex

  // Add the JSON to the session key.

  // Update the JSON in the session key.

};

module.exports = redisClient;