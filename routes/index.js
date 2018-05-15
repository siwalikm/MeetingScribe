const express = require('express');
const router = express.Router();
const GoogleCalendar = require('../server/google-calendar');
const Messages = require('../server/messages');

const ActionEnum = {
  START_MEETING: 0,
  STOP_MEETING: 1,
  NOTE_ACTION: 2,
  TASK_ACTION: 3,
  TIMEBOX_MEETING: 4,
  UNKNOWN_ACTION: 5,
};

const INTENTS = {
  START_MEETING: 'StartMeeting',
  CONCLUDE_MEETING: 'ConcludeMeeting',
  TASK: 'task',
  NOTE: 'note',
  TIMEBOX_MEETING: ''
};

/**
 * Webhooks that listens to the ApiAI and sends a respond back..
 * The response should be sent back within 5 seconds.
 **/
router.post('/', async function(req, res, next) {
  const body = req.body;
  const params = body.queryResult.parameters;
  const session = body.session;
  const intent = body.queryResult.intent.displayName;

//  console.log('session', session);
//  console.log('params', params);
  console.log('intent', intent);

  // switch case based on intent and perform the actions.
  const message = await getMessage({session, intent, params});

  res.type('json');
  res.json(message);
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

function getMessage(options) {
  const {session, intent, params} = options;

  switch (intent) {
    case INTENTS.START_MEETING:
      break;
    case INTENTS.TASK:
      return handleTaskEvents(options);
    case INTENTS.NOTE:
      break;
    case INTENTS.TIMEBOX_MEETING:
      break;
    case INTENTS.CONCLUDE_MEETING:
      break;
    default:
      return Messages.unKnownIntent();
  }
}

function handleTaskEvents(options) {
  // Add task to the redis key/value pair.
  // The key will be the session.
  const {session, intent, params} = options;

  return Messages.taskAdded(params);
}

function handleNoteEvents(session, res, params, payload = {}) {
  // Add note to the redis key/value pair.
  // The key will be the session.
}

async function handleMeetingCreate(session, params, payload = {}) {
  const message = '';
  const googleCalendar = new GoogleCalendar();
  const summaries = await googleCalendar.getFutureEventsSummaries();

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
