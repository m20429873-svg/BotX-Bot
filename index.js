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
  SERVER_NAME: "⌁ 𝑩𝑶𝑻𝑿 ⌁",

  TICKET_CHANNEL: "🎫・『 التذاكر 』",
  LOG_CHANNEL: "📋・『 اللوج 』",
  WELCOME_CHANNEL: "👋・『 الترحيب 』",
  APPLICATION_CHANNEL: "📝・『 طلبات المطورين 』",

  INVITE: "https://discord.gg/ZwfyExfZq",

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

  CLAIM_REWARD: 5,
  WRONG_CLAIM_PENALTY: 50
};

// ======================================================
//                    FILES
// ======================================================

const POINTS_FILE = "./points.json";
const TICKETS_FILE = "./tickets.json";
const SALARIES_FILE = "./salaries.json";

function loadJSON(file, fallback = {}) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let points = loadJSON(POINTS_FILE);
let tickets = loadJSON(TICKETS_FILE);
let salaries = loadJSON(SALARIES_FILE);

// ======================================================
//                    CLIENT
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
//                    FUNCTIONS
// ======================================================

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function getDeveloperRole(member) {
  if (!member) return null;

  return CONFIG.RANKS
    .map(rank =>
      member.guild.roles.cache.find(role => role.name === rank.name)
    )
    .find(role => role && member.roles.cache.has(role.id));
}

function isDeveloper(member) {
  return !!getDeveloperRole(member) || isAdmin(member);
}

function getRank(userId, guild) {
  const member = guild.members.cache.get(userId);

  if (!member) return null;

  const role = getDeveloperRole(member);

  if (!role) return null;

  return CONFIG.RANKS.find(rank => rank.name === role.name) || null;
}

function getPoints(userId) {
  return Number(points[userId] || 0);
}

function setPoints(userId, amount) {
  points[userId] = Math.max(0, Number(amount));
  saveJSON(POINTS_FILE, points);
}

function addPoints(userId, amount) {
  setPoints(userId, getPoints(userId) + Number(amount));
}

async function createDeveloperRoles(guild) {
  for (const rank of CONFIG.RANKS) {
    const exists = guild.roles.cache.find(
      role => role.name === rank.name
    );

    if (!exists) {
      await guild.roles.create({
        name: rank.name,
        reason: "BOTX Developer Roles"
      });
    }
  }
}

async function checkPromotion(member) {
  if (!member || isAdmin(member)) return;

  const currentRole = getDeveloperRole(member);
  if (!currentRole) return;

  const currentIndex = CONFIG.RANKS.findIndex(
    rank => rank.name === currentRole.name
  );

  if (currentIndex === -1) return;

  const userPoints = getPoints(member.id);

  for (
    let i = CONFIG.RANKS.length - 1;
    i > currentIndex;
    i--
  ) {
    if (userPoints >= CONFIG.RANKS[i].required) {
      const newRole = member.guild.roles.cache.find(
        role => role.name === CONFIG.RANKS[i].name
      );

      if (!newRole) return;

      await member.roles.remove(currentRole).catch(() => {});
      await member.roles.add(newRole).catch(() => {});

      setPoints(member.id, 0);

      const logChannel = member.guild.channels.cache.find(
        channel => channel.name === CONFIG.LOG_CHANNEL
      );

      if (logChannel) {
        logChannel.send(
          `🎉 <@${member.id}> تمت ترقيته إلى **${CONFIG.RANKS[i].name}**`
        );
      }

      return;
    }
  }
}

function alreadyClaimedThisMonth(userId) {
  const now = new Date();

  const currentMonth =
    `${now.getFullYear()}-${now.getMonth() + 1}`;

  return salaries[userId] === currentMonth;
}

function markSalaryClaimed(userId) {
  const now = new Date();

  salaries[userId] =
    `${now.getFullYear()}-${now.getMonth() + 1}`;

  saveJSON(SALARIES_FILE, salaries);
}

// ======================================================
//                    READY
// ======================================================

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  for (const guild of client.guilds.cache.values()) {
    await createDeveloperRoles(guild).catch(console.error);
  }

  client.user.setActivity("BOTX | !help");
});

