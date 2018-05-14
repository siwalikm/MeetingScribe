const ApiAi = require('api.ai');
const uuid = require('uuid');

const TOKEN = '00c89b83492e4bac9309033a2d8f13d8';
//const SECRET = 'cfd137e7f3d0451e867db61dffad3e02';

const aiClient =class AiClient {

  constructor(options) {
    global.apiAiClient = new ApiAi({
      token: TOKEN,
      session: uuid(),
    });
  }
};

module.exports = aiClient;