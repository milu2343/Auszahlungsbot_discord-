// ================== GRUNDSETUP ==================
require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  Events
} = require("discord.js");

const express = require("express");

// ================== DISCORD CLIENT ==================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================== TEMPLATE DATEN ==================
let templateData = {
  title: "—",
  dateTime: "—",
  targetChannel: null,
  participantCount: 0,
  participants: []
};

// ================== READY ==================
client.once(Events.ClientReady, () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);
});

// ================== INTERACTIONS ==================
client.on(Events.InteractionCreate, async interaction => {

  // /template Command
  if (interaction.isChatInputCommand() && interaction.commandName === "template") {
    const embed = new EmbedBuilder()
      .setTitle(templateData.title)
      .setAuthor({ name: templateData.dateTime })
      .setDescription("*Auszahlungen könnt ihr beim Leader / Vize Leader abholen.*");

    const rows = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("edit_info")
          .setLabel("📝 Titel / Datum")
          .setStyle(ButtonStyle.Primary)
      ),
      new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId("select_channel")
          .setPlaceholder("📍 Ziel-Channel auswählen")
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("select_count")
          .setPlaceholder("👥 Teilnehmerzahl")
          .addOptions(
            [...Array(20).keys()].map(i => ({
              label: `${i + 1} Teilnehmer`,
              value: `${i + 1}`
            }))
          )
      )
    ];

    return interaction.reply({ embeds: [embed], components: rows });
  }

  // Titel / Datum Modal
  if (interaction.isButton() && interaction.customId === "edit_info") {
    const modal = new ModalBuilder()
      .setCustomId("info_modal")
      .setTitle("Event Infos");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("title")
          .setLabel("Titel")
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("date")
          .setLabel("Datum")
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("time")
          .setLabel("Uhrzeit")
          .setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "info_modal") {
    templateData.title = interaction.fields.getTextInputValue("title");
    const date = interaction.fields.getTextInputValue("date");
    const time = interaction.fields.getTextInputValue("time");
    templateData.dateTime = `${date} – ${time}`;
    return interaction.reply({ content: "✅ Gespeichert", ephemeral: true });
  }

  // Ziel-Channel
  if (interaction.isChannelSelectMenu() && interaction.customId === "select_channel") {
    templateData.targetChannel = interaction.values[0];
    return interaction.reply({ content: "📍 Channel gesetzt", ephemeral: true });
  }

  // Teilnehmerzahl
  if (interaction.isStringSelectMenu() && interaction.customId === "select_count") {
    templateData.participantCount = Number(interaction.values[0]);
    templateData.participants = Array.from(
      { length: templateData.participantCount },
      () => ({ user: null, amount: null, reason: null })
    );

    await interaction.reply({
      content: `👥 Teilnehmer: ${templateData.participantCount}`,
      ephemeral: true
    });

    for (let i = 0; i < templateData.participantCount; i++) {
      const rows = [
        new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder()
            .setCustomId(`user_${i}`)
            .setPlaceholder(`Teilnehmer ${i + 1}`)
        ),
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`amount_${i}`)
            .setPlaceholder("Auszahlung")
            .addOptions([
              { label: "1K", value: "1K" },
              { label: "5K", value: "5K" },
              { label: "10K", value: "10K" },
              { label: "20K", value: "20K" },
              { label: "30K", value: "30K" },
              { label: "40K", value: "40K" },
              { label: "45K", value: "45K" },
              { label: "50K", value: "50K" },
              { label: "Custom", value: "custom_amount" }
            ])
        ),
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`reason_${i}`)
            .setPlaceholder("Grund")
            .addOptions([
              { label: "Anfahrt", value: "Anfahrt" },
              { label: "Kill", value: "Kill" },
              { label: "Win", value: "Win" },
              { label: "Panel", value: "Panel" },
              { label: "Sonstiges", value: "Sonstiges" },
              { label: "Custom", value: "custom_reason" }
            ])
        )
      ];

      if (i === templateData.participantCount - 1) {
        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("finish")
              .setLabel("✅ Fertig")
              .setStyle(ButtonStyle.Success)
          )
        );
      }

      await interaction.followUp({
        content: `Teilnehmer ${i + 1}`,
        components: rows,
        ephemeral: true
      });
    }
  }

  // CUSTOM BETRAG → MODAL
