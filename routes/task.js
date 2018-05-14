const express = require('express');
const router = express.Router();

/**
 * Create a new Task/Note.
 **/
router.post('/', function (req, res) {
  /**
   * validate the task and return a 400 if it is a bad request.
   * Expect a meeting ID.
   **/
  if (!isValidRequest(req)) {
    res.statusCode = 400;
    res.json({errors: ['Bad request']});
  }

  /**
   * Send the text to the AiApi and find the intent.
   **/
  const sessionId = uuid();
  const text = req.text;
  const promise = global.apiAiClient.text('Assigning Vignesh to setup the team meeting.', { sessionId: sessionId });

  const intent = promise.then((data) => {
    console.log(data);
    return data;
  }).catch((e) => {
    console.log(e);
    return null;
  });

  if (intent) {
    // Check whether the user
    // Create a new task or note depending on the intent.
  }
});


function isValidRequest(req) {
  return !(!req.meetingId || !req.text);
}

module.exports = router;
