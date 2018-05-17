const confluence = class confluence {

   static constructResponse(params) {
     let attendees = [];
     let notes = [];
     let tasks = [];
     let formattedTasks = [];
     let { meetingData } = params;
     
     if (meetingData.attendees) {
       meetingData.attendees = JSON.parse(meetingData.attendees);
       meetingData.attendees.forEach((item) => {
         if (!item.email.match('calendar.google.com')) {
           attendees.push(item.displayName);
         }
       });
     }
     meetingData.notes.forEach(el => notes.push(`> ${el}`));

     meetingData.tasks.forEach((item) => {
       let taggableName = meetingData.attendees.find((el) => {
         return (el.email.match(item.user));
       });
       if (taggableName) item.user = taggableName.email.split('@')[0];
       formattedTasks.push(`<ac:task-list>
        <ac:task>
          <ac:task-status>incomplete</ac:task-status>
            <ac:task-body>
              <ac:link><ri:user ri:username='${item.user}' /></ac:link> - ${item.task}
            </ac:task-body>
          </ac:task>
        </ac:task-list>`);
     });


     let requestData = 
`<h2>MoM for <strong>${meetingData.meeting_name}</strong></h2>
--------------------------------------------------------
<h3>Attendees</h3>
${attendees.join(', \n')}<br/>

<h5>Minutes of the Meeting :</h5>
------------<br/>
${notes.join('\n')}<br/>

<h5>Action Items :</h5>
------------<br/>
${formattedTasks.join('')}
`;
    //  cleaning up spaces, new line char and escapes for json req
     console.log(requestData.replace(/[\n\r]+/g, '').replace(/[ ]+/g, ' ')); 
     return requestData.replace(/[\n\r]+/g, '').replace(/[ ]+/g, ' ');
   }



};

module.exports = confluence;