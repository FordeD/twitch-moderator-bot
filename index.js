const tmi = require('tmi.js');
require('dotenv').config();
const channels = require('./channels.json');
const skipUsers = require('./moders.json');
var schedule = require('node-schedule');
const fs = require('fs');

const { BOT_USERNAME, OAUTH_TOKEN } = process.env;

// BOT Settings
const SPAM_CHECK = false;
const LINCKS_CHECK = false;
const BAN_USER_FOR_LINKS = false;
const LOGGING_FETCH_MESSAGE = true;
const MUTE_SECONDS = 300;
//

// Special tags for logging colors for customize logging colors
const Reset = "\x1b[0m"
const FgBlack = "\x1b[30m"
const FgRed = "\x1b[31m"
const FgGreen = "\x1b[32m"
const FgYellow = "\x1b[33m"
const FgBlue = "\x1b[34m"
const FgMagenta = "\x1b[35m"
const FgCyan = "\x1b[36m"
const FgWhite = "\x1b[37m"
//

const opts = {
  connection: {
    reconnect: true
  },
  identity: {
    username: BOT_USERNAME,
    password: OAUTH_TOKEN
  },
  channels: Object.keys(channels)
};

// Create a client with our options
const client = new tmi.client(opts);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

console.log("Connect ", BOT_USERNAME);
client.connect();

var JSONLogs = {};

// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
  var username = context["display-name"];
  var chatID = context["room-id"];
  var userId = context["user-id"];
  if (skipUsers.moderators.includes(username) || self || context.subscriber) return true;

  // Remove whitespace from chat message
  const commandName = msg.trim();

  // If the command is known, let's execute it
  if (commandName === '!dev') {
    client.say(target, `Created By TheFordeD, Special for team "BANDA" -> https://www.twitch.tv/team/banda`);
  } else {
    // Message states
    var DuplicateMessage = false;
    var URLInMessage = false;
    var CryptingMessage = false;

    if (!JSONLogs.rooms) {
      JSONLogs.rooms = {};
    }
    if (!JSONLogs.rooms[chatID]) {
      JSONLogs.rooms[chatID] = {};
      JSONLogs.rooms[chatID].msgs = [];
      JSONLogs.rooms[chatID].users = [];
    }

    var msgId = JSONLogs.rooms[chatID].msgs.length;
    var timestamp = new Date();
    JSONLogs.rooms[chatID].msgs.push({
      id: msgId,
      uuid: context.id,
      date: timestamp,
      mag: msg,
      user: userId
    });

    var userIndex = JSONLogs.rooms[chatID].users.findIndex((user, index) => {
      return user.userId === userId;
    });

    if (userIndex !== -1) {
      JSONLogs.rooms[chatID].users[userIndex].banned = false;
      JSONLogs.rooms[chatID].users[userIndex].muted = false;
      if (!JSONLogs.rooms[chatID].users[userIndex].msgs) {
        JSONLogs.rooms[chatID].users[userIndex].msgs = {
          ids: [],
          count: 0,
          timestamp: null,
          lastmsg: null,
        };
      }

      JSONLogs.rooms[chatID].users[userIndex].msgs.ids.push(msgId);
      JSONLogs.rooms[chatID].users[userIndex].msgs.count += 1;
      JSONLogs.rooms[chatID].users[userIndex].msgs.timestamp = timestamp;

      var sum = 0;
      for (let i = 0; i < msg.length; i++) {
        sum += msg[i].charCodeAt(0);
      }
      if (sum > 2000000) {
        CryptingMessage = true;
      }

      if (SPAM_CHECK) {
        console.log("levenshtein func", levenshtein(JSONLogs.rooms[chatID].users[userIndex].msgs.lastmsg, msg));
        if (JSONLogs.rooms[chatID].users[userIndex].msgs.lastmsg == msg || levenshtein(JSONLogs.rooms[chatID].users[userIndex].msgs.lastmsg, msg) <= 2) {
          DuplicateMessage = true;
        } else if (levenshtein(JSONLogs.rooms[chatID].users[userIndex].msgs.lastmsg, msg) < 5) {
          client.whisper(username, "Не спамь похожими сообщениями! В противном случае будет мут.");
        }
      }
      if (LINCKS_CHECK) {
        if (msg.indexOf("http:") !== -1 || msg.indexOf("https:") !== -1) {
          URLInMessage = true;
        }
      }

      JSONLogs.rooms[chatID].users[userIndex].msgs.lastmsg = msg;
      let ChannelName = Object.keys(channels).find(key => channels[key] === chatID);

      if (LOGGING_FETCH_MESSAGE) {
        console.log(`${FgBlue}`, `Channel: ${ChannelName}->${chatID}`, `${FgRed}`, `User: ${username}`, `${FgYellow}`, `Chars summ: ${sum}`, `${FgGreen}`, `Msg: ${msg}`, `${Reset}`);
      }
    } else {
      let newUserIndex = JSONLogs.rooms[chatID].users.length;
      userIndex = newUserIndex;
      JSONLogs.rooms[chatID].users[newUserIndex] = {
        msgs: {
          ids: [msgId],
          count: 1,
          timestamp: timestamp,
          lastmsg: msg,
        },
        username: username,
        userId: userId,
        subscriber: context.subscriber,
        turbo: context.turbo,
        mod: context.mod,
        muted: false,
        banned: false,
      }

      if (msg.indexOf("http:") !== -1 || msg.indexOf("https:") !== -1) {
        URLInMessage = true;
      }
    }

    let ChannelName = Object.keys(channels).find(key => channels[key] === chatID);

    if (URLInMessage) {
      let counts = JSONLogs.rooms[chatID].users[userIndex].msgs.count;
      let lastmsg = JSONLogs.rooms[chatID].users[userIndex].msgs.lastmsg;

      console.log(`Maybe user ${username} is spammer, message have URL link. Msg counts: ${counts}. MSG: ${lastmsg}`);

      if (BAN_USER_FOR_LINKS) {
        banUser(ChannelName, target, context.id, username);
      } else {
        muteUser(ChannelName, target, context.id, username);
      }
      JSONLogs.rooms[chatID].users[userIndex].banned = true;
    }

    if (DuplicateMessage) {
      let counts = JSONLogs.rooms[chatID].users[userIndex].msgs.count;
      let lastmsg = JSONLogs.rooms[chatID].users[userIndex].msgs.lastmsg;

      console.log(`Maybe user ${username} is message spammer. Msg counts: ${counts}. MSG: ${lastmsg}`);

      JSONLogs.rooms[chatID].users[userIndex].msgs.lastmsg = "";

      muteUser(ChannelName, target, context.id, username);
      JSONLogs.rooms[chatID].users[userIndex].muted = true;
    }

    if (CryptingMessage) {
      let counts = JSONLogs.rooms[chatID].users[userIndex].msgs.count;
      let lastmsg = JSONLogs.rooms[chatID].users[userIndex].msgs.lastmsg;

      console.log(`Maybe user ${username} is BOT, message have Special symbols for crypting in message. Msg counts: ${counts}. MSG: ${lastmsg}`);

      banUser(ChannelName, target, context.id, username);
      JSONLogs.rooms[chatID].users[userIndex].banned = true;
    }
  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

function muteUser(ChannelName, target, uuid, username) {
  console.log("TODO: MUTE User action", ChannelName, target);
  try {
    client.timeout(ChannelName, username, MUTE_SECONDS, "Спам").then(() => { console.log(`${username} Muted on ${MUTE_SECONDS} seconds`) })
      .catch((err) => { console.log(err) });

    client.deletemessage(ChannelName, uuid).then(() => { console.log('deleted last message') })
      .catch((err) => { console.log(err) });
  } catch (err) {
    console.log("ERR HAVE NOT PERMISSIONS");
  }
  return true;
}

function banUser(ChannelName, target, uuid, username) {
  console.log("BAN User action", ChannelName, target);
  try {
    client.ban(ChannelName, username, "Бот").then(() => { console.log(`${username} Banned`) })
      .catch((err) => { console.log(err) });

    client.deletemessage(ChannelName, uuid).then(() => { console.log('deleted last message') })
      .catch((err) => { console.log(err) });
  } catch (err) {
    console.log("ERR HAVE NOT PERMISSIONS");
  }
  return true;
}


// Logging to file users data every day at 00:00:00
var j = schedule.scheduleJob('0 0 0 * * 0-6', function () {
  var dateLogging = formatDate(new Date());
  for (let chatID in JSONLogs.rooms) {
    let exportJSON = JSONLogs.rooms[chatID];
    let channelsData = Object.entries(channels);
    let channel = channelsData.find((el) => {
      return el[1] == chatID;
    });

    fs.writeFileSync(`./logs/${channel}-channel-${dateLogging}.json`, JSON.stringify(exportJSON));
  }

  JSONLogs = {};
});

function formatDate(date) {
  var d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2)
    month = '0' + month;
  if (day.length < 2)
    day = '0' + day;

  return [year, month, day].join('-');
}



