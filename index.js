const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const fs = require("fs");

// ======================================================
//                    BOTX CONFIG
// ======================================================

const CONFIG = {

  // اسم سيرفر البرمجة
  SERVER_NAME: "⌁ 𝑩𝒐𝒕𝑿 ⌁ ✔",

  // روم التذاكر
  TICKET_CATEGORY: "🎫・『 التذاكر 』",

  // روم اللوج
  LOG_CHANNEL: "📋・『 اللوج 』",

  // روم الترحيب
  WELCOME_CHANNEL: "👋・『 الترحيب 』",

  // روم طلبات المطورين
  APPLICATION_CHANNEL: "📝・『 طلبات المطورين 』",

  // ====================================================
  // رتب المطورين
  // ====================================================

  RANKS: [
    {
      name: "🌱・『 مـطـور مـبـتـدئ 』",
      required: 0,
      salary: 100
    },

    {
      name: "💻・『 مـطـور 』",
      required: 500,
      salary: 200
    },

    {
      name: "⚡・『 مـطـور مـتـقـدم 』",
      required: 1000,
      salary: 300
    },

    {
      name: "💎・『 مـطـور خـبـير 』",
      required: 1500,
      salary: 500
    }
  ],

  // النقاط
  CLAIM_REWARD: 5,
  WRONG_CLAIM_PENALTY: 50,

  // رابط الديسكورد
  DISCORD_INVITE: "https://discord.gg/ZwfyExfZq"
};

// ======================================================
//                    DISCORD CLIENT
// ======================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ======================================================
//                    DATABASE
// ======================================================

const FILES = {
  points: "./points.json",
  tickets: "./tickets.json",
  salaries: "./salaries.json"
};

for (const file of Object.values(FILES)) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "{}");
  }
}

function read(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function save(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  );
}

// ======================================================
//                    HELPERS
// ======================================================

