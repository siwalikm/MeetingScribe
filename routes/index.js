const express = require('express');
const config = require('config');
const router = express.Router();
const GoogleCalendar = require('../clients/google-calendar');
const Messages = require('../clients/messages');
const RedisClient = require('../clients/redis-client');

const INTENTS = {
  START_MEETING: 'StartMeeting',
  CONCLUDE_MEETING: 'ConcludeMeeting',
  TASK: 'task',
  NOTE: 'note',
  TIMEBOX_MEETING: ''
};

const RedisExpiryTime = config.get('redis.global_expiry_time') || 1800;

/**
 * Webhooks that listens to the ApiAI and sends a respond back..
 * The response should be sent back within 5 seconds.
 **/
router.post('/', async function(req, res, next) {
  const body = req.body;
  const params = body.queryResult.parameters;
  const session = body.session;
  const intent = body.queryResult.intent.displayName;

  console.log('intent', intent);
  console.log('params', params);

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
      return handleMeetingCreate(options);
    case INTENTS.TASK:
      return handleTaskEvents(options);
    case INTENTS.NOTE:
      return handleNoteEvents(options);
    case INTENTS.TIMEBOX_MEETING:
      return Messages.unKnownIntent();
    case INTENTS.CONCLUDE_MEETING:
      return handleMeetingComplete(options);
    default:
      return Messages.unKnownIntent();
  }
}

async function handleTaskEvents(options) {
  const {session, intent, params} = options;
  const key = RedisClient.getMeetingKey(session);
  const value = await global.redisClient.getKey(key);

  if ( Object.keys(value).length === 0 ) { return Messages.unKnownIntent();}
  value.tasks.push({user: params.user, task: params.task});
  console.log('tasks', value.tasks);
  await global.redisClient.setKeyWithExpiry(key, value, RedisExpiryTime);

  return Messages.taskAdded(params);
}

async function handleNoteEvents(options) {
  const {session, intent, params} = options;
  const key = RedisClient.getMeetingKey(session);
  const value = await global.redisClient.getKey(key);

  if ( Object.keys(value).length === 0 ) { return Messages.unKnownIntent(); }
  value.notes.push(params.note);
  console.log('notes', value.notes);
  await global.redisClient.setKeyWithExpiry(key, value, RedisExpiryTime);

  return Messages.noteAdded(params);
}

async function handleMeetingCreate(options) {
  const {session, intent, params} = options;
  const googleCalendar = new GoogleCalendar();
  const summaries = await googleCalendar.getFutureEventsSummaries();

  if (summaries.length === 0) {
    // Send no events message.
    return Messages.unKnownIntent();

  } else if (summaries.length === 1) {
    const key = RedisClient.getMeetingKey( session);
    const value = {meeting_name: summaries[0], tasks: [], notes: []};

    await global.redisClient.setKeyWithExpiry(key, value, RedisExpiryTime);
    return Messages.meetingStarted(value);

  } else {
    // For now picking the first event. Use filters and whatever business logic we need here.
    const key = RedisClient.getMeetingKey( session);
    const value = {meeting_name: summaries[0], tasks: [], notes: []};

    await global.redisClient.setKeyWithExpiry( key, value, RedisExpiryTime);
    return Messages.meetingStarted(value);
  }
}

async function handleMeetingComplete(options) {
  // Get the tasks and notes and post it to confluence/dropbox.
  const {session, intent, params} = options;
  const key = RedisClient.getMeetingKey(session);
  const value = await global.redisClient.getKey(key);

  console.log('notes', value.notes);
  console.log('tasks', value.tasks);

  return Messages.meetingConcluded({meeting_name: value.meeting_name});
}

module.exports = router;
