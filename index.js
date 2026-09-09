const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require("discord.js");
const fs = require("fs");

// =========================
// BotX
// =========================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const DATA_FILE = "./points.json";

// إنشاء ملف النقاط إذا لم يكن موجودًا
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "{}");
}

function getPoints() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function savePoints(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

// التذاكر التي تم استلامها
const claimedTickets = new Map();

// =========================
// تشغيل البوت
// =========================

client.once("ready", () => {
  console.log(`🤖 BotX يعمل باسم ${client.user.tag}`);
});

// =========================
// الأوامر
// =========================

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  // -------------------------
  // !ping
  // -------------------------

  if (command === "!ping") {
    return message.reply("🏓 Pong! بوت BotX يعمل.");
  }

  // -------------------------
  // !claim
  // -------------------------

  if (command === "!claim") {

    if (!message.guild) return;

    // يجب أن يكون إداريًا
    if (!isAdmin(message.member)) {
      return message.reply("❌ هذا الأمر للإدارة فقط.");
    }

    /*
      ملاحظة:
      هنا نعتبر صاحب التذكرة هو أول شخص
      لديه صلاحية ViewChannel وليس BotX.
      سنربطه لاحقًا مع Ticket Tool بشكل أدق.
    */

    const ticketId = message.channel.id;

    // إذا لم يتم استلام التذكرة
    if (!claimedTickets.has(ticketId)) {

      claimedTickets.set(ticketId, message.author.id);

      const points = getPoints();

      if (!points[message.author.id]) {
        points[message.author.id] = 0;
      }

      points[message.author.id] += 5;

      savePoints(points);

      return message.reply(
        `🎫 تم استلام التذكرة بواسطة <@${message.author.id}>\n` +
        `💰 حصلت على **+5 نقاط**.\n` +
        `⭐ نقاطك الآن: **${points[message.author.id]}**`
      );
    }

    // إذا كانت التذكرة مستلمة بالفعل
    const firstClaimer = claimedTickets.get(ticketId);

    if (firstClaimer === message.author.id) {
      return message.reply(
        "⚠️ أنت مستلم هذه التذكرة بالفعل."
      );
    }

    const points = getPoints();

    if (!points[message.author.id]) {
      points[message.author.id] = 0;
    }

    points[message.author.id] -= 50;

    savePoints(points);

    return message.reply(
      `⚠️ هذه التذكرة مستلمة بالفعل بواسطة <@${firstClaimer}>.\n` +
      `💸 تم خصم **50 نقطة** منك.\n` +
      `⭐ نقاطك الآن: **${points[message.author.id]}**`
    );
  }

  // -------------------------
  // !نقاطي
  // -------------------------

  if (command === "!نقاطي") {

    const points = getPoints();
    const userPoints = points[message.author.id] || 0;

    return message.reply(
      `⭐ نقاطك: **${userPoints}**`
    );
  }

  // -------------------------
  // !top
  // -------------------------

  if (command === "!top") {

    const points = getPoints();

    const leaderboard = Object.entries(points)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (leaderboard.length === 0) {
      return message.reply("📊 لا توجد نقاط حتى الآن.");
    }

    let text = "🏆 **أفضل 5 من الإدارة**\n\n";

    leaderboard.forEach(([userId, userPoints], index) => {
      text += `${index + 1}. <@${userId}> — **${userPoints} نقطة**\n`;
    });

    return message.reply(text);
  }

  // -------------------------
  // !add @user amount
  // -------------------------

  if (command === "!add") {

    if (!isAdmin(message.member)) {
      return message.reply("❌ هذا الأمر للإدارة فقط.");
    }

    const user = message.mentions.users.first();
    const amount = Number(args[1]);

    if (!user || !Number.isInteger(amount)) {
      return message.reply(
        "❌ الاستخدام الصحيح:\n`!add @user 10`"
      );
    }

    const points = getPoints();

    if (!points[user.id]) {
      points[user.id] = 0;
    }

    points[user.id] += amount;

    savePoints(points);

    return message.reply(
      `✅ تمت إضافة **${amount} نقطة** إلى <@${user.id}>.\n` +
      `⭐ رصيده الآن: **${points[user.id]}**`
    );
  }

  // -------------------------
  // !- @user amount
  // -------------------------

  if (command === "!-") {

    if (!isAdmin(message.member)) {
      return message.reply("❌ هذا الأمر للإدارة فقط.");
    }

    const user = message.mentions.users.first();
    const amount = Number(args[1]);

    if (!user || !Number.isInteger(amount)) {
      return message.reply(
        "❌ الاستخدام الصحيح:\n`!- @user 10`"
      );
    }

    const points = getPoints();

    if (!points[user.id]) {
      points[user.id] = 0;
    }

    points[user.id] -= amount;

    savePoints(points);

    return message.reply(
      `✅ تم خصم **${amount} نقطة** من <@${user.id}>.\n` +
      `⭐ رصيده الآن: **${points[user.id]}**`
    );
  }
});

// =========================
// تسجيل الدخول
// =========================

// لا تضع التوكن هنا مباشرة.
// سنضعه في ملف .env لاحقًا.
client.login(process.env.TOKEN);
