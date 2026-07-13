const { Events } = require("discord.js");

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

            await command.execute(interaction, client);

        } catch (err) {

            console.error(`❌ Virhe komennossa "${interaction.commandName}":`, err);

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
