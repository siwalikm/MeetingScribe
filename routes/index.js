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
  EMAIL: 'email',
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
    case INTENTS.EMAIL:
      return handleEmailEvents(options);
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
    const key = global.redisKey || await setupMeetingSession();
    const value = await global.redisClient.getKey(key);

    if (Object.keys(value).length === 0) {
        return Messages.unKnownIntent();
    }
    if (params.email) {
        value.cc_email.push(params.email);
    }
    await global.redisClient.setKeyWithExpiry(key, value, RedisExpiryTime);
    return Messages.ccEmail(params);
}

async function setupMeetingSession() {
  const googleCalendar = new GoogleCalendar();
  const events = await googleCalendar.getFutureEvents();
  if (events.length === 0) { return Messages.NoEvents(); }
  const calendarEvent = events[0];
  let to_email = calendarEvent.attendees.map(attendees => attendees.email);
  const key = RedisClient.getMeetingKey(calendarEvent.meetingId);
  const meetingAttendees = JSON.stringify(calendarEvent.attendees);
  return key;
}

async function handleMeetingCreate(options) {
  const {session, intent, params} = options;
  const googleCalendar = new GoogleCalendar();
  const events = await googleCalendar.getFutureEvents();
  if (events.length === 0) { return Messages.NoEvents(); }
  const calendarEvent = events[0];
  let to_email = calendarEvent.attendees.map(attendees => attendees.email);
  const key = RedisClient.getMeetingKey(calendarEvent.meetingId);
  const meetingAttendees = JSON.stringify(calendarEvent.attendees);
  let keyPresent = await global.redisClient.ifExists(key);
  if (!keyPresent) {   
    const value = { cc_email: [], meeting_name: calendarEvent.summary, tasks: [], notes: [], attendees: meetingAttendees,email: to_email, time_track:[]};
  
    const endTime = calendarEvent.endTime;
    const timeToComplete = GoogleCalendar.getTimeRemaining(endTime);
    console.log('time to complete', timeToComplete);
  
    if (timeToComplete > 0) {
      const time = Math.round(timeToComplete/0.8);
      meetingTimer(triggerMeetingAboutToEnd, time, options);
    }
  
    await global.redisClient.setKeyWithExpiry(key, value, RedisExpiryTime);
    global.redisKey = key;
    return Messages.meetingStarted(value);
  } else {
    value = await global.redisClient.getKey(key);
    return Messages.meetingStarted(value);
  }
}

async function handleMeetingComplete(options) {
  // Get the tasks and notes and post it to confluence/dropbox.
  const {session, intent, params} = options;
  const key = global.redisKey || await setupMeetingSession();
  const value = await global.redisClient.getKey(key);

  console.log('notes', value.notes);
  console.log('tasks', value.tasks);

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
      Authorization: `Basic ${config.get('confluence.key')}`,
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
  const key = global.redisKey || await setupMeetingSession();
  const value = await global.redisClient.getKey(key);

  if ( Object.keys(value).length === 0 ) { return Messages.unKnownIntent();}
  value.tasks.push({user: params.user, task: params.task});
  console.log('tasks', value.tasks);
  await global.redisClient.setKeyWithExpiry(key, value, RedisExpiryTime);

  return Messages.taskAdded(params);
}

async function handleNoteEvents(options) {
  const {session, intent, params} = options;
  const key = global.redisKey || await setupMeetingSession();
  const value = await global.redisClient.getKey(key);

  if ( Object.keys(value).length === 0 ) { return Messages.unKnownIntent(); }
  value.notes.push(params.note);
  console.log('notes', value.notes);
  await global.redisClient.setKeyWithExpiry(key, value, RedisExpiryTime);

  return Messages.noteAdded(params);
}

async function handleEmailEvents(options) {
  const { session, intent, params } = options;
  const key = global.redisKey || await setupMeetingSession();
  const value = await global.redisClient.getKey(key);
  
  if (Object.keys(value).length === 0) { return Messages.unKnownIntent(); }
  if (params.email_cc_trigger) {
    value.cc_email.push(params.email);
  }
  await global.redisClient.setKeyWithExpiry(key, value, RedisExpiryTime);
  sendEmail(value.notes, value.tasks, value.meeting_name, value.email, value.cc_email,value.time_track);

  return Messages.emailSent();
}

