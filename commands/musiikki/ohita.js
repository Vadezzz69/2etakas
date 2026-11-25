const { SlashCommandBuilder } = require("discord.js");
const { valmisteleOhjaus } = require("../../utils/musiikki/ohjain");
const UI = require("../../utils/musiikki/muotoilu");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ohita")
        .setDescription("Ohittaa nykyisen kappaleen."),

    async execute(interaction) {
        const soitin = await valmisteleOhjaus(interaction);
        if (!soitin) return;
        const kappale = soitin.ohita();
        if (!kappale) return interaction.reply({ ...UI.virhe("Ohitettavaa kappaletta ei ole."), ephemeral: true });
        void require("../../utils/musiikki/yhteiso/store").activity(interaction.guildId,interaction.user.id,0,1).catch(()=>{});
        soitin.paivitaPaneeli?.();
        await interaction.reply({ ...UI.onnistui("Kappale ohitettu", UI.nimi(kappale)), ephemeral: true });
    }
};
