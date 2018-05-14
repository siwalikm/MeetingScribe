const expressApp = require('./server');
const GoogleCalendarClient= require('./google-calendar');

global.googleCalendar = new GoogleCalendarClient();
new expressApp();

// Uncomment test to test the google calendar events.
//test();
//
//async function test() {
//  const response = await global.googleCalendar.getFutureEventsSummaries();
//  console.log('response', response);
//}