async function handleTimeBoxEvents(options) {
    const {session, intent, params} = options;
    const key = global.redisKey || await setupMeetingSession();
    const value = await global.redisClient.getKey(key);
    if (Object.keys(value).length === 0) {
        return Messages.unKnownIntent();
    }
    last_timebox = value.time_track.pop()
    if (!last_timebox) {
        value.time_track.push({
            start_time: new Date().getTime(),
            endtime: null,
            planned_duration: getParamsForTimeBox(params.duration),
            actual_duration: null,
            conversation: params.conversation
        });
    } else {
        last_timebox.endtime = new Date().getTime();
        const actual_duration = last_timebox.endtime - last_timebox.start_time;
        last_timebox.actual_duration = getParamsForDisplayingStats(actual_duration,last_timebox.planned_duration)
        value.time_track.push(last_timebox);
        value.time_track.push({
            start_time: new Date().getTime(),
            endtime: null,
            planned_duration: getParamsForTimeBox(params.duration),
            actual_duration: null,
            conversation: params.conversation
        });
    }
    console.log('notes', value.time_track);
    await global.redisClient.setKeyWithExpiry(key, value, RedisExpiryTime);
    // meetingTimer(timeBox, GoogleCalendar.convertToMilliSeconds(params.duration), options);
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

  var request = require("request");

var options = { method: 'POST',
  url: 'https://onesignal.com/api/v1/notifications',
  headers: 
    {
    'Postman-Token': 'fd6bd72d-c31e-4e43-af04-53a362532a79',
     'Cache-Control': 'no-cache',
     Authorization: `Basic ${config.get('OneSignal.auth')}`,
     'Content-Type': 'application/json' },
  body: 
   { app_id: `${config.get('OneSignal.app_id')}`,
     included_segments: [ 'All' ],
     data: { foo: 'bar' },
      contents: { en: `Timebox of ${params.params.time} has finished.` } },
  json: true };

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});

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

function getParamsForDisplayingStats(duration,duration_in_word) {
    if (duration_in_word.includes('seconds')){
        const durationInSeconds = duration/1000
        return `${durationInSeconds} 'seconds'`
    } else if (duration_in_word.includes('hour')) {
        return duration
    } else if (duration_in_word.includes('min')) {
         const minutes = Math.floor(duration / 60000);
        return `${minutes} 'minutes'`
    }
}
function sendEmail(notes, tasks, meetingName,email, cc_email,time_track){
  note_count = 1;
  time_count = 1
  task_count = 1;
    last_timebox = time_track.pop()
    last_timebox.endtime = new Date().getTime()
    if (last_timebox) {
        time_track.push({
            start_time: last_timebox.start_time,
            endtime: new Date().getTime(),
            planned_duration: last_timebox.planned_duration,
            actual_duration: getParamsForDisplayingStats((last_timebox.endtime - last_timebox.start_time), last_timebox.planned_duration),
            conversation: last_timebox.conversation
        });
    }
  //time = `Time ${google_meeting_time}`
    time_header = "<br><b>time track : </b> <br>"

    html_time_track = time_track.map((time_track) => {
        if(time_track.planned_duration && time_track.actual_duration)
        {
            return ` ${time_count++} . ${time_track.conversation} 'planned_time: '${time_track.planned_duration} actual_time: ${time_track.actual_duration} <br>`
        }
    });
    html_time_track = html_time_track.join('')
  note_header = "<br><b>.Meeting Notes : </b> <br>"
  html_notes = notes.map((note) => {
      return ` ${note_count++} . ${note} <br>`
  });
  html_notes = html_notes.join('')
  html_task = tasks.map(task => {
      return `@${task.user} - ${task.task}<br>`
  });
    html_task = html_task.join('')
    var transporter = mailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.get('email.user'),
          pass: config.get('email.pass')
        }
    });
    task_header = "<br><b> Action Items : </b> <br>"
  final_html = note_header+html_notes+ task_header +html_task +time_header +html_time_track;
    var mailOptions = {
        from: 'wildcards-admin@freshbugs.com',
        cc: cc_email.toString(),
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
