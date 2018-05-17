const redis = require('redis');


const redisClient = class RedisClient {
  static getMeetingKey(session) {
    return `meeting:${session}`;
  }

  constructor(options) {
     const client = redis.createClient(options);
     client.on('error', (err) => {
       console.log('error', err);
       process.exit(1); // Exit the node process on redis error.
     });

     client.on('connect', async(data) => {
       this.redisInstance = client;
     })
  }

  setKeyWithExpiry(key, val, time) {
    return new Promise((resolve, reject) => {
      this.redisInstance.set(key, JSON.stringify(val), 'EX', time, (err) => {
        if (err) {
          reject();
        }
        resolve();
      });
    });

  }

  getKey(key) {
    return new Promise(((resolve, reject) => {
      this.redisInstance.get(key, (err, data) => {
        if (err) {
          resolve({});
        }
        resolve(JSON.parse(data || '{}'));
      })
    }))
  }

  ifExists(key) {
    return new Promise(((resolve, reject) => {
      this.redisInstance.EXISTS(key, (err, data) => {
        if (err) {
          resolve({});
        }
        resolve(JSON.parse(data));
      })
    }))
  }

  // Add the JSON to the session key.

  // Update the JSON in the session key.

};

module.exports = redisClient;