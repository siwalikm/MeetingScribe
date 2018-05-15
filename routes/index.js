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
  TIMEBOX_MEETING: 'timeBox'
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
      return handleTimeBoxEvents(options);
    case INTENTS.CONCLUDE_MEETING:
      return handleMeetingComplete(options);
    default:
      return Messages.unKnownIntent();
  }
}

async function handleMeetingCreate(options) {
  const {session, intent, params} = options;
  const googleCalendar = new GoogleCalendar();
  const events = await googleCalendar.getFutureEvents();

  if (events.length === 0) { return Messages.unKnownIntent(); }

  const key = RedisClient.getMeetingKey(session);
  const value = {meeting_name: events[0].summary, tasks: [], notes: []};

  const endTime = events[0].endTime;
  const timeToComplete = GoogleCalendar.getTimeRemaining(endTime);
  console.log('time to complete', timeToComplete);

  if (timeToComplete > 0) {
    const time = Math.round(timeToComplete/0.8);
    meetingTimer(triggerMeetingAboutToEnd, time, options);
  }

  await global.redisClient.setKeyWithExpiry(key, value, RedisExpiryTime);
  return Messages.meetingStarted(value);
}

async function handleMeetingComplete(options) {
  // Get the tasks and notes and post it to confluence/dropbox.
  const {session, intent, params} = options;
  const key = RedisClient.getMeetingKey(session);
  const value = await global.redisClient.getKey(key);

  console.log('notes', value.notes);
  console.log('tasks', value.tasks);

  // Adding the note to the confluence/dropbox.

  return Messages.meetingConcluded({meeting_name: value.meeting_name});
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

async function handleTimeBoxEvents(options) {
  const {session, intent, params} = options;

  meetingTimer(timeBox, GoogleCalendar.convertToMilliSeconds(params.duration), options);
  params.time = getParamsForTimeBox(params.duration);
  return Messages.timeBoxing(params);
}

async function meetingTimer(callback, time, params = {}) {
  console.log('Inside meeting timer, setTimeout', time);
  setTimeout(callback, time, params);
}

function triggerMeetingAboutToEnd(params) {
    console.log('Trigger the intent that will notify organizer about the meeting to be ended', params);
}

function timeBox(params) {
  console.log('Time boxing the event', params);
}

function getParamsForTimeBox(duration) {
  if (duration.unit === 's') {
    return `${duration.amount} seconds`
  } else if (duration.unit === 'h') {
    return duration.amount === 1 ? `${duration.amount} hour` : `${duration.amount} hours`;
  } else if (duration.unit === 'min') {
    return duration.amount === 1 ? `${duration.amount} minute` : `${duration.amount} minutes`;
  }
}

module.exports = router;