// ======================================================
//                    WELCOME
// ======================================================

client.on("guildMemberAdd", async member => {
  const channel = member.guild.channels.cache.find(
    channel => channel.name === CONFIG.WELCOME_CHANNEL
  );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("👋 أهلاً وسهلاً!")
    .setDescription(
      `مرحباً بك ${member} في **${CONFIG.SERVER_NAME}**\n\n` +
      `نتمنى لك وقتاً ممتعاً معنا ❤️`
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setColor("Green");

  channel.send({ embeds: [embed] }).catch(() => {});
});

// ======================================================
//                    MESSAGES
// ======================================================

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const content = message.content.trim();

  // ====================================================
  // AUTO REPLIES
  // ====================================================

  if (content.includes("بوت")) {
    return message.reply("انت الي بوت 😂");
  }

  if (content.includes("😂")) {
    return message.reply("😂😂😂");
  }

  if (
    content === "احا" ||
    content === "اح" ||
    content.startsWith("احا ")
  ) {
    return message.reply("اهدى يا عم 😂");
  }

  // ====================================================
  // COMMAND ACCESS
  // غير المطور لا يستطيع استخدام أي أمر
  // ====================================================

  if (content.startsWith("!") && !isDeveloper(message.member)) {
    return message.reply(
      "❌ لا تملك رتبة مطور.\n🎫 المسموح لك فقط هو فتح تذكرة."
    );
  }

  // ====================================================
  // !PING
  // ====================================================

  if (content === "!ping") {
    return message.reply(`🏓 Pong! **${client.ws.ping}ms**`);
  }

  // ====================================================
  // !HELP
  // ====================================================

  if (content === "!help") {
    const embed = new EmbedBuilder()
      .setTitle("🤖 BOTX | الأوامر")
      .setDescription(
        [
          "`!ping` - فحص البوت",
          "`!help` - الأوامر",
          "`!نقاطي` - نقاطك ورتبتك",
          "`!top` - المتصدرين",
          "`!add @user amount` - إضافة نقاط",
          "`!- @user amount` - خصم نقاط",
          "`!rank @user 1-4` - إعطاء رتبة",
          "`!salary` - استلام الراتب",
          "`!salary @user` - عرض راتب",
          "`!ticket-panel` - لوحة التذاكر",
          "`!application-panel` - لوحة الطلبات",
          "`!clear amount` - حذف رسائل"
        ].join("\n")
      )
      .setColor("Blue");

    return message.reply({ embeds: [embed] });
  }

  // ====================================================
  // !نقاطي
  // ====================================================

  if (content === "!نقاطي") {
    const rank = getRank(message.author.id, message.guild);

    if (!rank) {
      return message.reply("❌ لا توجد لديك رتبة مطور.");
    }

    const userPoints = getPoints(message.author.id);

    return message.reply(
      `📊 نقاطك: **${userPoints}**\n🏅 رتبتك: **${rank.name}**`
    );
  }

  // ====================================================
  // !TOP
  // ====================================================

  if (content === "!top") {
    const sorted = Object.entries(points)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (!sorted.length) {
      return message.reply("❌ لا توجد نقاط حتى الآن.");
    }

    let text = "";

    sorted.forEach(([id, value], index) => {
      text += `**${index + 1}.** <@${id}> — **${value}** نقطة\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle("🏆 TOP Developers")
      .setDescription(text)
      .setColor("Gold");

    return message.reply({ embeds: [embed] });
  }

  // ====================================================
  // !ADD
  // ====================================================

  if (content.startsWith("!add ")) {
    if (!isAdmin(message.member)) {
      return message.reply("❌ هذا الأمر للإدارة فقط.");
    }

    const user = message.mentions.members.first();
    const args = content.split(/\s+/);
    const amount = Number(args[2]);

    if (!user || !amount || amount <= 0) {
      return message.reply(
        "❌ الاستخدام الصحيح:\n`!add @user 100`"
      );
    }

    addPoints(user.id, amount);
    await checkPromotion(user);

    return message.reply(
      `✅ تمت إضافة **${amount}** نقطة إلى ${user}.`
    );
  }

  // ====================================================
  // !-
  // ====================================================

  if (content.startsWith("!- ")) {
    if (!isAdmin(message.member)) {
      return message.reply("❌ هذا الأمر للإدارة فقط.");
    }

    const user = message.mentions.members.first();
    const args = content.split(/\s+/);
    const amount = Number(args[2]);

    if (!user || !amount || amount <= 0) {
      return message.reply(
        "❌ الاستخدام الصحيح:\n`!- @user 100`"
      );
    }

    addPoints(user.id, -amount);

    return message.reply(
      `✅ تم خصم **${amount}** نقطة من ${user}.`
    );
  }

  // ====================================================
  // !RANK
  // ====================================================

  if (content.startsWith("!rank ")) {
    if (!isAdmin(message.member)) {
      return message.reply("❌ هذا الأمر للإدارة فقط.");
    }

    const user = message.mentions.members.first();
    const args = content.split(/\s+/);
    const rankNumber = Number(args[2]);

    if (
      !user ||
      !rankNumber ||
      rankNumber < 1 ||
      rankNumber > CONFIG.RANKS.length
    ) {
      return message.reply(
        "❌ الاستخدام الصحيح:\n`!rank @user 1`"
      );
    }

    const rank = CONFIG.RANKS[rankNumber - 1];

    const newRole = message.guild.roles.cache.find(
      role => role.name === rank.name
    );

    if (!newRole) {
      return message.reply("❌ الرتبة غير موجودة.");
    }

    const oldRole = getDeveloperRole(user);

    if (oldRole) {
      await user.roles.remove(oldRole).catch(() => {});
    }

    await user.roles.add(newRole).catch(() => {});

    setPoints(user.id, 0);

    return message.reply(
      `✅ تم إعطاء ${user} رتبة **${rank.name}**.`
    );
  }

  // ====================================================
  // !SALARY
  // ====================================================

  if (content === "!salary") {
    const rank = getRank(message.author.id, message.guild);

    if (!rank) {
      return message.reply("❌ لا توجد لديك رتبة مطور.");
    }

    if (alreadyClaimedThisMonth(message.author.id)) {
      return message.reply(
        "❌ لقد استلمت راتبك هذا الشهر بالفعل."
      );
    }

    addPoints(message.author.id, rank.salary);
    markSalaryClaimed(message.author.id);

    await checkPromotion(message.member);

    return message.reply(
      `💰 تم استلام راتبك: **${rank.salary}** نقطة.`
    );
  }

  // ====================================================
  // !SALARY @USER
  // ====================================================

  if (content.startsWith("!salary ")) {
    const user = message.mentions.members.first();

    if (!user) {
      return message.reply(
        "❌ الاستخدام الصحيح:\n`!salary @user`"
      );
    }

    const rank = getRank(user.id, message.guild);

    if (!rank) {
      return message.reply("❌ هذا الشخص لا يملك رتبة مطور.");
    }

    return message.reply(
      `💰 راتب ${user}: **${rank.salary}** نقطة شهرياً.`
    );
  }

  // ====================================================
  // !TICKET-PANEL
  // ====================================================

  if (content === "!ticket-panel") {
    if (!isAdmin(message.member)) {
      return message.reply("❌ هذا الأمر للإدارة فقط.");
    }

    const button = new ButtonBuilder()
      .setCustomId("create_ticket")
      .setLabel("🎫 فتح تذكرة")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    const embed = new EmbedBuilder()
      .setTitle("🎫 نظام التذاكر")
      .setDescription(
        "اضغط على الزر بالأسفل لفتح تذكرة.\n\n" +
        "⚠️ صاحب التذكرة لا يستطيع استلامها أو إغلاقها."
      )
      .setColor("Blue");

    return message.channel.send({
      embeds: [embed],
      components: [row]
    });
  }

  // ====================================================
  // !APPLICATION-PANEL
  // ====================================================

  if (content === "!application-panel") {
    if (!isAdmin(message.member)) {
      return message.reply("❌ هذا الأمر للإدارة فقط.");
    }

    const button = new ButtonBuilder()
      .setCustomId("developer_application")
      .setLabel("📝 تقديم طلب مطور")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    const embed = new EmbedBuilder()
      .setTitle("📝 طلبات المطورين")
      .setDescription(
        "اضغط على الزر لتقديم طلب الانضمام إلى فريق المطورين."
      )
      .setColor("Green");

    return message.channel.send({
      embeds: [embed],
      components: [row]
    });
  }

  // ====================================================
  // !CLEAR
  // ====================================================

  if (content.startsWith("!clear ")) {
    if (!isAdmin(message.member)) {
      return message.reply("❌ هذا الأمر للإدارة فقط.");
    }

    const amount = Number(content.split(/\s+/)[1]);

    if (
      !amount ||
      amount < 1 ||
      amount > 100
    ) {
      return message.reply(
        "❌ اكتب رقم من 1 إلى 100."
      );
    }

    await message.channel.bulkDelete(amount, true);

    const msg = await message.channel.send(
      `🧹 تم حذف **${amount}** رسالة.`
    );

    setTimeout(() => {
      msg.delete().catch(() => {});
    }, 3000);
  }
});

// ======================================================
//                    BUTTONS
// ======================================================

client.on("interactionCreate", async interaction => {
  if (!interaction.guild) return;

  // ====================================================
  // OPEN TICKET
  // ====================================================

  if (interaction.isButton() && interaction.customId === "create_ticket") {
    const guild = interaction.guild;
    const user = interaction.user;

    const existing = Object.values(tickets).find(
      ticket =>
        ticket.userId === user.id &&
        ticket.guildId === guild.id &&
        ticket.closed === false
    );

    if (existing) {
      return interaction.reply({
        content: `❌ لديك تذكرة مفتوحة بالفعل: <#${existing.channelId}>`,
        ephemeral: true
      });
    }

    const channel = await guild.channels.create({
      name: `ticket-${user.username}`.toLowerCase().slice(0, 90),
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [
            PermissionsBitField.Flags.ViewChannel
          ]
        },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }
      ]
    });

    // إعطاء المطورين صلاحية رؤية التذكرة
    for (const rank of CONFIG.RANKS) {
      const role = guild.roles.cache.find(
        r => r.name === rank.name
      );

      if (role) {
        await channel.permissionOverwrites.create(role, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        }).catch(() => {});
      }
    }

    tickets[channel.id] = {
      channelId: channel.id,
      userId: user.id,
      guildId: guild.id,
      claimedBy: null,
      closed: false
    };

    saveJSON(TICKETS_FILE, tickets);

    const claimButton = new ButtonBuilder()
      .setCustomId("claim_ticket")
      .setLabel("🎟️ استلام التذكرة")
      .setStyle(ButtonStyle.Success);

    const closeButton = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("🔒 إغلاق التذكرة")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(
      claimButton,
      closeButton
    );

    const embed = new EmbedBuilder()
      .setTitle("🎫 تذكرة جديدة")
      .setDescription(
        `مرحباً ${user} 👋\n\n` +
        "انتظر أحد المطورين لمساعدتك.\n\n" +
        "⚠️ صاحب التذكرة لا يستطيع استلامها أو إغلاقها."
      )
      .setColor("Blue");

    await channel.send({
      content: `${user}`,
      embeds: [embed],
      components: [row]
    });

    return interaction.reply({
      content: `✅ تم فتح تذكرتك: ${channel}`,
      ephemeral: true
    });
  }

  // ====================================================
  // CLAIM TICKET
  // ====================================================

  if (interaction.isButton() && interaction.customId === "claim_ticket") {
    const ticket = tickets[interaction.channel.id];

    if (!ticket) {
      return interaction.reply({
        content: "❌ هذه التذكرة غير مسجلة.",
        ephemeral: true
      });
    }

    // صاحب التذكرة ممنوع من الاستلام
    if (ticket.userId === interaction.user.id) {
      return interaction.reply({
        content: "❌ لا يمكنك استلام تذكرتك الخاصة.",
        ephemeral: true
      });
    }

    if (!isDeveloper(interaction.member)) {
      return interaction.reply({
        content: "❌ تحتاج إلى رتبة مطور لاستلام التذكرة.",
        ephemeral: true
      });
    }

    if (ticket.claimedBy) {
      return interaction.reply({
        content: `❌ التذكرة مستلمة بالفعل بواسطة <@${ticket.claimedBy}>.`,
        ephemeral: true
      });
    }

    ticket.claimedBy = interaction.user.id;
    saveJSON(TICKETS_FILE, tickets);

    addPoints(
      interaction.user.id,
      CONFIG.CLAIM_REWARD
    );

    await checkPromotion(interaction.member);

    return interaction.reply(
      `✅ تم استلام التذكرة بواسطة ${interaction.user}.\n🎁 حصلت على **${CONFIG.CLAIM_REWARD}** نقاط.`
    );
  }

  // ====================================================
  // CLOSE TICKET
  // ====================================================

  if (interaction.isButton() && interaction.customId === "close_ticket") {
    const ticket = tickets[interaction.channel.id];

    if (!ticket) {
      return interaction.reply({
        content: "❌ هذه التذكرة غير مسجلة.",
        ephemeral: true
      });
    }

    // صاحب التذكرة ممنوع من الإغلاق
    if (ticket.userId === interaction.user.id) {
      return interaction.reply({
        content: "❌ لا يمكنك إغلاق تذكرتك الخاصة.",
        ephemeral: true
      });
    }

    if (!isDeveloper(interaction.member)) {
      return interaction.reply({
        content: "❌ تحتاج إلى رتبة مطور لإغلاق التذكرة.",
        ephemeral: true
      });
    }

    ticket.closed = true;
    saveJSON(TICKETS_FILE, tickets);

    await interaction.reply("🔒 سيتم إغلاق التذكرة خلال 3 ثوانٍ.");

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
      delete tickets[interaction.channel.id];
      saveJSON(TICKETS_FILE, tickets);
    }, 3000);
  }

  // ====================================================
  // DEVELOPER APPLICATION
  // ====================================================

  if (
    interaction.isButton() &&
    interaction.customId === "developer_application"
  ) {
    const modal = new ModalBuilder()
      .setCustomId("developer_application_modal")
      .setTitle("📝 طلب مطور");

    const nameInput = new TextInputBuilder()
      .setCustomId("name")
      .setLabel("اسمك")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const ageInput = new TextInputBuilder()
      .setCustomId("age")
      .setLabel("عمرك")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const experienceInput = new TextInputBuilder()
      .setCustomId("experience")
      .setLabel("خبرتك بالبرمجة")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const reasonInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("لماذا تريد أن تصبح مطوراً؟")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(ageInput),
      new ActionRowBuilder().addComponents(experienceInput),
      new ActionRowBuilder().addComponents(reasonInput)
    );

    return interaction.showModal(modal);
  }

  // ====================================================
  // APPLICATION MODAL
  // ====================================================

  if (
    interaction.isModalSubmit() &&
    interaction.customId === "developer_application_modal"
  ) {
    const name = interaction.fields.getTextInputValue("name");
    const age = interaction.fields.getTextInputValue("age");
    const experience =
      interaction.fields.getTextInputValue("experience");
    const reason =
      interaction.fields.getTextInputValue("reason");

    const channel = interaction.guild.channels.cache.find(
      channel => channel.name === CONFIG.APPLICATION_CHANNEL
    );

    if (!channel) {
      return interaction.reply({
        content: "❌ لم يتم العثور على قناة طلبات المطورين.",
        ephemeral: true
      });
    }

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
      .setColor("Blue")
      .setTimestamp();

    await channel.send({
      embeds: [embed]
    });

    return interaction.reply({
      content: "✅ تم إرسال طلبك بنجاح.",
      ephemeral: true
    });
  }
});

// ======================================================
//                    ERROR HANDLING
// ======================================================

client.on("error", console.error);

process.on("unhandledRejection", console.error);

// ======================================================
//                    LOGIN
// ======================================================

const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error(
    "❌ TOKEN أو DISCORD_TOKEN غير موجود في Railway Variables."
  );
  process.exit(1);
}

client.login(TOKEN);
