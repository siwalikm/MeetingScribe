var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
  res.send({});
});

// Create a new meeting.
router.post('/', function (req, res) {
  // Create a meeting and send a response(200) with the meeting ID in the response.
  // Create a redis key with the generated meeting ID. where the meeting
  // Front end needs to send this in every request going forward.
  // Call the google calendar API and get the list of users in the meeting. Store them in a redis key.
});

// End the meeting.
router.post('/end', function (req, res) {
  // Return all the tasks and the meeting notes for this meeting ID.
  // Delete the redis key.
});

function isValidateRequest(req) {
  return req.calendarID;

}

module.exports = router;
