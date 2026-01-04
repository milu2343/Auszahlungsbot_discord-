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

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Template-Daten
let templateData = {
  title: "—",
  dateTime: "—",
  targetChannel: null,
  participantCount: 0,
  participants: [] // Array von { user, amount, reason }
};

client.once("ready", () => console.log(`✅ Eingeloggt als ${client.user.tag}`));

client.on(Events.InteractionCreate, async interaction => {

  // 1️⃣ /template Command → zentrale Template-Nachricht
  if (interaction.isChatInputCommand() && interaction.commandName === "template") {
    const embed = new EmbedBuilder()
      .setTitle(templateData.title)
      .setAuthor({ name: templateData.dateTime })
      .setDescription("*Auszahlungen könnt ihr beim Leader / Vize Leader abholen.*");

    const rows = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("edit_info").setLabel("📝 Titel / Datum").setStyle(ButtonStyle.Primary)
      ),
      new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId("select_channel").setPlaceholder("📍 Ziel-Channel auswählen")
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("select_count")
          .setPlaceholder("👥 Teilnehmerzahl auswählen")
          .addOptions([...Array(20).keys()].map(i => ({ label: `${i+1} Teilnehmer`, value: `${i+1}` })))
      )
    ];

    await interaction.reply({ embeds: [embed], components: rows, ephemeral: false });
  }

  // 2️⃣ Modal für Titel / Datum / Uhrzeit
  if (interaction.isButton() && interaction.customId === "edit_info") {
    const modal = new ModalBuilder().setCustomId("info_modal").setTitle("Event Infos");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("title").setLabel("Titel").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("date").setLabel("Datum").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("time").setLabel("Uhrzeit").setStyle(TextInputStyle.Short)
      )
    );
    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "info_modal") {
    templateData.title = interaction.fields.getTextInputValue("title");
    const date = interaction.fields.getTextInputValue("date");
    const time = interaction.fields.getTextInputValue("time");
    templateData.dateTime = `${date} – ${time}`;
    await interaction.reply({ content: "✅ Infos gespeichert", ephemeral: true });
  }

  // 3️⃣ Ziel-Channel auswählen (nur ephemeral)
  if (interaction.isChannelSelectMenu() && interaction.customId === "select_channel") {
    templateData.targetChannel = interaction.values[0];
    await interaction.reply({ content: `📌 Ziel-Channel ausgewählt`, ephemeral: true });
  }

  // 4️⃣ Teilnehmerzahl auswählen
  if (interaction.isStringSelectMenu() && interaction.customId === "select_count") {
    templateData.participantCount = Number(interaction.values[0]);
    // Neues Array, jedes Objekt individuell → verhindert Überschreiben
    templateData.participants = Array.from({ length: templateData.participantCount }, () => ({ user: null, amount: null, reason: null }));
    await interaction.reply({ content: `👥 Teilnehmerzahl gesetzt: ${templateData.participantCount}`, ephemeral: true });

    // Für jeden Teilnehmer nur ephemeral Auswahl
    for (let i = 0; i < templateData.participantCount; i++) {
      const components = [
        new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder().setCustomId(`select_user_${i}`).setPlaceholder(`👤 Teilnehmer ${i+1}`)
        ),
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`select_amount_${i}`)
            .setPlaceholder("💰 Auszahlung")
            .addOptions([
              { label: "1K", value: "1K" },
              { label: "2K", value: "2K" },
              { label: "5K", value: "5K" },
              { label: "Custom", value: "Custom" }
            ])
        ),
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`select_reason_${i}`)
            .setPlaceholder("📌 Art der Auszahlung")
            .addOptions([
              { label: "Anfahren", value: "Anfahren" },
              { label: "Event Sieg", value: "Event Sieg" },
              { label: "Support", value: "Support" },
              { label: "Sonstiges", value: "Sonstiges" }
            ])
        )
      ];

      // Fertig-Button nur beim letzten Teilnehmer
      if (i === templateData.participantCount - 1) {
        components.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("finish").setLabel("✅ Fertig").setStyle(ButtonStyle.Success)
          )
        );
      }

      await interaction.followUp({
        content: `Teilnehmer ${i + 1} auswählen:`,
        components,
        ephemeral: true
      });
    }
  }

  // 5️⃣ Teilnehmer-Interaktionen → nur ephemeral
  if (interaction.isUserSelectMenu() && interaction.customId.startsWith("select_user_")) {
    const index = Number(interaction.customId.split("_")[2]);
    templateData.participants[index].user = `<@${interaction.values[0]}>`;
    await interaction.deferUpdate();
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("select_amount_")) {
    const index = Number(interaction.customId.split("_")[2]);
    templateData.participants[index].amount = interaction.values[0];
    await interaction.deferUpdate();
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("select_reason_")) {
    const index = Number(interaction.customId.split("_")[2]);
    templateData.participants[index].reason = interaction.values[0];
    await interaction.deferUpdate();
  }

  // 6️⃣ Fertig-Button → finaler Embed öffentlich
  if (interaction.isButton() && interaction.customId === "finish") {
    if (!templateData.targetChannel) return interaction.reply({ content: "❌ Kein Ziel-Channel gewählt", ephemeral: true });
    const channel = interaction.guild.channels.cache.get(templateData.targetChannel);
    if (!channel) return interaction.reply({ content: "❌ Channel nicht gefunden", ephemeral: true });

    const payoutText = templateData.participants
      .filter(p => p.user) // nur Teilnehmer mit Auswahl
      .map(p => `• ${p.user} – ${p.amount || "—"} (${p.reason || "—"})`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(templateData.title)
      .setAuthor({ name: templateData.dateTime })
      .setDescription("*Auszahlungen könnt ihr beim Leader / Vize Leader abholen.*\n\n" + payoutText);

    await channel.send({ embeds: [embed] });

    // Template zurücksetzen
    templateData = { title: "—", dateTime: "—", targetChannel: null, participantCount: 0, participants: [] };
    await interaction.reply({ content: "✅ Auszahlung gesendet & Template zurückgesetzt", ephemeral: true });
  }

});

client.login(process.env.TOKEN);
