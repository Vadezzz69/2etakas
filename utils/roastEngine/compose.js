const { openingPhrase, dominantCategory, transitionFor, closingFor } = require("./phrases");

const MAX_OBSERVATIONS = 3;

const FALLBACK_TEXT =
    "Komitea tarkisti merkinnät: mitattavia havaintoja ei vielä kertynyt, joten kahvitauko jatkuu.";

/**
 * Scores every template against the member's stats, keeps only the ones that
 * matched (score > 0), and returns the strongest few. Ties are broken by
 * template id so the result is fully deterministic — never random.
 */
function selectObservations(stats, templates) {
    return templates
        .map(template => ({ ...template, score: template.score(stats) }))
        .filter(template => template.score > 0)
        .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
        .slice(0, MAX_OBSERVATIONS)
        .map(template => ({
            id: template.id,
            category: template.category ?? "general",
            text: template.text(stats)
        }));
}

function joinNaturally(parts) {
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} ja ${parts[1]}`;
    return `${parts.slice(0, -1).join(", ")} ja ${parts.at(-1)}`;
}

/**
 * Turns the selected observations into a short paragraph instead of a single
 * template pick:
 *
 *   1. A lead sentence merges every selected observation's clause into one
 *      natural sentence (sentence merging) — e.g. "kirjoitti tänään 84 000
 *      viestiä, vietti 420 tuntia äänikanavalla ja on kerännyt 31 sakkoriviä".
 *   2. A second sentence editorializes on the *dominant* theme among the
 *      selected observations (contextual transition + closing), using
 *      reusable phrase builders rather than another random pick — so the
 *      comment always follows from what was actually observed.
 *
 * The whole thing remains fully statistic-driven: nothing here is randomized,
 * and every word traces back to `stats` via the selected observations.
 */
function composeRoast(observations) {
    if (!observations.length) {
        return FALLBACK_TEXT;
    }

    const lead = `${openingPhrase()} ${joinNaturally(observations.map(item => item.text))}.`;

    const category = dominantCategory(observations);
    const closing = `${transitionFor(category)} ${closingFor(category)}`;

    return `${lead} ${closing}`;
}

module.exports = { selectObservations, composeRoast };
