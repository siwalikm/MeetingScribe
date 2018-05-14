const express = require('express');
const router = express.Router();

const ActionEnum = {
  START_MEETING: 0,
  STOP_MEETING: 1,
  NOTE_ACTION: 2,
  TASK_ACTION: 3,
  TIMEBOX_MEETING: 4,
  UNKNOWN_ACTION: 5,
};

router.get('/', function(req, res, next) {
  console.log('req', req);
  res.json({success: true});
});

// Webhooks that listens to the ApiAI and sends a response back..
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

function handleTaskEvents(session, res, params, payload = {}) {
  // Add task to the redis key/value pair.
  // The key will be the session.
}

function handleNoteEvents(session, res, params, payload = {}) {
  // Add note to the redis key/value pair.
  // The key will be the session.
}

async function handleMeetingCreate(session, params, payload = {}) {
  const message = '';
  const summaries = await global.googleCalendar.getFutureEventsSummaries();
  if (summaries.length === 0) {
    // Send no events message
  } else if (summaries.length === 1) {
    // Add the session key in the redis and start the event. Send the response back as event started.
  } else {
    // Send the both event back as a card and ask the user which event to start.
  }

  return message;
}

function handleMeetingComplete(session, res, params, payload = {}) {
  // Get the tasks and notes and post it to confluence/dropbox.
}

function getAction(params) {
  if (1) {
    return ActionEnum.NOTE_ACTION;
  }
  return ActionEnum.TASK_ACTION;
}


module.exports = router;
