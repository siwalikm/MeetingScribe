const config = require('config');
const request = require('request-promise-native');

// ************************** Important *******************************************
// Refresh the oauth token in https://developers.google.com/oauthplayground.
// The token will expire on every single hour. Select auto-refresh checkbox.
// If there is a need for end-to-end Oauth: https://developers.google.com/calendar/quickstart/nodejs

const token = config.get('google_calendar_auth_token');
const upperBound = config.get('google_calendar_upper_bound');

const GoogleCalendar  = class GoogleCalendar {
  constructor() {}

  // Not used any more.
  static getCalendarList() {
    return request.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      auth: { 'bearer': token }
    });
  }

  // Not used any more.
  getPrimaryCalendarId() {
   return GoogleCalendar.getCalendarList().then((response) => {
      console.log('response', response);
      response = JSON.parse(response);
      const calendars = response.items;
      const selectedCalender = calendars.find(calendar => calendar.accessRole === 'owner');
      if (!selectedCalender) return null;

      const selectedCalendarId = selectedCalender.id;
      return selectedCalendarId;
    }).catch((error) => {
      console.log('error', error);
    });
  }

  /**
   * Returns event for the next 3 hours.
   * Making the assumption that we will fetch the primary calendar ID.
   **/
  getFutureEvents() {
    const timeMin = new Date().toISOString();
    const timeNow = new Date();

    timeNow.setMinutes(timeNow.getMinutes() + (upperBound || 60));
    const timeMax = timeNow.toISOString();
    const requestURL = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMax=${timeMax}&timeMin=${timeMin}`;

    return request.get( requestURL, {
      auth: { 'bearer': token }
    }).then( (response) => {
      console.log( 'response', response);
      response = JSON.parse( response);
      const events = response.items;
      console.log( 'events', events);

        return events.map((event) => {
            if (event.end != null && event.summary != null && event.attendees != null) {
                return {endTime: event.end.dateTime, summary: event.summary, attendees: event.attendees, meetingId: event.id};
            }
        }
    ).filter(value => !!value);
        ;
    }).catch( (error) => {
      console.log('error', error);
    });
  }

  static getTimeRemaining(endTime) {
    const date1 = new Date(endTime);
    const date2 = new Date();
    return Math.abs(date1 - date2);
  }

  static convertToMilliSeconds(duration) {
    if (duration.unit === 'min') {
      return duration.amount * 60 * 1000;
    } else if (duration.unit === 's') {
      return duration.amount * 1000;
    } else if (duration.unit === 'h') {
      return duration.amount * 60 * 60 * 1000;
    }
  }
};

module.exports = GoogleCalendar;