if (
  interaction.isStringSelectMenu() &&
  interaction.customId.startsWith("select_amount_") &&
  interaction.values[0] === "custom_amount"
) {
  const index = Number(interaction.customId.split("_")[2]);

  const modal = new ModalBuilder()
    .setCustomId(`custom_amount_modal_${index}`)
    .setTitle("Custom Auszahlung");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("amount")
        .setLabel("Betrag (z. B. 3.5K oder 12000)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    )
  );

  await interaction.showModal(modal);
}

  // CUSTOM GRUND → MODAL
if (
  interaction.isStringSelectMenu() &&
  interaction.customId.startsWith("select_reason_") &&
  interaction.values[0] === "custom_reason"
) {
  const index = Number(interaction.customId.split("_")[2]);

  const modal = new ModalBuilder()
    .setCustomId(`custom_reason_modal_${index}`)
    .setTitle("Custom Grund");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("Grund eingeben")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
    )
  );

  await interaction.showModal(modal);
}

  if (
  interaction.isModalSubmit() &&
  interaction.customId.startsWith("custom_amount_modal_")
) {
  const index = Number(interaction.customId.split("_")[3]);
  const amount = interaction.fields.getTextInputValue("amount");

  templateData.participants[index].amount = amount;

  await interaction.reply({
    content: `💰 Betrag gespeichert: **${amount}**`,
    ephemeral: true
  });
}

  if (
  interaction.isModalSubmit() &&
  interaction.customId.startsWith("custom_reason_modal_")
) {
  const index = Number(interaction.customId.split("_")[3]);
  const reason = interaction.fields.getTextInputValue("reason");

  templateData.participants[index].reason = reason;

  await interaction.reply({
    content: `📄 Grund gespeichert: **${reason}**`,
    ephemeral: true
  });
}


  if (interaction.isUserSelectMenu() && interaction.customId.startsWith("user_")) {
    const i = Number(interaction.customId.split("_")[1]);
    templateData.participants[i].user = `<@${interaction.values[0]}>`;
    return interaction.deferUpdate();
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("amount_")) {
    const i = Number(interaction.customId.split("_")[1]);
    templateData.participants[i].amount = interaction.values[0];
    return interaction.deferUpdate();
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("reason_")) {
    const i = Number(interaction.customId.split("_")[1]);
    templateData.participants[i].reason = interaction.values[0];
    return interaction.deferUpdate();
  }

  if (interaction.isButton() && interaction.customId === "finish") {
    const channel = interaction.guild.channels.cache.get(templateData.targetChannel);
    if (!channel) {
      return interaction.reply({ content: "❌ Kein Channel", ephemeral: true });
    }

    const text = templateData.participants
      .map(p => `• ${p.user} – ${p.amount} (${p.reason})`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(templateData.title)
      .setAuthor({ name: templateData.dateTime })
      .setDescription("*Auszahlungen könnt ihr beim Leader / Vize Leader abholen.*\n\n" + text);

    await channel.send({ embeds: [embed] });

    templateData = {
      title: "—",
      dateTime: "—",
      targetChannel: null,
      participantCount: 0,
      participants: []
    };

    return interaction.reply({ content: "✅ Gesendet", ephemeral: true });
  }
});

// ================== LOGIN ==================
client.login(process.env.TOKEN);

// ================== EXPRESS (UPTIME) ==================
const app = express();

app.get("/", (req, res) => {
  res.send("Bot läuft ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 Webserver läuft auf Port ${PORT}`);
});
