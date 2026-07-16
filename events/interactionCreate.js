const { Events } = require("discord.js");
const { kirjaaKomento } = require("../utils/tilastot");

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.warn(`⚠️  Tuntematon komento: ${interaction.commandName}`);
            return;
        }

        try {

                 console.log(`➡️ Aloitetaan komento: ${interaction.commandName}`);

                 await command.execute(interaction, client);

                 console.log(`✅ Komento valmis: ${interaction.commandName}`);

            if (interaction.guildId) {
                kirjaaKomento(interaction.guildId, interaction.user.id, interaction.commandName)
                    .catch(err => console.error("❌ Komentotilaston kirjaus epäonnistui:", err));
            }

        } catch (err) {

                    console.error("==================================");
                    console.error(`❌ Virhe komennossa: ${interaction.commandName}`);
                    console.error(err);
                    console.error(err.stack);
                    console.error("==================================");
            const errorReply = {
                content: "Komennon suorittaminen epäonnistui. 😕",
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorReply);
            } else {
                await interaction.reply(errorReply);
            }

        }

    }
};
