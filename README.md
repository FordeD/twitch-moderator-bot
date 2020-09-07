# Twitch moderator bot for more than once streamer chat

Developed for only moderating bot(spammers) messages, viewers single message spam and links spamming in messages.

This bot developed special for twitch team [BANDA](https://www.twitch.tv/team/banda).

## Configs

in index.js next after 10 line:


> const SPAM_CHECK = false;

> const LINCKS_CHECK = false;

> const BAN_USER_FOR_LINKS = false;

> const LOGGING_FETCH_MESSAGE = true;

> const MUTE_SECONDS = 300;




* SPAM_CHECK - for checking duplicate messages (true/false variable);
* LINCKS_CHECK - for checking links in message (true/false variable);
* BAN_USER_FOR_LINKS - for setting ban to user who sended link in chat if this value equals true, or setting mute for 300 seconds if equals false;
* LOGGING_FETCH_MESSAGE - logging messages form chat to console (true/false variable);
* MUTE_SECONDS - set mute time for users (numerable variable);


## Setup for your stream

1. Install this package on your computer or server.
2. Create file `.env` in root bot folder.
3. Write in file this strictire: 
> BOT_USERNAME=<Your_Bot_Name>

> OAUTH_TOKEN=<Your_Bot_Auth_Token>

4. Create new user in twitch, set username in `.env` file.
5. Run in https://twitchapps.com/tmi/ to create token for bot, you need authorise like a your bot.
6. Connect and genere your full auth token with `auth:`, set this token in `.env` file.
7. Add your twutch channel(s) in `channels.json` file like string values.
8. Add Your needed users nicknames for ignoring messages in `moders.json`.
9. Write in console `npm install`, **console need opened from root bot folder**.
10. Write in console `npm run start`.
11. Send one message in chat and find channel ID from console log, this seems like for `Channel: <channel_name>-><chat_id>`
12. Copy to clipboard this ID and set this value in `channels.json` after your channel name after **:** like a string value.
13. Stop bot working by Ctrl+C, after write Y and send it in console.
14. Again write in console `npm run start`.
15. This is end.


**Thanks for using and contributing!**