function isAdmin(member) {
  return member?.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function isDeveloper(member) {
  if (!member) return false;

  return CONFIG.RANKS.some(rank =>
    member.roles.cache.some(role =>
      role.name === rank.name
    )
  );
}

function getRank(member) {
  if (!member) return null;

  // الأعلى أولاً
  for (let i = CONFIG.RANKS.length - 1; i >= 0; i--) {
    const rank = CONFIG.RANKS[i];

    if (
      member.roles.cache.some(role =>
        role.name === rank.name
      )
    ) {
      return rank;
    }
  }

  return null;
}

function getPoints(userId) {
  const points = read(FILES.points);
  return Number(points[userId] || 0);
}

function setPoints(userId, amount) {
  const points = read(FILES.points);

  points[userId] = amount;

  save(FILES.points, points);
}

function addPoints(userId, amount) {
  const current = getPoints(userId);
  const total = current + amount;

  setPoints(userId, total);

  return total;
}

// ======================================================
//                    LOG SYSTEM
// ======================================================

async function sendLog(guild, text) {

  const channel = guild.channels.cache.find(
    c => c.name === CONFIG.LOG_CHANNEL
  );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setDescription(text)
    .setTimestamp();

  await channel.send({
    embeds: [embed]
  }).catch(() => {});
}

// ======================================================
//                    AUTO RANK
// ======================================================

async function checkPromotion(member) {

  if (!member) return;

  const points = getPoints(member.id);

  // نبحث عن أعلى رتبة وصل لها
  let targetRank = CONFIG.RANKS[0];

  for (const rank of CONFIG.RANKS) {
    if (points >= rank.required) {
      targetRank = rank;
    }
  }

  const currentRank = getRank(member);

  if (!currentRank) {

    const role = member.guild.roles.cache.find(
      r => r.name === targetRank.name
    );

    if (role) {
      await member.roles.add(role).catch(() => {});

      setPoints(member.id, 0);

      await sendLog(
        member.guild,
        `🎉 **ترقية جديدة**\n\n` +
        `👤 ${member}\n` +
        `🏅 الرتبة: **${targetRank.name}**`
      );
    }

    return;
  }

  const currentIndex =
    CONFIG.RANKS.findIndex(
      r => r.name === currentRank.name
    );

  const targetIndex =
    CONFIG.RANKS.findIndex(
      r => r.name === targetRank.name
    );

  if (targetIndex > currentIndex) {

    const oldRole =
      member.guild.roles.cache.find(
        r => r.name === currentRank.name
      );

    const newRole =
      member.guild.roles.cache.find(
        r => r.name === targetRank.name
      );

    if (oldRole) {
      await member.roles.remove(oldRole).catch(() => {});
    }

    if (newRole) {
      await member.roles.add(newRole).catch(() => {});
    }

    // تصفير النقاط
    setPoints(member.id, 0);

    await sendLog(
      member.guild,
      `🎉 **تمت ترقية مطور!**\n\n` +
      `👤 ${member}\n` +
      `⬆️ من: **${currentRank.name}**\n` +
      `🏅 إلى: **${targetRank.name}**\n` +
      `🔄 النقاط أصبحت: **0**`
    );

    try {
      await member.send(
        `🎉 مبروك!\n\n` +
        `تمت ترقيتك في **${CONFIG.SERVER_NAME}** إلى:\n` +
        `🏅 **${targetRank.name}**\n\n` +
        `🔄 تم تصفير نقاطك وبدأت مرحلة جديدة.`
      );
    } catch {}
  }
}

// ======================================================
//                    READY
// ======================================================

client.once("ready", () => {

  console.log("====================================");
  console.log(`🤖 ${client.user.tag} يعمل الآن`);
  console.log(`🌐 ${CONFIG.SERVER_NAME}`);
  console.log("====================================");

  client.user.setPresence({
    activities: [
      {
        name: "⌁ 𝑩𝒐𝒕𝑿 ⌁ ✔",
        type: 3
      }
    ],
    status: "online"
  });
});

// ======================================================
//                    BUTTONS
// ======================================================

client.on("interactionCreate", async interaction => {

  // ====================================================
  // CREATE TICKET
  // ====================================================

  if (
    interaction.isButton() &&
    interaction.customId === "create_ticket"
  ) {

    const guild = interaction.guild;

    const tickets = read(FILES.tickets);

    const alreadyOpen =
      Object.values(tickets).find(
        ticket =>
          ticket.ownerId === interaction.user.id &&
          ticket.closed === false
      );

    if (alreadyOpen) {

      const channel =
        guild.channels.cache.get(
          alreadyOpen.channelId
        );

      return interaction.reply({
        content:
          `❌ عندك تذكرة مفتوحة بالفعل ${channel || ""}`,
        ephemeral: true
      });
    }

    let category =
      guild.channels.cache.find(
        c =>
          c.type === ChannelType.GuildCategory &&
          c.name === CONFIG.TICKET_CATEGORY
      );

    if (!category) {

      category = await guild.channels.create({
        name: CONFIG.TICKET_CATEGORY,
        type: ChannelType.GuildCategory
      });
    }

    const ticket = await guild.channels.create({

      name:
        `ticket-${interaction.user.username}`
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, "")
          .slice(0, 80),

      type: ChannelType.GuildText,

      parent: category.id,

      permissionOverwrites: [
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
        },

        {
          id: client.user.id,

          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels
          ]
        }
      ]
    });

    tickets[ticket.id] = {
      channelId: ticket.id,
      ownerId: interaction.user.id,
      claimerId: null,
      closed: false,
      createdAt: Date.now()
    };

    save(FILES.tickets, tickets);

    const embed = new EmbedBuilder()
      .setTitle("🎫 تذكرة الدعم")
      .setDescription(
        `أهلًا ${interaction.user} 👋\n\n` +
        `اكتب مشكلتك بالتفصيل.\n\n` +
        `🎯 **Claim** — استلام التذكرة\n` +
        `🔒 **Close** — إغلاق التذكرة\n\n` +
        `⚠️ صاحب التذكرة لا يستطيع Claim أو Close.`
      )
      .setFooter({
        text: CONFIG.SERVER_NAME
      });

    const row = new ActionRowBuilder()
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
      content: `${interaction.user}`,
      embeds: [embed],
      components: [row]
    });

    await sendLog(
      guild,
      `🎫 **تذكرة جديدة**\n\n` +
      `👤 صاحب التذكرة: ${interaction.user}\n` +
      `📁 التذكرة: ${ticket}`
    );

    return interaction.reply({
      content: `✅ تم إنشاء تذكرتك: ${ticket}`,
      ephemeral: true
    });
  }

  // ====================================================
  // CLAIM
  // ====================================================

  if (
    interaction.isButton() &&
    interaction.customId === "claim_ticket"
  ) {

    const tickets = read(FILES.tickets);

    const ticket =
      tickets[interaction.channel.id];

    if (!ticket) {
      return interaction.reply({
        content: "❌ هذه ليست تذكرة مسجلة.",
        ephemeral: true
      });
    }

    // صاحب التذكرة
    if (
      ticket.ownerId ===
      interaction.user.id
    ) {
      return interaction.reply({
        content:
          "❌ لا يمكنك استلام التذكرة التي قمت بفتحها.",
        ephemeral: true
      });
    }

    // لازم يكون مطور
    if (
      !isDeveloper(interaction.member) &&
      !isAdmin(interaction.member)
    ) {
      return interaction.reply({
        content:
          "❌ هذا الزر للمطورين والإدارة فقط.",
        ephemeral: true
      });
    }

    // التذكرة مستلمة
    if (ticket.claimerId) {

      // نفس الشخص
      if (
        ticket.claimerId ===
        interaction.user.id
      ) {
        return interaction.reply({
          content:
            "⚠️ أنت مستلم هذه التذكرة بالفعل.",
          ephemeral: true
        });
      }

      // خصم 50
      const newPoints = addPoints(
        interaction.user.id,
        -CONFIG.WRONG_CLAIM_PENALTY
      );

      await sendLog(
        interaction.guild,
        `🚨 **محاولة Claim ثانية**\n\n` +
        `👤 ${interaction.user}\n` +
        `🎫 ${interaction.channel}\n` +
        `💸 الخصم: **-${CONFIG.WRONG_CLAIM_PENALTY}**\n` +
        `⭐ الرصيد: **${newPoints}**`
      );

      return interaction.reply(
        `🚫 التذكرة مستلمة بالفعل بواسطة <@${ticket.claimerId}>.\n\n` +
        `💸 تم خصم **${CONFIG.WRONG_CLAIM_PENALTY} نقطة** منك.\n` +
        `⭐ نقاطك الآن: **${newPoints}**`
      );
    }

    // Claim أول
    ticket.claimerId =
      interaction.user.id;

    save(FILES.tickets, tickets);

    const newPoints = addPoints(
      interaction.user.id,
      CONFIG.CLAIM_REWARD
    );

    await checkPromotion(
      interaction.member
    );

    await sendLog(
      interaction.guild,
      `🎯 **تم استلام تذكرة**\n\n` +
      `👤 المطور: ${interaction.user}\n` +
      `🎫 التذكرة: ${interaction.channel}\n` +
      `💰 المكافأة: **+${CONFIG.CLAIM_REWARD}**`
    );

    return interaction.reply(
      `🎯 تم استلام التذكرة بواسطة ${interaction.user}\n\n` +
      `💰 حصلت على **+${CONFIG.CLAIM_REWARD} نقطة**.\n` +
      `⭐ نقاطك الآن: **${getPoints(interaction.user.id)}**`
    );
  }

  // ====================================================
  // CLOSE
  // ====================================================

  if (
    interaction.isButton() &&
    interaction.customId === "close_ticket"
  ) {

    const tickets = read(FILES.tickets);

    const ticket =
      tickets[interaction.channel.id];

    if (!ticket) {
      return interaction.reply({
        content: "❌ هذه ليست تذكرة مسجلة.",
        ephemeral: true
      });
    }

    // صاحب التذكرة لا يقفل
    if (
      ticket.ownerId ===
      interaction.user.id
    ) {
      return interaction.reply({
        content:
          "❌ صاحب التذكرة لا يستطيع إغلاقها.",
        ephemeral: true
      });
    }

    if (
      !isDeveloper(interaction.member) &&
      !isAdmin(interaction.member)
    ) {
      return interaction.reply({
        content:
          "❌ المطورون والإدارة فقط يستطيعون إغلاق التذاكر.",
        ephemeral: true
      });
    }

    ticket.closed = true;

    save(FILES.tickets, tickets);

    await interaction.reply(
      "🔒 سيتم إغلاق التذكرة خلال **5 ثوانٍ**."
    );

    await sendLog(
      interaction.guild,
      `🔒 **تم إغلاق تذكرة**\n\n` +
      `👤 بواسطة: ${interaction.user}\n` +
      `🎫 التذكرة: ${interaction.channel}`
    );

    setTimeout(async () => {

      await interaction.channel.delete()
        .catch(() => {});

    }, 5000);

    return;
  }

  // ====================================================
  // APPLICATION MODAL
  // ====================================================

  if (
    interaction.isButton() &&
    interaction.customId === "developer_application"
  ) {

    const modal = new ModalBuilder()
      .setCustomId("developer_application_modal")
      .setTitle("📝 طلب مطور");

    const name = new TextInputBuilder()
      .setCustomId("app_name")
      .setLabel("اسمك")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const age = new TextInputBuilder()
      .setCustomId("app_age")
      .setLabel("عمرك")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const experience = new TextInputBuilder()
      .setCustomId("app_experience")
      .setLabel("خبرتك في البرمجة")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const reason = new TextInputBuilder()
      .setCustomId("app_reason")
      .setLabel("لماذا تريد أن تصبح مطورًا؟")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(name),
      new ActionRowBuilder().addComponents(age),
      new ActionRowBuilder().addComponents(experience),
      new ActionRowBuilder().addComponents(reason)
    );

    return interaction.showModal(modal);
  }

  // ====================================================
  // APPLICATION SUBMIT
  // ====================================================

  if (
    interaction.isModalSubmit() &&
    interaction.customId ===
      "developer_application_modal"
  ) {

    const name =
      interaction.fields.getTextInputValue(
        "app_name"
      );

    const age =
      interaction.fields.getTextInputValue(
        "app_age"
      );

    const experience =
      interaction.fields.getTextInputValue(
        "app_experience"
      );

    const reason =
      interaction.fields.getTextInputValue(
        "app_reason"
      );

    const channel =
      interaction.guild.channels.cache.find(
        c => c.name === CONFIG.APPLICATION_CHANNEL
      );

    const embed = new EmbedBuilder()
      .setTitle("📝 طلب مطور جديد")
      .addFields(
        {
          name: "👤 العضو",
          value: `${interaction.user}`
        },
        {
          name: "📛 الاسم",
          value: name
        },
        {
          name: "🎂 العمر",
          value: age
        },
        {
          name: "💻 الخبرة",
          value: experience
        },
        {
          name: "❓ السبب",
          value: reason
        }
      )
      .setTimestamp();

    if (channel) {
      await channel.send({
        embeds: [embed]
      });
    }

    return interaction.reply({
      content:
        "✅ تم إرسال طلب المطور للإدارة بنجاح.",
      ephemeral: true
    });
  }
});

