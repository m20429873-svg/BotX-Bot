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

  SERVER_NAME: "⌁ 𝑩𝒐𝒕𝑿 ⌁ ✔",

  TICKET_CATEGORY: "🎫・『 التذاكر 』",

  LOG_CHANNEL: "📋・『 اللوج 』",

  WELCOME_CHANNEL: "👋・『 الترحيب 』",

  APPLICATION_CHANNEL: "📝・『 طلبات المطورين 』",

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

  WRONG_CLAIM_PENALTY: 50,

  DISCORD_INVITE: "https://discord.gg/ZwfyExfZq"

};

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
//                    JSON FILES
// ======================================================

const POINTS_FILE = "./points.json";
const TICKETS_FILE = "./tickets.json";
const SALARIES_FILE = "./salaries.json";

// ======================================================
//                    FILE HELPERS
// ======================================================

function readJSON(file) {

  if (!fs.existsSync(file)) {

    fs.writeFileSync(
      file,
      JSON.stringify({}, null, 2)
    );

  }

  try {

    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );

  } catch {

    return {};

  }

}

function saveJSON(file, data) {

  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  );

}

// ======================================================
//                    DATA
// ======================================================

let points = readJSON(POINTS_FILE);

let tickets = readJSON(TICKETS_FILE);

let salaries = readJSON(SALARIES_FILE);

// ======================================================
//                    PERMISSIONS
// ======================================================

function isAdmin(member) {

  if (!member) return false;

  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );

}

// ======================================================
//              GET DEVELOPER ROLE
// ======================================================

function getDeveloperRole(member) {

  if (!member || !member.roles) {
    return null;
  }

  for (
    let i = CONFIG.RANKS.length - 1;
    i >= 0;
    i--
  ) {

    const role =
      member.guild.roles.cache.find(
        r =>
          r.name ===
          CONFIG.RANKS[i].name
      );

    if (
      role &&
      member.roles.cache.has(role.id)
    ) {

      return {

        role,

        index: i,

        rank: CONFIG.RANKS[i]

      };

    }

  }

  return null;

}

// ======================================================
//                    IS DEVELOPER
// ======================================================

function isDeveloper(member) {

  if (!member) return false;

  if (isAdmin(member)) return true;

  return !!getDeveloperRole(member);

}

// ======================================================
//                    GET RANK
// ======================================================

function getRank(member) {

  return getDeveloperRole(member);

}

// ======================================================
//                    POINTS
// ======================================================

function getPoints(userId) {

  return Number(points[userId]) || 0;

}

function setPoints(userId, amount) {

  points[userId] =
    Math.max(
      0,
      Number(amount) || 0
    );

  saveJSON(
    POINTS_FILE,
    points
  );

}

function addPoints(userId, amount) {

  const current =
    getPoints(userId);

  setPoints(
    userId,
    current + Number(amount)
  );

}

// ======================================================
//                       LOG
// ======================================================

async function sendLog(
  guild,
  title,
  description
) {

  try {

    const channel =
      guild.channels.cache.find(
        c =>
          c.name ===
          CONFIG.LOG_CHANNEL
      );

    if (!channel) return;

    const embed =
      new EmbedBuilder()

        .setColor("Blue")

        .setTitle(title)

        .setDescription(description)

        .setTimestamp();

    await channel.send({

      embeds: [embed]

    });

  } catch (error) {

    console.error(
      "Log Error:",
      error
    );

  }

}

// ======================================================
//              CREATE DEVELOPER ROLE
// ======================================================

async function getOrCreateRankRole(
  guild,
  rankIndex
) {

  const rank =
    CONFIG.RANKS[rankIndex];

  if (!rank) return null;

  let role =
    guild.roles.cache.find(
      r =>
        r.name ===
        rank.name
    );

  if (!role) {

    role =
      await guild.roles.create({

        name:
          rank.name,

        color:
          rankIndex === 0
            ? "Green"
            : rankIndex === 1
            ? "Blue"
            : rankIndex === 2
            ? "Orange"
            : "Gold",

        reason:
          "BotX Developer Rank"

      });

  }

  return role;

}

