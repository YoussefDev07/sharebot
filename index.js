process.on("unhandledRejection", error => { console.error(error) });
const Discord = require("discord.js");
const client = new Discord.Client();
const x73db = require("x73db");
const msTime = require("ms");
const config = require("./config.json");

// databases

const databasePath = "databases";
const DB = {
  channels: new x73db("channels", { path: databasePath }),
  descs: new x73db("descriptions", { path: databasePath }),
  coolshare: new x73db("coolshare", { path: databasePath }),
  cooldown: new x73db("cooldown", { path: databasePath }),
  premium: new x73db("premium", { path: databasePath }),
  premiumShare: new x73db("premiumShare", { path: databasePath }),
  ban: new x73db("bans", { path: databasePath })
}

// ready

client.on("ready", () => {
  client.user.setActivity(`${config.prefix}help`);
  console.log(`🟢 [${client.user.username}] is ONLINE!`);
});

// CMDs

client.on("message", async message => {
  if (message.channel.type == "dm") return;
  if (message.author.bot) return;

  let isPremium = DB.premium.get(`premium_${message.guild.id}`);
  let isPremiumPlus = DB.premium.get(`plus_${message.guild.id}`);
  let banned = DB.ban.get(`ban_${message.guild.id}`);

  let timeout = 1000;
  let time = DB.cooldown.get(`cooldown_${message.author.id}`);
  if (!time) time = 0;
  var remainingTime = ((msTime(timeout - (Date.now() - time), { long: false })).replace("ms", "") / 1000).toString().slice(0, 3);
  let coolMessage = `**${config.emoji.timer} حاول مجدداً بعد \`${remainingTime}\` ثانية**`;

  let cmd = message.content.split(" "); cmd = cmd[0].toLowerCase();
  let command = {
    help: ["help", "commands"],
    share: "share",
    mentionShare: "mshare",
    autoshare: "autoshare",
    setchannel: "setchannel",
    description: "setdesc",
    ping: "ping",
    premium: "premium"
  }

  if (message.content == config.prefix + command.share) {
    if (time !== null && timeout - (Date.now() - time) > 0) {
      message.channel.send(`${coolMessage}`);
    } else {
      if (banned == "on") return message.channel.send(`${config.emoji.ban} **هذا السيرفر محظور من النشر**`);
      if (!message.member.hasPermission("ADMINISTRATOR")) return message.channel.reply(`${config.emoji.error}** ليس لديك صلاحية:** \`ADMINISTRATOR\``);
      if (!message.guild.me.hasPermission("ADMINISTRATOR")) return message.channel.send(`${config.emoji.error}** ليس لدي صلاحية:** \`ADMINISTRATOR\``);

      let timeshare = (isPremium) ? (3600 / 2) * 1000 : (3600 * 2) * 1000;
      let times = DB.coolshare.get(`cool_${message.guild.id}`);

      if (times !== null && timeshare - (Date.now() - times) > 0) {
        var remainingTime = " " + msTime(timeshare - (Date.now() - times), { long: true }).replace("hours", "ساعة").replace("ms", "أقل من ثانية");
        var remainingTime = (remainingTime.search(/\s*([2-9]|10)\s*[minutes|seconds]/)) ? remainingTime.replace("minutes", "دقيقة").replace("seconds", "ثانية") : remainingTime.replace("minutes", "دقائق").replace("seconds", "ثواني");
        message.channel.send(`${config.emoji.timer} **متبقي \`${remainingTime.replace(" ", "")}\` للنشر**`);
      } else {
        let invite;
        if (isPremium) { invite = await message.channel.createInvite({ maxAge: 0, maxUses: 100 }) } else { invite = await message.channel.createInvite({ maxAge: 3600 * 24, maxUses: 10 }) }

        DB.coolshare.set(`cool_${message.guild.id}`, Date.now());
        message.channel.send(`${config.emoji.loading} \`جاري نشر السيرفر...\``).then(msg => {
          share(message.guild.name, invite);
          msg.edit(`${config.emoji.success} **تم نشر السيرفر في \`${client.guilds.cache.size}\` سيرفر بنجاح!**`);
        });
      }
      DB.cooldown.set(`cooldown_${message.author.id}`, Date.now());
    }
  } else if (message.content.startsWith(config.prefix + command.mentionShare)) {
    if (time !== null && timeout - (Date.now() - time) > 0) {
      message.channel.send(`${coolMessage}`);
    } else {
      if (!message.member.hasPermission("ADMINISTRATOR")) return message.channel.reply(`${config.emoji.error}** ليس لديك صلاحية:** \`ADMINISTRATOR\``);
      if (!message.guild.me.hasPermission("ADMINISTRATOR")) return message.channel.send(`${config.emoji.error}** ليس لدي صلاحية:** \`ADMINISTRATOR\``);
      if (!isPremiumPlus) return message.channel.send(`${config.emoji.error} **هذا السيرفر ليس بريميوم بلس!**`);
      if (banned == "on") return message.channel.send(`${config.emoji.ban} **هذا السيرفر محظور من النشر**`);

      let invite = await message.channel.createInvite({ maxAge: 0, maxUses: 100 });
      let mentionShareTimeout = (86400 * 7) * 1000;
      let mentionShareTime = DB.premiumShare.get(`mention_${message.guild.id}`);

      if (mentionShareTime !== null && mentionShareTimeout - (Date.now() - mentionShareTime) > 0) {
        mentionShareTime = " " + msTime(mentionShareTimeout - (Date.now() - mentionShareTime), { long: true }).replace("ms", "أقل من ثانية");
        mentionShareTime = (mentionShareTime.search(/\s*([2-9]|10)\s*[minutes|seconds|hours|days]/)) ? mentionShareTime.replace("days", "يوم").replace("hours", "ساعة").replace("minutes", "دقيقة").replace("seconds", "ثانية") : mentionShareTime.replace("days", "أيام").replace("hours", "ساعات").replace("minutes", "دقائق").replace("seconds", "ثواني");
        message.channel.send(`${config.emoji.timer} **متبقي \`${mentionShareTime.replace(" ", "")}\` للنشر مع منشن ايفري ون**`);
        return;
      }
      
      DB.cooldown.set(`cooldown_${message.author.id}`, Date.now());
      DB.coolshare.set(`cool_${message.guild.id}`, Date.now());
      DB.premiumShare.set(`mention_${message.guild.id}`, Date.now());

      message.channel.send(`${config.emoji.loading} \`جاري نشر السيرفر مع منشن ايفري ون...\``).then(msg => {
        share(message.guild.name, invite, "@everyone");
        msg.edit(`${config.emoji.success} **تم نشر السيرفر في \`${client.guilds.cache.size}\` سيرفر بنجاح!**`);
      });
    }
  } else if (message.content.startsWith(config.prefix + command.autoshare)) {
    if (time !== null && timeout - (Date.now() - time) > 0) {
      message.channel.send(`${coolMessage}`);
    } else {
      if (!message.member.hasPermission("ADMINISTRATOR")) return message.channel.reply(`${config.emoji.error}** ليس لديك صلاحية:** \`ADMINISTRATOR\``);
      if (!isPremium) return message.channel.send(`${config.emoji.error} **هذا السيرفر ليس بريميوم!**`);
      if (banned == "on") return message.channel.send(`${config.emoji.ban} **هذا السيرفر محظور من النشر**`);

      let isAutoShare = DB.premiumShare.get(`autoshare_${message.guild.id}`);
      if (isAutoShare) {
        message.channel.send(`${config.emoji.error} **تم تعطيل النشر التلقائي!**`);
        DB.premiumShare.remove(`autoshare_${message.guild.id}`);
      } else {
        let invite = await message.channel.createInvite({
          maxAge: 0,
          maxUses: 0
        });
        message.channel.send(`${config.emoji.success} **تم تفعيل النشر التلقائي!**`);
        DB.premiumShare.set(`autoshare_${message.guild.id}`, invite);
      }
    }
  } else if (message.content.startsWith(config.prefix + command.setchannel)) {
    if (!message.member.hasPermission("ADMINISTRATOR")) return message.channel.reply(`${config.emoji.error}** ليس لديك صلاحية:** \`ADMINISTRATOR\``);

    if (time !== null && timeout - (Date.now() - time) > 0) {
      message.channel.send(`${coolMessage}`);
    } else {
      let room = message.mentions.channels.first();
      if (!room) return message.reply(`${config.emoji.search} لا أستطيع أن أجد الروم`);
      message.channel.send(`${config.emoji.success} **تم تحديد روم النشر بنجاح!**`);
      DB.channels.set(`channel_${message.guild.id}`, room.id);
      DB.cooldown.set(`cooldown_${message.author.id}`, Date.now());
    }
  } else if (command.help.some(cmd => message.content == config.prefix + cmd)) {
    if (time !== null && timeout - (Date.now() - time) > 0) {
      message.channel.send(`${coolMessage}`);
    } else {
      let commandsHelp = new Discord.MessageEmbed()
      .setAuthor(client.user.username, client.user.avatarURL())
      .setThumbnail(message.guild.iconURL())
      .setTitle("قـائـمـة الأوامـر")
      .setColor(config.color)
      .setDescription(`> [Invite](${config.link.invite}) - إضافة البوت
> [Support](${config.link.support}) - سيرفر الدعم الفني
> **${config.prefix + command.share}** - لنشر السيرفر
> **${config.prefix + command.mentionShare} ${config.emoji.premium}+** - لنشر السيرفر مع منشن ايفري ون
> **${config.prefix + command.autoshare} ${config.emoji.premium}** - لتفعيل/تعطيل النشر التلقائي
> **${config.prefix + command.setchannel}** - لتحديد روم النشر
> **${config.prefix + command.description}** - لتحديد وصف السيرفر
> **${config.prefix + command.premium}** - لمعرفة وقت إنتهاء البريميوم
> **${config.prefix + command.ping}** - سرعة استجابة البوت`)
      .setFooter(message.guild.name);
      message.channel.send(commandsHelp);
      DB.cooldown.set(`cooldown_${message.author.id}`, Date.now());
    }
  } else if (message.content.startsWith(config.prefix + command.description)) {
    if (time !== null && timeout - (Date.now() - time) > 0) {
      message.channel.send(`${coolMessage}`);
    } else {
      DB.cooldown.set(`cooldown_${message.author.id}`, Date.now());
      if (!message.member.hasPermission("ADMINISTRATOR")) return message.channel.reply(`${config.emoji.error}** ليس لديك صلاحية:** \`ADMINISTRATOR\``);

      let des = message.content.split(" ").slice(1).join(" ");
      if (!des) return message.channel.send(`من فضلك اكتب وصف السيرفر\n\`\`\`مثال: ${config.prefix + command.description} الوصف\`\`\``);
      message.channel.send(`${config.emoji.success} **تم تحديد وصف السيرفر بنجاح!**`);
      DB.descs.set(`description_${message.guild.id}`, des.replace(/`/g, ""));
    }
  } else if (message.content == config.prefix + command.ping) {
    if (time !== null && timeout - (Date.now() - time) > 0) {
      message.channel.send(`${coolMessage}`);
    } else {
      message.channel.send(`${config.emoji.ping} **سرعة استجابة البوت:** \`${client.ws.ping}\``);
      DB.cooldown.set(`cooldown_${message.author.id}`, Date.now());
    }
  } else if (message.content.startsWith(config.prefix + command.premium)) {
    if (time !== null && timeout - (Date.now() - time) > 0) {
      message.channel.send(`${coolMessage}`);
    } else {
      DB.cooldown.set(`cooldown_${message.author.id}`, Date.now());

      let isPremiumPlus = DB.premium.get(`plus_${message.guild.id}`);
      let premiumPlusText = (isPremiumPlus) ? "بريميوم بلس" : "بريميوم";
      let isPlus = message.content.split(" ")[0].endsWith("+");
      var serverID = message.content.split(" ")[1];
      var premiumTime = message.content.split(" ")[2];

      if (!serverID || !premiumTime || premiumTime.search(/1m|3m|I/i) == -1) {
        if (config.owners.some(id => id == message.author.id)) return message.channel.send(`\`\`\`مثال: ${config.prefix + command.premium} serverid (1m|3m|i)\`\`\``);
        if (!message.member.hasPermission("ADMINISTRATOR")) return message.channel.reply(`${config.emoji.error}** ليس لديك صلاحية:** \`ADMINISTRATOR\``);
        if (isPremium) {
          let expire = DB.premium.get(`expire_${message.guild.id}`); var exp;
          if (expire == "i") return message.channel.send(`${config.emoji.premium} **هذا السيرفر ${premiumPlusText}!**`);
          if (expire == "1m") exp = (86400 * 30) * 1000;
          if (expire == "3m") exp = (86400 * (30 * 3)) * 1000;
          let remainingPremiumTime = DB.premium.get(`premium_${message.guild.id}`);
          
          remainingPremiumTime = " " + msTime(exp - (Date.now() - remainingPremiumTime), { long: true }).replace("3 months", "3 شهور").replace("2 months", "شهرين").replace("1 month", "شهر").replace("ms", "أقل من ثانية");
          remainingPremiumTime = (remainingPremiumTime.search(/\s*([2-9]|10)\s*[minutes|seconds|hours|days|months]/)) ? remainingPremiumTime.replace("days", "يوم").replace("hours", "ساعة").replace("minutes", "دقيقة").replace("seconds", "ثانية") : remainingPremiumTime.replace("days", "أيام").replace("hours", "ساعات").replace("minutes", "دقائق").replace("seconds", "ثواني");
          message.channel.send(`${config.emoji.timer} **متبقي \`${remainingPremiumTime.replace(" ", "")}\` لإنتهاء ال${premiumPlusText}**`);
        } else {
          message.channel.send(`${config.emoji.error} **هذا السيرفر ليس بريميوم!**`);
        }
      } else {
        if (config.owners.some(id => id == message.author.id)) {
          if (isPremium) {
            message.channel.send(`${config.emoji.premium} **هذا السيرفر ${premiumPlusText}!**`);
          } else {
            premiumPlusText = (isPlus) ? "بريميوم بلس" : "بريميوم";
            message.channel.send(`${config.emoji.success} **تم تفعيل ال${premiumPlusText}!**`);
            DB.premium.set(`premium_${serverID}`, Date.now());
            DB.premium.set(`expire_${serverID}`, premiumTime);
            if (isPlus) DB.premium.set(`plus_${serverID}`, "on");
          }
        }
      }
    }
  }
});

// remove premium

setInterval(() => {
  client.guilds.cache.forEach(g => {
    let expire = DB.premium.get(`premium_${g.id}`);
    let exp = DB.premium.get(`expire_${g.id}`);
    if (!expire || DB.premium.get(`expire_${g.id}`) == "i") return;

    var ex;
    if (exp == "1m") ex = (86400 * 30) * 1000;
    if (exp == "0") ex = 1000;
    if (exp == "3m") ex = (86400 * (30 * 3)) * 1000;
    if (expire !== null && ex - (Date.now() - expire) > 0) return;

    DB.premium.remove(`premium_${g.id}`);
    DB.premium.remove(`expire_${g.id}`);
    DB.premium.remove(`plus_${g.id}`);
    DB.premiumShare.remove(`mention_${g.id}`);
  });
}, 3600000);

// auto share

setInterval(() => {
  client.guilds.cache.forEach(g => {
    let isBotAdministrator = (message.guild.me.hasPermission("ADMINISTRATOR")) ? true : false;
    let isBanned = DB.ban.get(`ban_${g.id}`);
    let isPremium = DB.premium.get(`premium_${g.id}`);
    let autoShareInvite = DB.premiumShare.get(`autoshare_${g.id}`);
    let time = DB.coolshare.get(`cool_${g.id}`);
    let timeshare = (3600 / 2) * 1000;

    if (isBotAdministrator && !isBanned && isPremium && autoShareInvite) {
      if (time == null || timeshare - (Date.now() - time) < (3600 * -1000)) {
          DB.coolshare.set(`cool_${g.id}`, Date.now());
          share(g.name, autoShareInvite);
        }
      }
  });
}, 60000);

// share

function share(serverName, invite, mention = "") {
  client.guilds.cache.forEach(c => {
     let description = DB.descs.get(`description_${c.id}`);
    let isPremiumPlus = DB.premium.get(`plus_${c.id}`);
    let room = c.channels.cache.get(DB.channels.get(`channel_${c.id}`));
    if (!room && !isPremiumPlus) {
      c.channels.create("future-servers", { type: "text" }).then(r => {
        DB.channels.set(`channel_${c.id}`, r.id);
        r.createOverwrite(c.id, {
          VIEW_CHANNEL: true,
          READ_MESSAGE_HISTORY: true,
          SEND_MESSAGES: false
        });

        r.send(`${config.emoji.servername} **Server Name:** ${serverName}\n${config.emoji.description} **Description:** \`${description || "لا يوجد"}\`\n${config.emoji.invite} **Invite Link:** ${invite} ${mention}`);
      });
    } else {
      if (isPremiumPlus && !room) return;
      room.createOverwrite(c.id, { VIEW_CHANNEL: true, READ_MESSAGE_HISTORY: true, SEND_MESSAGES: false });
      room.send(`${config.emoji.servername} **Server Name:** ${serverName}\n${config.emoji.description} **Description:** \`${description || "لا يوجد"}\`\n${config.emoji.invite} **Invite Link:** ${invite} ${mention}`);
    }
  });
}

// leave

client.on("guildDelete", guild => {
  let isPremium = DB.premium.get(`premium_${guild.id}`);

  if (!isPremium) {
    DB.channels.remove(`channel_${guild.id}`);
    DB.descs.remove(`description_${guild.id}`);
    DB.coolshare.remove(`cool_${guild.id}`);
    DB.premiumShare.remove(`mention_${guild.id}`);
    DB.premiumShare.remove(`autoshare_${guild.id}`);
  }

  console.log(`🟥 Left form: (${guild.name}) <${guild.id}>`);
});

client.login(config.token);