// ======================================================
//                    MESSAGE COMMANDS
// ======================================================

client.on("messageCreate", async message => {

  if (message.author.bot) return;
  if (!message.guild) return;

  const content =
    message.content.trim();

  // ====================================================
  // PING
  // ====================================================

  if (
    content.toLowerCase() === "!ping"
  ) {
    return message.reply(
      "🏓 Pong! BotX يعمل."
    );
  }

  // ====================================================
  // HELP
  // ====================================================

  if (
    content.toLowerCase() === "!help"
  ) {

    return message.reply(
      "🤖 **أوامر BotX**\n\n" +

      "🏓 `!ping`\n" +
      "⭐ `!نقاطي`\n" +
      "🏆 `!top`\n" +
      "🎫 `!ticket-panel`\n" +
      "📝 `!application-panel`\n" +
      "💰 `!salary @user`\n\n" +

      "👑 **أوامر الإدارة**\n" +
      "`!add @user 10`\n" +
      "`!- @user 10`\n" +
      "`!clear 10`"
    );
  }

  // ====================================================
  // POINTS
  // ====================================================

  if (
    content === "!نقاطي"
  ) {

    const points =
      getPoints(message.author.id);

    return message.reply(
      `⭐ ${message.author}\n` +
      `رصيدك الحالي: **${points} نقطة**`
    );
  }

  // ====================================================
  // TOP
  // ====================================================

  if (
    content.toLowerCase() === "!top"
  ) {

    const points = read(FILES.points);

    const top =
      Object.entries(points)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (!top.length) {
      return message.reply(
        "📊 لا توجد نقاط حتى الآن."
      );
    }

    let text =
      "🏆 **أفضل 5 مطورين**\n\n";

    top.forEach(
      ([id, points], index) => {

        text +=
          `**${index + 1}.** <@${id}> — **${points} نقطة**\n`;
      }
    );

    return message.reply(text);
  }

  // ====================================================
  // ADD
  // ====================================================

  if (
    content.toLowerCase().startsWith("!add ")
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ الإدارة فقط."
      );
    }

    const args =
      content.split(/\s+/);

    const user =
      message.mentions.users.first();

    const amount =
      Number(args[2]);

    if (
      !user ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return message.reply(
        "❌ الاستخدام:\n`!add @user 10`"
      );
    }

    const total =
      addPoints(
        user.id,
        amount
      );

    const member =
      await message.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (member) {
      await checkPromotion(member);
    }

    return message.reply(
      `✅ تمت إضافة **${amount} نقطة** إلى ${user}.\n` +
      `⭐ الرصيد: **${getPoints(user.id)}**`
    );
  }

  // ====================================================
  // REMOVE
  // ====================================================

  if (
    content.startsWith("!- ")
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ الإدارة فقط."
      );
    }

    const args =
      content.split(/\s+/);

    const user =
      message.mentions.users.first();

    const amount =
      Number(args[2]);

    if (
      !user ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return message.reply(
        "❌ الاستخدام:\n`!- @user 10`"
      );
    }

    const total =
      addPoints(
        user.id,
        -amount
      );

    return message.reply(
      `✅ تم خصم **${amount} نقطة** من ${user}.\n` +
      `⭐ الرصيد: **${total}**`
    );
  }

  // ====================================================
  // SALARY
  // ====================================================

  if (
    content.toLowerCase().startsWith("!salary")
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ الإدارة فقط تستطيع إعطاء الراتب."
      );
    }

    const user =
      message.mentions.users.first();

    if (!user) {
      return message.reply(
        "❌ الاستخدام:\n`!salary @user`"
      );
    }

    const member =
      await message.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member) {
      return message.reply(
        "❌ لم أجد العضو."
      );
    }

    const rank =
      getRank(member);

    if (!rank) {
      return message.reply(
        "❌ هذا العضو ليس لديه رتبة مطور."
      );
    }

    const salaries =
      read(FILES.salaries);

    const now = Date.now();

    salaries[user.id] = {
      amount: rank.salary,
      rank: rank.name,
      givenBy: message.author.id,
      date: now
    };

    save(
      FILES.salaries,
      salaries
    );

    const total =
      addPoints(
        user.id,
        rank.salary
      );

    await checkPromotion(member);

    await sendLog(
      message.guild,
      `💰 **تم إعطاء راتب**\n\n` +
      `👤 المطور: ${user}\n` +
      `🏅 الرتبة: **${rank.name}**\n` +
      `💵 الراتب: **${rank.salary} نقطة**\n` +
      `👑 بواسطة: ${message.author}`
    );

    return message.reply(
      `💰 تم إعطاء راتب ${user}\n\n` +
      `🏅 الرتبة: **${rank.name}**\n` +
      `💵 الراتب: **${rank.salary} نقطة**\n` +
      `⭐ رصيده الآن: **${getPoints(user.id)}**`
    );
  }

  // ====================================================
  // TICKET PANEL
  // ====================================================

  if (
    content.toLowerCase() ===
    "!ticket-panel"
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ الإدارة فقط."
      );
    }

    const embed =
      new EmbedBuilder()
        .setTitle("🎫 مركز التذاكر")
        .setDescription(
          "تحتاج إلى مساعدة؟\n\n" +
          "اضغط على الزر لإنشاء تذكرة خاصة مع فريق المطورين.\n\n" +
          "🎯 أول مطور يستلم التذكرة يحصل على **+5 نقاط**.\n" +
          "🚫 محاولة استلام تذكرة مستلمة تخصم **50 نقطة**."
        )
        .setFooter({
          text: CONFIG.SERVER_NAME
        });

    const row =
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("create_ticket")
            .setLabel("فتح تذكرة")
            .setEmoji("🎫")
            .setStyle(ButtonStyle.Success)
        );

    await message.channel.send({
      embeds: [embed],
      components: [row]
    });

    return message.reply({
      content: "✅ تم إنشاء لوحة التذاكر.",
      allowedMentions: {
        repliedUser: false
      }
    });
  }

  // ====================================================
  // APPLICATION PANEL
  // ====================================================

  if (
    content.toLowerCase() ===
    "!application-panel"
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ الإدارة فقط."
      );
    }

    const embed =
      new EmbedBuilder()
        .setTitle("📝 طلب الانضمام لفريق المطورين")
        .setDescription(
          "تريد الانضمام إلى فريق المطورين؟\n\n" +
          "اضغط على الزر بالأسفل واملأ الطلب."
        );

    const row =
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              "developer_application"
            )
            .setLabel("تقديم طلب")
            .setEmoji("📝")
            .setStyle(ButtonStyle.Primary)
        );

    await message.channel.send({
      embeds: [embed],
      components: [row]
    });

    return message.reply({
      content:
        "✅ تم إنشاء لوحة طلبات المطورين.",
      allowedMentions: {
        repliedUser: false
      }
    });
  }

  // ====================================================
  // CLEAR
  // ====================================================

  if (
    content.toLowerCase().startsWith("!clear")
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ الإدارة فقط."
      );
    }

    const args =
      content.split(/\s+/);

    const amount =
      Number(args[1]);

    if (
      !Number.isInteger(amount) ||
      amount < 1 ||
      amount > 100
    ) {
      return message.reply(
        "❌ اكتب رقم من 1 إلى 100."
      );
    }

    await message.channel.bulkDelete(
      amount + 1,
      true
    );

    return message.channel.send(
      `🧹 تم حذف **${amount} رسالة**.`
    );
  }
});

// ======================================================
//                    WELCOME
// ======================================================

client.on("guildMemberAdd", async member => {

  const channel =
    member.guild.channels.cache.find(
      c => c.name === CONFIG.WELCOME_CHANNEL
    );

  if (!channel) return;

  const embed =
    new EmbedBuilder()
      .setTitle("👋 عضو جديد!")
      .setDescription(
        `أهلًا وسهلًا ${member} في **${CONFIG.SERVER_NAME}** 🎉\n\n` +
        `نتمنى لك وقتًا ممتعًا معنا!`
      )
      .setThumbnail(
        member.user.displayAvatarURL()
      )
      .setTimestamp();

  await channel.send({
    embeds: [embed]
  }).catch(() => {});
});

// ======================================================
//                    ERROR HANDLING
// ======================================================

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "Unhandled Rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "Uncaught Exception:",
      error
    );
  }
);

// ======================================================
//                    LOGIN
// ======================================================

if (!process.env.TOKEN) {

  console.log(
    "❌ TOKEN غير موجود!"
  );

  console.log(
    "اذهب إلى Railway > Variables وأضف:"
  );

  console.log(
    "TOKEN = Bot Token"
  );

  process.exit(1);
}

client.login(
  process.env.TOKEN
);
