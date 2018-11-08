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
  let month =+ today.getMonth();

  if (string < today.getDate()) {
    console.log(string, today.getDate())
    +month + 2;
    console.log('this month + 2', month)

    if (month >= 12) {
      year++;
      month = 1;
    }

    const d = month + '/' + string + '/' + year
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

bot.on('ready', (event) => {
  logger.info('connected');
  logger.info('logged in as');
  logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', (user, userID, channelID, message, event) => {
  const attendance = [];
  if (message.substring(0, 1) == '!') {
    let args = message.substring(1).split(' ');
    const cmd = args[0];
    const availability = args[1]
    const date = args[2];
    const status = args.slice(3).join(' ')
    console.log(args)
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
            if (!fs.existsSync('late.json')) {
              fs.writeFile("late.json", data, (err) => {
                if (err) throw err;
                console.log('!saved')
              });
            } else {
              fs.readFile('late.json', (err, data) => {
                if (err) throw err;
                info = JSON.parse(data)
                attendance.push(info[0])
                const infos =  JSON.stringify(attendance);
                fs.writeFile("late.json", infos, (err) => {
                  if (err) throw err;
                  console.log('entries saved')
                })
                bot.sendMessage({
                  to: channelID,
                  message: 'Status recorded!',
                });
                bot.deleteMessage({
                  channelID: channelID,
                  messageID: event.d.id,
                });
              })
            }
          }
        } else {
          bot.sendMessage({
            to: channelID,
            message: `Must include !att late or absent`,
          });
        };
        break;

      case 'help':
        bot.sendMessage({
          to: channelID,
          message: 'Late: !late <xMinutes/xHr(s)> <date> Absent: !absend <date> List: !list <date>'
        });
        break;

        case 'clear':
        fs.readFile('late.json', (err, data) => {
          const date = args[1];
          const day = raidDay(date);
          info = JSON.parse(data)
          console.log(info)
          const removeThis = info.filter(entry => entry.date == day);
          console.log(removeThis);
        });
        break;

      case 'list':
        fs.readFile('late.json', (err, data) => {
          if (err) throw err;
          info = JSON.parse(data)
          const entries = info.map(entry => entry);
          entries.map(entry => (entry));
          const attendances = entries.map(e => "<@" + e.user + ">" + '```' + e.info + ' ' + e.date + '\n' + '```').join(",");
          const message = attendances.replace(/,/g, '');
          bot.sendMessage({
            to: channelID,
            message: message,
          });
        });
        break;
      }
  }
});
