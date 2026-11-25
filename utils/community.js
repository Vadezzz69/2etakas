const { MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder,
    TextInputStyle, StringSelectMenuBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("./db");
const { info, warning } = require("./ui");

const DAY = 86_400_000;
const day = (now = Date.now()) => Math.floor(now / DAY);
const stmt = (query, ...params) => ({ query, params });
const privateReply = { flags: MessageFlags.Ephemeral };
const noMentions = { parse: [] };

class Notice extends Error {}

function view(title, description, components = [], options = {}) {
    return { embeds: [info({ title, description, ...options })], components, allowedMentions: noMentions };
}

function failure(description) {
    return { embeds: [warning({ title: "Toiminto keskeytyi", description })], components: [], allowedMentions: noMentions };
}

function button(id, label, style = ButtonStyle.Secondary, disabled = false) {
    return new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setDisabled(disabled);
}

function row(...components) {
    return new ActionRowBuilder().addComponents(...components);
}

function select(id, placeholder, options) {
    return row(new StringSelectMenuBuilder().setCustomId(id).setPlaceholder(placeholder).addOptions(options));
}

function modal(id, title, fields) {
    const form = new ModalBuilder().setCustomId(id).setTitle(title);
    return form.addComponents(fields.map(([key, label, max]) => row(new TextInputBuilder()
        .setCustomId(key).setLabel(label).setMaxLength(max).setRequired(true).setStyle(TextInputStyle.Short))));
}

async function execute(interaction, task, publicly = false) {
    if (!interaction.inGuild()) return interaction.reply({ ...failure("Toiminto toimii palvelimella."), ...privateReply });
    await interaction.deferReply(publicly ? {} : privateReply);
    try {
        const payload = await task(interaction);
        if (payload) {
            const message = await interaction.editReply(payload);
            await payload.afterReply?.(message);
        }
    } catch (err) {
        if ([10008, 10062, 40060].includes(Number(err?.code))) return;
        if (!(err instanceof Notice)) console.warn("[komitea]", err?.name, err?.code);
        return interaction.editReply(failure(err instanceof Notice ? err.message : "Palvelu ei ole juuri nyt käytettävissä. Yritä hetken päästä."));
    }
}

const painikkeidenLuonti = new Set();

async function setupPanel(i, kind, payload) {
    if (!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        throw new Notice("Paneelin määrittämiseen tarvitaan palvelimen hallintaoikeus.");
    }
    const key = `${i.guildId}:${kind}`;
    if (painikkeidenLuonti.has(key)) throw new Notice("Paneelin päivitys on jo käynnissä.");
    painikkeidenLuonti.add(key);
    try {
        const saved = await db.get("SELECT channel,message FROM komitea_panels WHERE guild=? AND kind=?", [i.guildId, kind]);
        if (saved?.message && typeof saved.message === "string") {
            try {
                const channel = i.guild.channels.cache.get(saved.channel) ?? await i.guild.channels.fetch(saved.channel);
                const message = await channel?.messages.fetch(saved.message);
                if (message) {
                    await message.edit(payload);
                    return view("Paneeli päivitetty", `<#${saved.channel}>`);
                }
            } catch (err) {
                if (![10003, 10008].includes(Number(err?.code))) throw err;
            }
        }
        if (!i.channel?.isTextBased() || !i.channel.send) throw new Notice("Valitse tekstikanava paneelille.");
        const message = await i.channel.send(payload);
        try {
            await db.run(`INSERT INTO komitea_panels(guild,kind,channel,message) VALUES(?,?,?,?)
                ON CONFLICT(guild,kind) DO UPDATE SET channel=excluded.channel,message=excluded.message`,
            [i.guildId, kind, i.channelId, message.id]);
        } catch (err) {
            await message.edit({ components: [] }).catch(() => {});
            throw err;
        }
        return view("Paneeli luotu", `<#${i.channelId}>`);
    } finally {
        painikkeidenLuonti.delete(key);
    }
}

module.exports = { db, day, DAY, stmt, Notice, view, failure, row, button, select, modal, execute, setupPanel, privateReply };
