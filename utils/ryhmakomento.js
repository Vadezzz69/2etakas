/**
 * Ryhmäkomennot: /vakoilu, /tutkimus ja /oikeus.
 *
 * Jokaisella ryhmällä on oikeat alikomennot (esim. `/vakoilu tarkkaile`,
 * `/vakoilu etsintakuulutus`), ja valittu alikomento ajaa AINA täsmälleen
 * sen nimeämän toiminnon. Toiminnot elävät yhä omissa tiedostoissaan
 * (esim. commands/vakoilu/wanted.js), joten koodia ei kopioida: ryhmä vain
 * lukee jäsenen nimen, kuvauksen ja valinnat suoraan jäsenen omasta
 * komentomäärityksestä ja delegoi suorituksen jäsenelle.
 *
 * Aiempi versio ei tuntenut alikomentoja ja arpoi jäsenen satunnaisesti,
 * jolloin esim. `/vakoilu tarkkaile` saattoi tehdä etsintäkuulutuksen.
 */

/**
 * @param {object} asetukset
 * @param {string} asetukset.nimi
 * @param {string} asetukset.kuvaus
 * @param {Object<string, {jasen: {data: {toJSON: Function}, execute: Function}, kuvaus?: string}>} asetukset.alikomennot
 *        alikomennon nimi -> jäsenkomento (ja valinnainen oma kuvaus)
 */
function luoRyhmakomento({ nimi, kuvaus, alikomennot }) {
    const nimet = Object.keys(alikomennot);

    return {
        ALIKOMENNOT: alikomennot,

        data: {
            name: nimi,
            description: kuvaus,

            // Samalla muodolla kuin discord.js:n SlashCommandBuilder#toJSON,
            // jotta deploy ja help toimivat ilman erityiskäsittelyä.
            toJSON() {
                return {
                    name: nimi,
                    description: kuvaus,
                    options: nimet.map(sub => {
                        const jasenJson = alikomennot[sub].jasen.data.toJSON();
                        return {
                            type: 1, // SUB_COMMAND
                            name: sub,
                            description: alikomennot[sub].kuvaus ?? jasenJson.description,
                            options: jasenJson.options ?? []
                        };
                    })
                };
            }
        },

        async execute(interaction, client) {
            const sub = interaction.options.getSubcommand();
            const merkinta = alikomennot[sub];

            if (!merkinta) {
                throw new Error(`Ryhmäkomennolla /${nimi} ei ole alikomentoa "${sub}".`);
            }

            return merkinta.jasen.execute(interaction, client);
        }
    };
}

module.exports = { luoRyhmakomento };