// ======================================================
//                 PROMOTION SYSTEM
// ======================================================

async function checkPromotion(member) {

  if (!member) return;

  if (!isDeveloper(member)) return;

  const currentPoints =
    getPoints(member.id);

  const currentRole =
    getDeveloperRole(member);

  if (!currentRole) return;

  let newRankIndex =
    currentRole.index;

  for (
    let i = 0;
    i < CONFIG.RANKS.length;
    i++
  ) {

    if (
      currentPoints >=
      CONFIG.RANKS[i].required
    ) {

      newRankIndex = i;

    }

  }

  if (
    newRankIndex <=
    currentRole.index
  ) {

    return;

  }

  const oldRole =
    currentRole.role;

  const newRole =
    await getOrCreateRankRole(
      member.guild,
      newRankIndex
    );

  if (!newRole) return;

  try {

    await member.roles.remove(
      oldRole
    );

  } catch {}

  try {

    await member.roles.add(
      newRole
    );

  } catch {}

  setPoints(
    member.id,
    0
  );

  await sendLog(

    member.guild,

    "🎉 ترقية مطور",

    `${member}\n` +
    `من: ${oldRole.name}\n` +
    `إلى: ${newRole.name}`

  );

  try {

    await member.send(

      `🎉 مبروك!\n\n` +
      `تمت ترقيتك في سيرفر **${member.guild.name}** إلى:\n` +
      `**${newRole.name}**\n\n` +
      `تم تصفير نقاطك بعد الترقية.`

    );

  } catch {}

}

// ======================================================
//             REMOVE NON-DEVELOPER POINTS
// ======================================================

async function removeNonDeveloperPoints(member) {

  if (!member) return;

  if (!isDeveloper(member)) {

    if (
      getPoints(member.id) > 0
    ) {

      setPoints(
        member.id,
        0
      );

    }

  }

}

// ======================================================
//                       READY
// ======================================================

client.once(
  "ready",
  async () => {

    console.log(
      `✅ ${client.user.tag} is online`
    );

    client.user.setPresence({

      activities: [

        {

          name:
            "⌁ 𝑩𝒐𝒕𝑿 ⌁ ✔",

          type: 3

        }

      ],

      status:
        "online"

    });

    for (
      const guild
      of client.guilds.cache.values()
    ) {

      try {

        const members =
          await guild.members.fetch();

        for (
          const member
          of members.values()
        ) {

          await removeNonDeveloperPoints(
            member
          );

        }

      } catch {}

    }

  }
);

