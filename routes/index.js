const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
  console.log('req', req);
  res.json({success: true});
});

// Webhooks that listens to the ApiAI.
router.post('/', function(req, res, next) {
  const parameters = req.body.queryResult.parameters;
  console.log(parameters);
  const payload = req.body.originalDetectIntentRequest.payload;
  console.log('conversation ID', payload.conversation.conversationId);

  res.type('json');
  res.json(fullFillment());
});

function fullFillment() {
  return {
    "fulfillmentMessages": [
      {
        "platform": "ACTIONS_ON_GOOGLE",
        "simpleResponses": {
          "simpleResponses": [
            {
              "displayText": "This is working fine",
              "ssml": "<speak>This is working fine. <break time=\"200ms\"/></speak>"
            }
          ]
        }
      }
    ]
  }
}

module.exports = router;
