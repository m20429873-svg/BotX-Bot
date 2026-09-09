const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");

// ==================================================
// BOTX - CONFIG
// ==================================================

const PREFIX = "!";

// بيانات سيرفرك
const SERVER_IP = "Coper-_-crfte.aternos.me:31246";
const SERVER_VERSION = "1.21.x";
const DISCORD_INVITE = "https://discord.gg/jk3W7SUrq";

// أسماء الرتبة والقسم
const SUPPORT_ROLE_NAME = "Support";
const TICKET_CATEGORY_NAME = "🎫・TICKETS";

// النقاط
const CLAIM_POINTS = 5;
const WRONG_CLAIM_PENALTY = 50;

// الراتب
const SALARY_AMOUNT = 10;
const SALARY_COOLDOWN = 24 * 60 * 60 * 1000;

// ==================================================
// INTENTS
// ==================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ==================================================
// FILES
// ==================================================

const POINTS_FILE = "./points.json";
const SALARY_FILE = "./salary.json";
const CLAIMS_FILE = "./claims.json";

function createFile(file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "{}");
  }
}

createFile(POINTS_FILE);
createFile(SALARY_FILE);
createFile(CLAIMS_FILE);

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ==================================================
// DATA
// ==================================================

function getPoints() {
  return readJSON(POINTS_FILE);
}

function savePoints(data) {
  saveJSON(POINTS_FILE, data);
}

function getSalary() {
  return readJSON(SALARY_FILE);
}

function saveSalary(data) {
  saveJSON(SALARY_FILE, data);
}

function getClaims() {
  return readJSON(CLAIMS_FILE);
}

function saveClaims(data) {
  saveJSON(CLAIMS_FILE, data);
}

// ==================================================
// FUNCTIONS
// ==================================================

function isAdmin(member) {
  return member &&
    member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );
}

function getUserPoints(userId) {
  const points = getPoints();
  return points[userId] || 0;
}

function addPoints(userId, amount) {
  const points = getPoints();

  if (!points[userId]) {
    points[userId] = 0;
  }

  points[userId] += amount;

  savePoints(points);

  return points[userId];
}

// ==================================================
// READY
// ==================================================

client.once("ready", () => {
  console.log("=================================");
  console.log(`🤖 BotX يعمل باسم ${client.user.tag}`);
  console.log(`🌐 السيرفر: ${SERVER_IP}`);
  console.log("=================================");

  client.user.setPresence({
    activities: [
      {
        name: "Copercrfte 🎮",
        type: 3
      }
    ],
    status: "online"
  });
});

