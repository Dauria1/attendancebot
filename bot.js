const auth = require('./auth.json');
const logger = require('winston');
const Discord = require('discord.io');
const fs = require('fs');
const raidDays = require('./raids.json').raidDays
//Logger setup
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
  colorize: true
});
logger.level = 'debug';

const bot = new Discord.Client({
  token: auth.token,
  autorun: true,
});

function raidDay(string) {
  const dateFormat = /^(?:(?:(?:0?[13578]|1[02])(\/|-|\.)31)\1|(?:(?:0?[1,3-9]|1[0-2])(\/|-|\.)(?:29|30)\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:0?2(\/|-|\.)29\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:(?:0?[1-9])|(?:1[0-2]))(\/|-|\.)(?:0?[1-9]|1\d|2[0-8])\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (dateFormat.test(string) === true) {
    const d = new Date(string).getDay()
    const dayName = days[d];
    if (raidDays.indexOf(dayName) > -1) {
      return d;
    } else {
      return false;
    }
  };

  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();

  if (string < today.getDate()) {
    if (month >= 12) {
      year++;
      month = 1;
    }
    const d = month + 2 + '/' + string + '/' + year
    console.log(d);
    const newDay = new Date(d)
    const dayName = days[newDay.getDay()];
    if (raidDays.indexOf(dayName) > -1) {
      return d;
    } else {
      return false
    }
  } else {
    month++;

    if (month >= 12) {
      console.log('oops unintended')
      year++;
      month = 1;
    }

    const d = month + '/' + string + '/' + year
    const newDay = new Date(d)
    const dayName = days[newDay.getDay()];
    if (raidDays.indexOf(dayName) > -1) {
      return d;
    } else {
      return false;
    }
  }
};

const checker = setInterval(() => {
  const today = new Date();
  let date = today.getDate();
  while (raidDay(date) === false) {
    date++;
  }
  const day = raidDay(date);
  const time = today.toLocaleTimeString();
  console.log(time)
  if (time == "1:56:00 PM") {
    fs.readFile('late.json', (err, data) => {
      console.log('times up')
      if (err) throw err;
      info = JSON.parse(data)
      const entries = info.map(entry => entry);
      const filtered = entries.filter((attend) => attend.date === day);
      const attendances = filtered.map(e => e.username + ' ' + e.info + ' ' + e.date + '\n').join(",");
      const message = attendances.replace(/,/g, '');
      bot.sendMessage({
        to: '508236289179516928',
        message: day + ' ' + 'Status:' + '```' + message + '```',
      });
    });
  }
}, 1000);


bot.on('ready', (event) => {
  logger.info('connected');
  logger.info('logged in as');
  logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', (user, userID, channelID, message, event) => {
  const attendance = [];
  console.log(userID);
  if (message.substring(0, 1) == '!') {
    let args = message.substring(1).split(' ');
    const cmd = args[0];
    const availability = args[1]
    const date = args[2];
    const status = args.slice(3).join(' ')
    switch (cmd) {
      case 'att':
        if (availability == 'late' || availability == 'absent') {
          info = availability + ' ' + status;
          if (!raidDay(date)) {
            bot.sendMessage({
              to: channelID,
              message: 'Not a valid date entry, try !att <Day> or <DD/MM/YY(YY)>',
            });
          } else {
            const day = raidDay(date);
            const log = {
              user: event.d.author.id,
              username: event.d.author.username + '#' + event.d.author.discriminator,
              nick: event.d.member.nick,
              info: info,
              date: day,
            };
            attendance.push(log);
            const data = JSON.stringify(attendance);
            console.log('date here', data)
            if (!fs.existsSync('late.json')) {
              fs.writeFile("late.json", data, (err) => {
                if (err) throw err;
                console.log('!saved')
              });
            } else {
              fs.readFile('late.json', (err, data) => {
                if (err) throw err;
                const info = JSON.parse(data)
                info.push(log);
                console.log(info);
                const infos = JSON.stringify(info);
                fs.writeFile("late.json", infos, (err) => {
                  if (err) throw err;
                  console.log('entries saved')
                })
                bot.sendMessage({
                  to: channelID,
                  message: 'Status recorded!',
                });
              })
            }
          }
        } else {
          bot.sendMessage({
            to: userID,
            message: `Must include !att late or absent`,
          });
        };
        break;

      case 'help':
        bot.sendMessage({
          to: userID,
          message:
            ` Help:
          !att <(late / absent)> <date> <status>: adds late or absent to the list
          !clear <date>: clears attendance status for said date
          !list: shows all attendance info
          !list <date>: shows all attendance for said date
          `
        });
        break;

      case 'clear':
        fs.readFile('late.json', (err, data) => {
          const date = args[1];
          const day = raidDay(date);
          const info = JSON.parse(data)
          info.splice(info.findIndex(entry => entry.date === day && entry.user === userID), 1);
          const infos = JSON.stringify(info);
          fs.writeFile("late.json", infos, (err) => {
            if (err) throw err;
            console.log('entries saved')
          })
        });
        break;

      case 'list':
        fs.readFile('late.json', (err, data) => {
          if (err) throw err;
          const date = args[1];
          info = JSON.parse(data)
          const entries = info.map(entry => entry);
          if (date) {
            const day = raidDay(date);
            const filtered = entries.filter((attend) => attend.date === day);
            const attendances = filtered.map(e => "```" + e.username + ' ' + e.info + ' ' + e.date + '\n' + '```').join(",");
            const message = attendances.replace(/,/g, '');
            bot.sendMessage({
              to: userID,
              message: message,
            });
          } else {
            const attendances = entries.map(e => "```" + e.username + ' ' + e.info + ' ' + e.date + '\n' + '```').join(",");
            const message = attendances.replace(/,/g, '');
            bot.sendMessage({
              to: userID,
              message: message,
            });
          };
        });
        break;
    }
  }
  if(userID != "508236504728993792") {
    bot.deleteMessage({
      channelID: channelID,
      messageID: event.d.id,
    });
  }
});