function levenshtein(s1, s2, costs) {
  var i, j, l1, l2, flip, ch, chl, ii, ii2, cost, cutHalf;
  l1 = s1.length;
  l2 = s2.length;

  costs = costs || {};
  var cr = costs.replace || 1;
  var cri = costs.replaceCase || costs.replace || 1;
  var ci = costs.insert || 1;
  var cd = costs.remove || 1;

  cutHalf = flip = Math.max(l1, l2);

  var minCost = Math.min(cd, ci, cr);
  var minD = Math.max(minCost, (l1 - l2) * cd);
  var minI = Math.max(minCost, (l2 - l1) * ci);
  var buf = new Array((cutHalf * 2) - 1);

  for (i = 0; i <= l2; ++i) {
    buf[i] = i * minD;
  }

  for (i = 0; i < l1; ++i, flip = cutHalf - flip) {
    ch = s1[i];
    chl = ch.toLowerCase();

    buf[flip] = (i + 1) * minI;

    ii = flip;
    ii2 = cutHalf - flip;

    for (j = 0; j < l2; ++j, ++ii, ++ii2) {
      cost = (ch === s2[j] ? 0 : (chl === s2[j].toLowerCase()) ? cri : cr);
      buf[ii + 1] = Math.min(buf[ii2 + 1] + cd, buf[ii] + ci, buf[ii2] + cost);
    }
  }
  return buf[l2 + cutHalf - flip];
}