// ======================================================
//                 INTERACTIONS
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {

    // ==================================================
    //                    BUTTONS
    // ==================================================

    if (interaction.isButton()) {

      // ================================================
      //                 CREATE TICKET
      // ================================================

      if (
        interaction.customId ===
        "create_ticket"
      ) {

        const guild =
          interaction.guild;

        const existingTicket =
          Object.values(tickets).find(

            t =>

              t.userId ===
              interaction.user.id &&

              t.guildId ===
              guild.id &&

              !t.closed

          );

        if (existingTicket) {

          return interaction.reply({

            content:
              `❌ لديك تذكرة مفتوحة بالفعل: <#${existingTicket.channelId}>`,

            ephemeral:
              true

          });

        }

        let category =
          guild.channels.cache.find(

            c =>

              c.name ===
              CONFIG.TICKET_CATEGORY &&

              c.type ===
              ChannelType.GuildCategory

          );

        if (!category) {

          category =
            await guild.channels.create({

              name:
                CONFIG.TICKET_CATEGORY,

              type:
                ChannelType.GuildCategory

            });

        }

        const channel =
          await guild.channels.create({

            name:
              `ticket-${interaction.user.username}`,

            type:
              ChannelType.GuildText,

            parent:
              category.id,

            permissionOverwrites: [

              {

                id:
                  guild.roles.everyone.id,

                deny: [

                  PermissionsBitField.Flags.ViewChannel

                ]

              },

              {

                id:
                  interaction.user.id,

                allow: [

                  PermissionsBitField.Flags.ViewChannel,

                  PermissionsBitField.Flags.SendMessages,

                  PermissionsBitField.Flags.ReadMessageHistory

                ]

              }

            ]

          });

        tickets[channel.id] = {

          guildId:
            guild.id,

          channelId:
            channel.id,

          userId:
            interaction.user.id,

          claimedBy:
            null,

          closed:
            false

        };

        saveJSON(
          TICKETS_FILE,
          tickets
        );

        const embed =
          new EmbedBuilder()

            .setColor("Blue")

            .setTitle(
              "🎫 تذكرة دعم"
            )

            .setDescription(

              `أهلًا ${interaction.user} 👋\n\n` +

              `انتظر أحد المطورين لمساعدتك.\n\n` +

              `**صاحب التذكرة:** ${interaction.user}\n\n` +

              `📌 لا يمكنك استلام أو إغلاق تذكرتك.`

            )

            .setTimestamp();

        const buttons =
          new ActionRowBuilder()

            .addComponents(

              new ButtonBuilder()

                .setCustomId(
                  "claim_ticket"
                )

                .setLabel(
                  "استلام التذكرة"
                )

                .setEmoji(
                  "📌"
                )

                .setStyle(
                  ButtonStyle.Primary
                ),

              new ButtonBuilder()

                .setCustomId(
                  "close_ticket"
                )

                .setLabel(
                  "إغلاق"
                )

                .setEmoji(
                  "🔒"
                )

                .setStyle(
                  ButtonStyle.Danger
                )

            );

        await channel.send({

          content:
            `${interaction.user}`,

          embeds:
            [embed],

          components:
            [buttons]

        });

        await interaction.reply({

          content:
            `✅ تم إنشاء تذكرتك: ${channel}`,

          ephemeral:
            true

        });

        await sendLog(

          guild,

          "🎫 تذكرة جديدة",

          `${interaction.user} فتح تذكرة ${channel}`

        );

        return;

      }

      // ================================================
      //                 CLAIM TICKET
      // ================================================

      if (
        interaction.customId ===
        "claim_ticket"
      ) {

        const ticket =
          tickets[
            interaction.channel.id
          ];

        if (!ticket) {

          return interaction.reply({

            content:
              "❌ هذه ليست تذكرة مسجلة.",

            ephemeral:
              true

          });

        }

        if (ticket.closed) {

          return interaction.reply({

            content:
              "❌ هذه التذكرة مغلقة.",

            ephemeral:
              true

          });

        }

        // صاحب التذكرة لا يستطيع Claim
        if (
          ticket.userId ===
          interaction.user.id
        ) {

          return interaction.reply({

            content:
              "❌ لا يمكنك استلام تذكرتك.",

            ephemeral:
              true

          });

        }

        if (
          !isDeveloper(
            interaction.member
          )
        ) {

          return interaction.reply({

            content:
              "❌ استلام التذاكر للمطورين فقط.",

            ephemeral:
              true

          });

        }

        if (ticket.claimedBy) {

          if (
            ticket.claimedBy ===
            interaction.user.id
          ) {

            return interaction.reply({

              content:
                "⚠️ أنت مستلم هذه التذكرة بالفعل.",

              ephemeral:
                true

            });

          }

          addPoints(

            interaction.user.id,

            -CONFIG.WRONG_CLAIM_PENALTY

          );

          await sendLog(

            interaction.guild,

            "⚠️ محاولة Claim خاطئة",

            `${interaction.user} حاول استلام تذكرة مستلمة بالفعل.\n` +
            `تم خصم ${CONFIG.WRONG_CLAIM_PENALTY} نقطة.`

          );

          return interaction.reply({

            content:
              `❌ التذكرة مستلمة بالفعل.\n` +
              `تم خصم **${CONFIG.WRONG_CLAIM_PENALTY} نقطة** منك.`,

            ephemeral:
              true

          });

        }

        ticket.claimedBy =
          interaction.user.id;

        saveJSON(
          TICKETS_FILE,
          tickets
        );

        addPoints(

          interaction.user.id,

          CONFIG.CLAIM_REWARD

        );

        await checkPromotion(
          interaction.member
        );

        await interaction.reply({

          content:
            `✅ تم استلام التذكرة.\n` +
            `💰 حصلت على **${CONFIG.CLAIM_REWARD} نقاط**.`

        });

        await sendLog(

          interaction.guild,

          "📌 تم استلام تذكرة",

          `${interaction.user} استلم ${interaction.channel}\n` +
          `+${CONFIG.CLAIM_REWARD} نقاط`

        );

        return;

      }

      // ================================================
      //                 CLOSE TICKET
      // ================================================

      if (
        interaction.customId ===
        "close_ticket"
      ) {

        const ticket =
          tickets[
            interaction.channel.id
          ];

        if (!ticket) {

          return interaction.reply({

            content:
              "❌ هذه ليست تذكرة.",

            ephemeral:
              true

          });

        }

        // صاحب التذكرة لا يستطيع الإغلاق
        if (
          ticket.userId ===
          interaction.user.id
        ) {

          return interaction.reply({

            content:
              "❌ صاحب التذكرة لا يستطيع إغلاقها.",

            ephemeral:
              true

          });

        }

        if (
          !isDeveloper(
            interaction.member
          )
        ) {

          return interaction.reply({

            content:
              "❌ إغلاق التذاكر للمطورين فقط.",

            ephemeral:
              true

          });

        }

        ticket.closed =
          true;

        saveJSON(
          TICKETS_FILE,
          tickets
        );

        await sendLog(

          interaction.guild,

          "🔒 إغلاق تذكرة",

          `${interaction.user} أغلق ${interaction.channel}`

        );

        await interaction.reply(
          "🔒 سيتم إغلاق التذكرة خلال 5 ثوانٍ..."
        );

        setTimeout(
          async () => {

            try {

              await interaction.channel.delete();

            } catch {}

          },
          5000
        );

        return;

      }

      // ================================================
      //            DEVELOPER APPLICATION
      // ================================================

      if (
        interaction.customId ===
        "developer_application"
      ) {

        const modal =
          new ModalBuilder()

            .setCustomId(
              "developer_application_modal"
            )

            .setTitle(
              "📝 طلب مطور"
            );

        const nameInput =
          new TextInputBuilder()

            .setCustomId(
              "name"
            )

            .setLabel(
              "اسمك"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(
              true
            );

        const ageInput =
          new TextInputBuilder()

            .setCustomId(
              "age"
            )

            .setLabel(
              "عمرك"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(
              true
            );

        const experienceInput =
          new TextInputBuilder()

            .setCustomId(
              "experience"
            )

            .setLabel(
              "خبرتك البرمجية"
            )

            .setStyle(
              TextInputStyle.Paragraph
            )

            .setRequired(
              true
            );

        const reasonInput =
          new TextInputBuilder()

            .setCustomId(
              "reason"
            )

            .setLabel(
              "لماذا تريد أن تصبح مطورًا؟"
            )

            .setStyle(
              TextInputStyle.Paragraph
            )

            .setRequired(
              true
            );

        modal.addComponents(

          new ActionRowBuilder()
            .addComponents(
              nameInput
            ),

          new ActionRowBuilder()
            .addComponents(
              ageInput
            ),

          new ActionRowBuilder()
            .addComponents(
              experienceInput
            ),

          new ActionRowBuilder()
            .addComponents(
              reasonInput
            )

        );

        await interaction.showModal(
          modal
        );

        return;

      }

    }

    // ==================================================
    //                    MODAL
    // ==================================================

    if (
      interaction.isModalSubmit()
    ) {

      if (
        interaction.customId ===
        "developer_application_modal"
      ) {

        const name =
          interaction.fields.getTextInputValue(
            "name"
          );

        const age =
          interaction.fields.getTextInputValue(
            "age"
          );

        const experience =
          interaction.fields.getTextInputValue(
            "experience"
          );

        const reason =
          interaction.fields.getTextInputValue(
            "reason"
          );

        const channel =
          interaction.guild.channels.cache.find(
            c =>
              c.name ===
              CONFIG.APPLICATION_CHANNEL
          );

        if (!channel) {

          return interaction.reply({

            content:
              "❌ لم يتم العثور على روم طلبات المطورين.",

            ephemeral:
              true

          });

        }

        const embed =
          new EmbedBuilder()

            .setColor("Gold")

            .setTitle(
              "📝 طلب مطور جديد"
            )

            .addFields(

              {

                name:
                  "👤 الاسم",

                value:
                  name

              },

              {

                name:
                  "🎂 العمر",

                value:
                  age

              },

              {

                name:
                  "💻 الخبرة",

                value:
                  experience

              },

              {

                name:
                  "❓ السبب",

                value:
                  reason

              },

              {

                name:
                  "📌 صاحب الطلب",

                value:
                  `${interaction.user}`

              }

            )

            .setTimestamp();

        await channel.send({

          embeds:
            [embed]

        });

        await interaction.reply({

          content:
            "✅ تم إرسال طلبك بنجاح.",

          ephemeral:
            true

        });

        return;

      }

    }

  }
);

// ======================================================
//                 MESSAGE CREATE
// ======================================================

client.on(
  "messageCreate",
  async message => {

    if (
      message.author.bot
    ) return;

    if (
      !message.guild
    ) return;

    const content =
      message.content.trim();

    // ==================================================
    //      NON-DEVELOPER COMMAND PROTECTION
    // ==================================================

    // أي شخص ليس مطورًا ممنوع من جميع الأوامر
    // فتح التذكرة يتم من الزر وليس من أمر
    if (
      content.startsWith("!") &&
      !isDeveloper(
        message.member
      )
    ) {

      return message.reply(
        "❌ لا يمكنك استخدام أوامر البوت.\n🎫 يمكنك فتح تذكرة من زر التذاكر فقط."
      );

    }

    // ==================================================
    //                BOT JOKES
    // ==================================================

    if (
      /(^|\s)بوت(\s|$)/i.test(content)
    ) {

      return message.reply(
        "انت الي بوت 😂"
      );

    }

    if (
      content.includes("😂")
    ) {

      return message.reply(
        "بتتحك علي خبتك 😂"
      );

    }

    if (
      /^(احا|اح)$/i.test(content)
    ) {

      return message.reply(
        "روح العب بعيد 😂"
      );

    }

    // ==================================================
    //                    !PING
    // ==================================================

    if (
      content === "!ping"
    ) {

      return message.reply(
        `🏓 Pong!\n\`${client.ws.ping}ms\``
      );

    }

    // ==================================================
    //                    !HELP
    // ==================================================

    if (
      content === "!help"
    ) {

      const embed =
        new EmbedBuilder()

          .setColor("Blue")

          .setTitle(
            "🤖 أوامر BotX"
          )

          .setDescription(

            "### 👨‍💻 المطورين\n" +

            "`!نقاطي` — عرض نقاطك\n" +

            "`!top` — أفضل المطورين\n" +

            "`!salary` — استلام الراتب\n\n" +

            "### 🛡️ الإدارة\n" +

            "`!add @user amount`\n" +

            "`!- @user amount`\n" +

            "`!rank @user 1-4`\n" +

            "`!salary @user`\n" +

            "`!clear amount`\n" +

            "`!ticket-panel`\n" +

            "`!application-panel`"

          );

      return message.reply({

        embeds:
          [embed]

      });

    }

    // ==================================================
    //                    !نقاطي
    // ==================================================

    if (
      content === "!نقاطي"
    ) {

      if (
        !isDeveloper(
          message.member
        )
      ) {

        return message.reply(
          "❌ أنت لست ضمن نظام المطورين."
        );

      }

      const rank =
        getRank(
          message.member
        );

      if (!rank) {

        return message.reply(
          "❌ لم يتم العثور على رتبتك."
        );

      }

      return message.reply(

        `👤 ${message.author}\n\n` +

        `🏆 الرتبة: **${rank.rank.name}**\n` +

        `⭐ النقاط: **${getPoints(message.author.id)}**\n` +

        `💰 الراتب: **${rank.rank.salary}**`

      );

    }

    // ==================================================
    //                    !TOP
    // ==================================================

    if (
      content === "!top"
    ) {

      const developers = [];

      for (
        const guildMember
        of message.guild.members.cache.values()
      ) {

        if (
          guildMember.user.bot
        ) continue;

        if (
          !isDeveloper(
            guildMember
          )
        ) continue;

        developers.push({

          user:
            guildMember,

          points:
            getPoints(
              guildMember.id
            )

        });

      }

      developers.sort(
        (a, b) =>
          b.points - a.points
      );

      const top =
        developers.slice(
          0,
          5
        );

      if (!top.length) {

        return message.reply(
          "❌ لا يوجد مطورون لديهم نقاط حتى الآن."
        );

      }

      let text =
        "🏆 **أفضل المطورين**\n\n";

      top.forEach(
        (dev, index) => {

          text +=
            `${index + 1}. ${dev.user} — ⭐ ${dev.points}\n`;

        }
      );

      return message.reply(
        text
      );

    }

    // ==================================================
    //                    !ADD
    // ==================================================

    if (
      content.startsWith("!add ")
    ) {

      if (
        !isAdmin(
          message.member
        )
      ) {

        return message.reply(
          "❌ هذا الأمر للإدارة فقط."
        );

      }

      const user =
        message.mentions.users.first();

      const amount =
        Number(
          content.split(/\s+/)[2]
        );

      if (
        !user ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

        return message.reply(
          "❌ الاستخدام:\n`!add @user 100`"
        );

      }

      const member =
        message.guild.members.cache.get(
          user.id
        );

      if (
        !member ||
        !isDeveloper(member)
      ) {

        return message.reply(
          "❌ لا يمكن إعطاء نقاط لشخص ليس لديه رتبة مطور."
        );

      }

      addPoints(
        user.id,
        amount
      );

      await checkPromotion(
        member
      );

      return message.reply(
        `✅ تمت إضافة **${amount} نقطة** إلى ${user}.`
      );

    }

    // ==================================================
    //                    !-
    // ==================================================

    if (
      content.startsWith("!- ")
    ) {

      if (
        !isAdmin(
          message.member
        )
      ) {

        return message.reply(
          "❌ هذا الأمر للإدارة فقط."
        );

      }

      const user =
        message.mentions.users.first();

      const amount =
        Number(
          content.split(/\s+/)[2]
        );

      if (
        !user ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

        return message.reply(
          "❌ الاستخدام:\n`!- @user 100`"
        );

      }

      const member =
        message.guild.members.cache.get(
          user.id
        );

      if (
        !member ||
        !isDeveloper(member)
      ) {

        return message.reply(
          "❌ هذا الشخص ليس ضمن نظام المطورين."
        );

      }

      addPoints(
        user.id,
        -amount
      );

      return message.reply(
        `✅ تم خصم **${amount} نقطة** من ${user}.`
      );

    }

    // ==================================================
    //                    !RANK
    // ==================================================

    if (
      content.startsWith("!rank ")
    ) {

      if (
        !isAdmin(
          message.member
        )
      ) {

        return message.reply(
          "❌ هذا الأمر للإدارة فقط."
        );

      }

      const user =
        message.mentions.users.first();

      const args =
        content.split(/\s+/);

      const rankNumber =
        Number(
          args[2]
        );

      if (
        !user ||
        ![1, 2, 3, 4].includes(
          rankNumber
        )
      ) {

        return message.reply(

          "❌ الاستخدام:\n" +

          "`!rank @user 1`\n\n" +

          "1 = مطور مبتدئ\n" +

          "2 = مطور\n" +

          "3 = مطور متقدم\n" +

          "4 = مطور خبير"

        );

      }

      const member =
        message.guild.members.cache.get(
          user.id
        );

      if (!member) {

        return message.reply(
          "❌ العضو غير موجود."
        );

      }

      const newIndex =
        rankNumber - 1;

      const newRole =
        await getOrCreateRankRole(
          message.guild,
          newIndex
        );

      for (
        const rank
        of CONFIG.RANKS
      ) {

        const oldRole =
          message.guild.roles.cache.find(
            r =>
              r.name ===
              rank.name
          );

        if (
          oldRole &&
          member.roles.cache.has(
            oldRole.id
          )
        ) {

          try {

            await member.roles.remove(
              oldRole
            );

          } catch {}

        }

      }

      await member.roles.add(
        newRole
      );

      setPoints(
        user.id,
        0
      );

      await sendLog(

        message.guild,

        "👨‍💻 تعيين رتبة مطور",

        `${message.author} أعطى ${user} رتبة **${newRole.name}**`

      );

      return message.reply(

        `✅ تم إعطاء ${user} رتبة:\n` +

        `**${newRole.name}**\n\n` +

        `⭐ النقاط: 0`

      );

    }

    // ==================================================
    //                    !SALARY
    // ==================================================

    if (
      content === "!salary"
    ) {

      if (
        !isDeveloper(
          message.member
        )
      ) {

        return message.reply(
          "❌ ليس لديك رتبة مطور."
        );

      }

      const rank =
        getRank(
          message.member
        );

      if (!rank) {

        return message.reply(
          "❌ لم يتم العثور على رتبتك."
        );

      }

      const now =
        new Date();

      const month =
        `${now.getFullYear()}-${now.getMonth() + 1}`;

      if (
        !salaries[
          message.author.id
        ]
      ) {

        salaries[
          message.author.id
        ] = {};

      }

      if (
        salaries[
          message.author.id
        ][month]
      ) {

        return message.reply(
          "❌ استلمت راتبك بالفعل هذا الشهر."
        );

      }

      salaries[
        message.author.id
      ][month] = true;

      saveJSON(
        SALARIES_FILE,
        salaries
      );

      addPoints(

        message.author.id,

        rank.rank.salary

      );

      await checkPromotion(
        message.member
      );

      await sendLog(

        message.guild,

        "💰 صرف راتب",

        `${message.user} استلم راتب **${rank.rank.salary}**`

      );

      return message.reply(

        `💰 تم صرف راتبك بنجاح!\n\n` +

        `🏆 الرتبة: **${rank.rank.name}**\n` +

        `💵 الراتب: **${rank.rank.salary}**\n` +

        `⭐ تمت إضافة الراتب إلى نقاطك.`

      );

    }

    // ==================================================
    //             !SALARY @USER
    // ==================================================

    if (
      content.startsWith("!salary ")
    ) {

      if (
        !isAdmin(
          message.member
        )
      ) {

        return message.reply(
          "❌ هذا الأمر للإدارة فقط."
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
        message.guild.members.cache.get(
          user.id
        );

      if (
        !member ||
        !isDeveloper(member)
      ) {

        return message.reply(
          "❌ هذا الشخص ليس مطورًا."
        );

      }

      const rank =
        getRank(member);

      addPoints(
        user.id,
        rank.rank.salary
      );

      await checkPromotion(
        member
      );

      return message.reply(

        `💰 تم إعطاء ${user} راتب **${rank.rank.salary}**.`

      );

    }

    // ==================================================
    //              !TICKET-PANEL
    // ==================================================

    if (
      content === "!ticket-panel"
    ) {

      if (
        !isAdmin(
          message.member
        )
      ) {

        return message.reply(
          "❌ هذا الأمر للإدارة فقط."
        );

      }

      const embed =
        new EmbedBuilder()

          .setColor("Blue")

          .setTitle(
            "🎫 نظام التذاكر"
          )

          .setDescription(

            "اضغط على الزر بالأسفل لفتح تذكرة.\n\n" +

            "📌 **ملاحظة:**\n" +

            "يمكنك فتح تذكرة واحدة فقط في نفس الوقت."

          );

      const row =
        new ActionRowBuilder()

          .addComponents(

            new ButtonBuilder()

              .setCustomId(
                "create_ticket"
              )

              .setLabel(
                "فتح تذكرة"
              )

              .setEmoji(
                "🎫"
              )

              .setStyle(
                ButtonStyle.Primary
              )

          );

      await message.channel.send({

        embeds:
          [embed],

        components:
          [row]

      });

      return message.delete()
        .catch(() => {});

    }

    // ==================================================
    //          !APPLICATION-PANEL
    // ==================================================

    if (
      content ===
      "!application-panel"
    ) {

      if (
        !isAdmin(
          message.member
        )
      ) {

        return message.reply(
          "❌ هذا الأمر للإدارة فقط."
        );

      }

      const embed =
        new EmbedBuilder()

          .setColor("Gold")

          .setTitle(
            "👨‍💻 التقديم على رتبة مطور"
          )

          .setDescription(

            "هل لديك خبرة في البرمجة؟\n" +

            "اضغط على الزر واملأ الطلب.\n\n" +

            "سيتم مراجعة طلبك من الإدارة."

          );

      const row =
        new ActionRowBuilder()

          .addComponents(

            new ButtonBuilder()

              .setCustomId(
                "developer_application"
              )

              .setLabel(
                "تقديم طلب"
              )

              .setEmoji(
                "📝"
              )

              .setStyle(
                ButtonStyle.Success
              )

          );

      await message.channel.send({

        embeds:
          [embed],

        components:
          [row]

      });

      return message.delete()
        .catch(() => {});

    }

    // ==================================================
    //                    !CLEAR
    // ==================================================

    if (
      content.startsWith("!clear ")
    ) {

      if (
        !isAdmin(
          message.member
        )
      ) {

        return message.reply(
          "❌ هذا الأمر للإدارة فقط."
        );

      }

      const amount =
        Number(
          content.split(/\s+/)[1]
        );

      if (
        !Number.isInteger(amount) ||
        amount < 1 ||
        amount > 100
      ) {

        return message.reply(
          "❌ اكتب رقمًا من 1 إلى 100."
        );

      }

      try {

        await message.channel.bulkDelete(
          amount + 1,
          true
        );

        const msg =
          await message.channel.send(
            `🧹 تم حذف **${amount} رسالة**.`
          );

        setTimeout(
          () =>
            msg.delete()
              .catch(() => {}),
          3000
        );

      } catch {

        return message.reply(
          "❌ لم أستطع حذف الرسائل."
        );

      }

    }

  }
);

// ======================================================
//                 NEW MEMBER
// ======================================================

client.on(
  "guildMemberAdd",
  async member => {

    const channel =
      member.guild.channels.cache.find(

        c =>
          c.name ===
          CONFIG.WELCOME_CHANNEL

      );

    if (!channel) return;

    const embed =
      new EmbedBuilder()

        .setColor("Green")

        .setTitle(
          "👋 عضو جديد!"
        )

        .setDescription(

          `أهلًا وسهلًا ${member} ❤️\n\n` +

          `نورت سيرفر **${member.guild.name}**!\n\n` +

          `نتمنى لك وقتًا ممتعًا معنا 🌟`

        )

        .setThumbnail(
          member.user.displayAvatarURL()
        )

        .setTimestamp();

    await channel.send({

      embeds:
        [embed]

    });

  }
);

// ======================================================
//                    ERRORS
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

  console.error(
    "❌ TOKEN غير موجود في Railway Variables."
  );

  process.exit(1);

}

client.login(
  process.env.TOKEN
);
