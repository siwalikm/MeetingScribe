const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
  console.log('req', req);
  res.json({success: true});
});

// Webhooks that listens to the ApiAI.
router.post('/', function(req, res, next) {
  //  const payload = req.body.originalDetectIntentRequest.payload;
  //  Need to persist the conversation for the future reference.
  //  console.log('conversation ID', payload.conversation.conversationId);
  const params = req.body.queryResult.parameters;
  const session = req.body.session;

  console.log('session', session);
  console.log('params', params);

  // It's will be a switch case to filter the entities one by one.

  res.type('json');
  res.json(sendFinalMessage(params));
});

function sendFinalMessage(params) {
  return {
    "fulfillmentMessages": [
      {
        "platform": "ACTIONS_ON_GOOGLE",
        "simpleResponses": {
          "simpleResponses": [
            {
              "displayText": 'this is working fine',
              "ssml": `<speak>Assigned <break time="40ms"/> ${params.task} to <break time="40ms"/>${params.user}</speak>`
            }
          ]
        }
      }
    ]
  }
}

function handleTaskEvents(session, params, payload = {}) {
  // Add task to the redis key/value pair.
  // The key will be the session.
}

function handleNoteEvents(session, params, payload = {}) {
  // Add note to the redis key/value pair.
  // The key will be the session.
}

function handleMeetingCreate(session, params, payload = {}) {
  // Fetch the google calendar for this user and perform the business logic.
}

function handleMeetingComplete(session, params, payload = {}) {
  // Get the tasks and notes and post it to confluence/dropbox.
}

module.exports = router;