// ==================================================
// BUTTONS
// ==================================================

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isButton()) return;

  // ==================================================
  // CREATE TICKET
  // ==================================================

  if (interaction.customId === "create_ticket") {

    const guild = interaction.guild;

    // هل عنده تذكرة بالفعل؟
    const existingTicket = guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildText &&
        channel.name === `ticket-${interaction.user.username.toLowerCase()}`
    );

    if (existingTicket) {
      return interaction.reply({
        content: `❌ عندك تذكرة مفتوحة بالفعل: ${existingTicket}`,
        ephemeral: true
      });
    }

    // البحث عن قسم التذاكر
    let category = guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === TICKET_CATEGORY_NAME
    );

    // إنشاء القسم إذا لم يكن موجودًا
    if (!category) {
      category = await guild.channels.create({
        name: TICKET_CATEGORY_NAME,
        type: ChannelType.GuildCategory
      });
    }

    // البحث عن رتبة الدعم
    const supportRole = guild.roles.cache.find(
      role => role.name === SUPPORT_ROLE_NAME
    );

    // صلاحيات التذكرة
    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [
          PermissionsBitField.Flags.ViewChannel
        ]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      }
    ];

    if (supportRole) {
      permissionOverwrites.push({
        id: supportRole.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      });
    }

    permissionOverwrites.push({
      id: client.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageChannels
      ]
    });

    // إنشاء التذكرة
    const ticket = await guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites
    });

    const embed = new EmbedBuilder()
      .setTitle("🎫 تذكرة الدعم")
      .setDescription(
        `أهلًا ${interaction.user} 👋\n\n` +
        `اكتب مشكلتك بالتفصيل وسيقوم فريق الإدارة بمساعدتك.\n\n` +
        `🎯 **Claim** لاستلام التذكرة\n` +
        `🔒 **Close** لإغلاق التذكرة`
      )
      .setFooter({
        text: "BotX • Copercrfte"
      });

    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("claim_ticket")
          .setLabel("Claim")
          .setEmoji("🎯")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Close")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      );

    await ticket.send({
      content: `${interaction.user} ${supportRole ? `<@&${supportRole.id}>` : ""}`,
      embeds: [embed],
      components: [buttons]
    });

    return interaction.reply({
      content: `✅ تم إنشاء تذكرتك: ${ticket}`,
      ephemeral: true
    });
  }

  // ==================================================
  // CLAIM
  // ==================================================

  if (interaction.customId === "claim_ticket") {

    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: "❌ هذا الزر للإدارة فقط.",
        ephemeral: true
      });
    }

    const claims = getClaims();
    const channelId = interaction.channel.id;

    // أول شخص يستلم
    if (!claims[channelId]) {

      claims[channelId] = interaction.user.id;
      saveClaims(claims);

      const newPoints = addPoints(
        interaction.user.id,
        CLAIM_POINTS
      );

      return interaction.reply(
        `🎫 تم استلام التذكرة بواسطة ${interaction.user}\n\n` +
        `💰 **+${CLAIM_POINTS} نقاط**\n` +
        `⭐ نقاطك الآن: **${newPoints}**`
      );
    }

    // نفس الشخص
    if (claims[channelId] === interaction.user.id) {
      return interaction.reply({
        content: "⚠️ أنت مستلم هذه التذكرة بالفعل.",
        ephemeral: true
      });
    }

    // شخص آخر
    const newPoints = addPoints(
      interaction.user.id,
      -WRONG_CLAIM_PENALTY
    );

    return interaction.reply(
      `⚠️ هذه التذكرة مستلمة بالفعل بواسطة <@${claims[channelId]}>.\n\n` +
      `💸 تم خصم **${WRONG_CLAIM_PENALTY} نقطة** منك.\n` +
      `⭐ نقاطك الآن: **${newPoints}**`
    );
  }

  // ==================================================
  // CLOSE TICKET
  // ==================================================

  if (interaction.customId === "close_ticket") {

    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: "❌ الإدارة فقط تستطيع إغلاق التذكرة.",
        ephemeral: true
      });
    }

    await interaction.reply("🔒 سيتم إغلاق التذكرة خلال 3 ثوانٍ...");

    setTimeout(async () => {

      const claims = getClaims();

      delete claims[interaction.channel.id];

      saveClaims(claims);

      try {
        await interaction.channel.delete();
      } catch (error) {
        console.log("❌ لم أستطع حذف التذكرة:", error.message);
      }

    }, 3000);
  }
});

