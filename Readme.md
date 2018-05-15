## Todos
- [ ] Invoke the intent ourselves(For meeting-going-to-end message and time boxing).
- [ ] Install Redis, add the ApiAI session key and store the tasks, notes inside that key.
- [ ] Train the note, time-box, start meeting, end meeting intents.
- [ ] Define all the responses for the individual intents and send the response back.
- [ ] Add the support for time-box feature.
- [ ] Confluence APIs for adding to the space and creating comments for actions.

## Check this out
- Check the ```config/default.json``` and replace the keys there to link with your accounts.
- Use [Oauth Playground](https://developers.google.com/oauthplayground) for generating new token every time. Check the calendar API as the scope. In the Second step, select refresh access token always. Copy the generated access token and paste it in ```config/default.json``` 
