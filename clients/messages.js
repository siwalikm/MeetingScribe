const messages = class Messages {
   static taskAdded(params) {
     return {
       "fulfillmentMessages": [
         {
           "platform": "ACTIONS_ON_GOOGLE",
           "simpleResponses": {
             "simpleResponses": [
               {
                 "displayText": `Assigned the task ${params.task} to ${params.user}`,
                 "ssml": `<speak>Assigned <break time="40ms"/> ${params.task} to <break time="40ms"/>${params.user}</speak>`
               }
             ]
           }
         }
       ]
     }
   }

   static meetingStarted(params) {
     return {
       "fulfillmentMessages": [
         {
           "platform": "ACTIONS_ON_GOOGLE",
           "simpleResponses": {
             "simpleResponses": [
               {
                 "displayText": `Started scribing ${params.meeting_name}`,
                 "ssml": `<speak>Started scribing <break time="40ms"/> ${params.meeting_name} </speak>`
               }
             ]
           }
         }
       ]
     }
   }

   static meetingConcluded(params) {
     return {
       "fulfillmentMessages": [
         {
           "platform": "ACTIONS_ON_GOOGLE",
           "simpleResponses": {
             "simpleResponses": [
               {
                 "displayText": `Meeting ${params.meeting_name} concluded`,
                 "ssml": `<speak>Meeting <break time="40ms"/> ${params.meeting_name} is completed and the tasks are added to ${params.output || 'confluence'}. </speak>`
               }
             ]
           }
         }
       ]
     }
   }

   static timeLeft(params) {

   }

   static timeBoxing(params) {

   }

   static noteAdded(params) {
      return {
        "fulfillmentMessages": [
          {
            "platform": "ACTIONS_ON_GOOGLE",
            "simpleResponses": {
              "simpleResponses": [
                {
                  "displayText": `Done`,
                  "ssml": `<speak> Done </speak>`
                }
              ]
            }
          }
        ]
      }
   }

   static unKnownIntent() {
     return {
       "fulfillmentMessages": [
         {
           "platform": "ACTIONS_ON_GOOGLE",
           "simpleResponses": {
             "simpleResponses": [
               {
                 "displayText": `Couldn't identify your request. Please try again`,
                 "ssml": `Couldn't identify your request. Please try again`
               }
             ]
           }
         }
       ]
     }
   }

};

module.exports = messages;