// ==================================================
// MESSAGE COMMANDS
// ==================================================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (!message.guild) return;

  const content = message.content.trim();

  // ==================================================
  // PING
  // ==================================================

  if (content.toLowerCase() === "!ping") {
    return message.reply("🏓 Pong! بوت BotX يعمل.");
  }

  // ==================================================
  // HELP
  // ==================================================

  if (content.toLowerCase() === "!help") {

    return message.reply(
      "🤖 **أوامر BotX**\n\n" +
      "🏓 `!ping` — اختبار البوت\n" +
      "⭐ `!نقاطي` — عرض نقاطك\n" +
      "🏆 `!top` — أفضل 5\n" +
      "💰 `!راتبي` — استلام الراتب\n" +
      "🎫 `!ticket-panel` — إنشاء لوحة التذاكر\n" +
      "🌐 `!ip` — معلومات السيرفر\n\n" +
      "👑 **أوامر الإدارة**\n" +
      "`!add @user 10`\n" +
      "`!- @user 10`"
    );
  }

  // ==================================================
  // IP
  // ==================================================

  if (content.toLowerCase() === "!ip") {

    return message.reply(
      "🎮 **Copercrfte Minecraft**\n\n" +
      `🌐 IP: \`${SERVER_IP}\`\n` +
      `📱 Bedrock Port: \`31246\`\n` +
      `🔧 Version: \`${SERVER_VERSION}\`\n\n` +
      `💬 Discord: ${DISCORD_INVITE}`
    );
  }

  // ==================================================
  // POINTS
  // ==================================================

  if (content === "!نقاطي") {

    const points = getUserPoints(message.author.id);

    return message.reply(
      `⭐ ${message.author}\n` +
      `رصيد نقاطك: **${points} نقطة**`
    );
  }

  // ==================================================
  // TOP
  // ==================================================

  if (content.toLowerCase() === "!top") {

    const points = getPoints();

    const leaderboard = Object.entries(points)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (leaderboard.length === 0) {
      return message.reply("📊 لا توجد نقاط حتى الآن.");
    }

    let text = "🏆 **أفضل 5 من الإدارة**\n\n";

    leaderboard.forEach(([userId, userPoints], index) => {
      text +=
        `**${index + 1}.** <@${userId}> — **${userPoints} نقطة**\n`;
    });

    return message.reply(text);
  }

  // ==================================================
  // SALARY
  // ==================================================

  if (content === "!راتبي") {

    const salary = getSalary();
    const userId = message.author.id;
    const now = Date.now();

    if (salary[userId]) {

      const remaining =
        SALARY_COOLDOWN - (now - salary[userId]);

      if (remaining > 0) {

        const hours =
          Math.floor(remaining / (60 * 60 * 1000));

        const minutes =
          Math.floor(
            (remaining % (60 * 60 * 1000)) /
            (60 * 1000)
          );

        return message.reply(
          `⏳ استلمت راتبك بالفعل.\n` +
          `ارجع بعد **${hours} ساعة و ${minutes} دقيقة**.`
        );
      }
    }

    salary[userId] = now;
    saveSalary(salary);

    const newPoints = addPoints(
      userId,
      SALARY_AMOUNT
    );

    return message.reply(
      `💰 **تم استلام راتبك!**\n\n` +
      `🎁 +${SALARY_AMOUNT} نقاط\n` +
      `⭐ نقاطك الآن: **${newPoints}**`
    );
  }

  // ==================================================
  // ADD POINTS
  // ==================================================

  if (content.toLowerCase().startsWith("!add")) {

    if (!isAdmin(message.member)) {
      return message.reply("❌ هذا الأمر للإدارة فقط.");
    }

    const args = content.split(/\s+/);

    const user = message.mentions.users.first();

    const amount = Number(args[2]);

    if (!user || !Number.isInteger(amount)) {
      return message.reply(
        "❌ الاستخدام الصحيح:\n" +
        "`!add @user 10`"
      );
    }

    const newPoints = addPoints(
      user.id,
      amount
    );

    return message.reply(
      `✅ تمت إضافة **${amount} نقطة** إلى ${user}.\n` +
      `⭐ الرصيد الآن: **${newPoints}**`
    );
  }

  // ==================================================
  // REMOVE POINTS
  // ==================================================

  if (content.startsWith("!-")) {

    if (!isAdmin(message.member)) {
      return message.reply("❌ هذا الأمر للإدارة فقط.");
    }

    const args = content.split(/\s+/);

    const user = message.mentions.users.first();

    const amount = Number(args[2]);

    if (!user || !Number.isInteger(amount)) {
      return message.reply(
        "❌ الاستخدام الصحيح:\n" +
        "`!- @user 10`"
      );
    }

    const newPoints = addPoints(
      user.id,
      -amount
    );

    return message.reply(
      `✅ تم خصم **${amount} نقطة** من ${user}.\n` +
      `⭐ الرصيد الآن: **${newPoints}**`
    );
  }

  // ==================================================
  // TICKET PANEL
  // ==================================================

  if (content.toLowerCase() === "!ticket-panel") {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ الإدارة فقط تستطيع إنشاء لوحة التذاكر."
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("🎫 مركز الدعم")
      .setDescription(
        "تحتاج مساعدة؟\n\n" +
        "اضغط على الزر بالأسفل لإنشاء تذكرة خاصة مع فريق الإدارة.\n\n" +
        "📌 لا تفتح أكثر من تذكرة بدون سبب."
      )
      .setFooter({
        text: "BotX • Copercrfte"
      });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("Create Ticket")
          .setEmoji("🎫")
          .setStyle(ButtonStyle.Success)
      );

    return message.channel.send({
      embeds: [embed],
      components: [row]
    });
  }
});

// ==================================================
// ERROR HANDLING
// ==================================================

process.on("unhandledRejection", error => {
  console.log("Unhandled Rejection:", error);
});

process.on("uncaughtException", error => {
  console.log("Uncaught Exception:", error);
});

// ==================================================
// LOGIN
// ==================================================

if (!process.env.TOKEN) {
  console.log("❌ TOKEN غير موجود في Environment Variables.");
  process.exit(1);
}

client.login(process.env.TOKEN);
