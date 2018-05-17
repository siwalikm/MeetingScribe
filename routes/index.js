const express = require('express');
const config = require('config');
const request = require('request-promise-native');
const router = express.Router();
const GoogleCalendar = require('../clients/google-calendar');
const Messages = require('../clients/messages');
const Confluence = require('../clients/sendToConfluence');
const RedisClient = require('../clients/redis-client');
const mailer = require('nodemailer');
var EmailTemplate = require('email-templates').EmailTemplate;

const INTENTS = {
  START_MEETING: 'StartMeeting',
  CONCLUDE_MEETING: 'ConcludeMeeting',
  TASK: 'task',
  NOTE: 'note',
  TIMEBOX_MEETING: 'timeBox',
  CC_EMAIL: 'ccEmail',
  CUSTOM_TIMER: 'customTimer' // For timebox custom intents.
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

  const message = await getMessage({session, intent, params}, body.queryResult);
  console.log('message', message);
  res.type('json');
  res.json(message);
});

function getMessage(options, queryResult) {
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
    case INTENTS.CC_EMAIL:
      return handleCCEmail(options);
    case INTENTS.CUSTOM_TIMER:
      return handleCustomTimer(options, queryResult);
    default:
      return Messages.unKnownIntent();
  }
}

async function handleCustomTimer(options, queryResult) {
  const {session, intent, params} = options;
  const conversation = queryResult.outputContexts[0].parameters.conversation;
  console.log('conversation', conversation);
  return Messages.customTimeboxing(conversation);
}

async function handleCCEmail(options) {
  const {session, intent, params} = options;

  return Messages.ccEmail(params);
}

async function handleMeetingCreate(options) {
  const {session, intent, params} = options;
  const googleCalendar = new GoogleCalendar();
  const events = await googleCalendar.getFutureEvents();
  
  if (events.length === 0) { return Messages.NoEvents(); }
  to_email = events[0].attendees.map(attendees => attendees.email)
  const key = RedisClient.getMeetingKey(session);
  const meetingAttendees = JSON.stringify(events[0].attendees);
  const value = { meeting_name: events[0].summary, tasks: [], notes: [], attendees: meetingAttendees,email: to_email};

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
  sendEmail(value.notes, value.tasks, value.meeting_name, value.email)

  // let confDocBody = ;
  await createConfluenceDocument(value.meeting_name,
    Confluence.constructResponse({ meetingData: value }));
  return Messages.meetingConcluded({meeting_name: value.meeting_name});
}

function createConfluenceDocument(meetingName, documentBody) {
var options = { 
  url: 'https://astronots.atlassian.net/wiki/rest/api/content/',
  method: 'POST',
  headers: 
   { 'Cache-Control': 'no-cache',
     Authorization: 'Basic xxxxxxxxxxxxxxxxxxxx',
     'Content-Type': 'application/json' },
  body: { type: 'page',
      title: `MoM for ${meetingName}`,
     space: { key: 'MARS' },
     body: 
      { storage: 
         { value: `${documentBody}`,
           representation: 'storage' } } },
  json: true };

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});
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
    // Call the custom intent customTimer.
    // We have to call the google assistant.
}

function timeBox(params) {
  console.log('Time boxing the event', params);
  const session = params.session;
  const sessionId = getSessionFromBody(session);
  console.log('timeBox sessionID', sessionId)

  const data = {
    event: {
      name: 'custom_event',
      data: {
        name: params.params.conversation
      }
    },
    'timezone':'America/New_York',
    'lang':'en',
    'sessionId': sessionId
  };

  const options = {
    url: 'https://api.dialogflow.com/api/query?v=20180515',
    method: 'POST',
    json: data,
    headers: {
      'User-Agent': 'my request',
      'Authorization': 'Bearer 04b1df3c2be843f39c077ca4b2e89c92',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  request(options, (error, response, body) =>{
    console.log('response', response);
  })


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
function sendEmail(notes, tasks, meetingName,email){
  note_count = 0;
  task_count =0;
  //time = `Time ${google_meeting_time}`
  note_header = "<br><b>.Meeting Notes : </b> <br>"
  html_notes = notes.map((note) => {
      return `<b> ${note_count++} . ${note} </b><br>`
  });
  html_notes = html_notes.join('')
  html_task = tasks.map(task => {
      return `<b> @${task.user} - ${task.task}</b><br>`
  });
    html_task = html_task.join('')
    var transporter = mailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'wildcards-admin@freshbugs.com',
            pass: 'freshdesk12345'
        }
    });
    task_header = "<br> Action Items : <br>"
  final_html = note_header+html_notes+ task_header +html_task;
    var mailOptions = {
        from: 'wildcards-admin@freshbugs.com',
        to: email.toString(),
        subject: `MoM for ${meetingName}`,
        text: 'That was easy!',
        html: final_html
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}
function getSessionFromBody(session) {
  const arr = session.split('/');
  return arr[arr.length - 1];
}

module.exports = router;
