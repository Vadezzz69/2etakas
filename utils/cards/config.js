const DEFAULT_STAGES = [10, 25, 50];

function xpUnit() {
    return Math.max(10, Math.min(1000, Math.floor(Number(process.env.KOMITEA_XP_YKSIKKO) || 50)));
}

function stageLevels() {
    const values = (process.env.KOMITEA_TASORAJAT ?? "").split(",").map(Number);
    if (values.length !== 3 || values.some((n, i) => !Number.isInteger(n) || n < 2 || n > 2000 || (i > 0 && n <= values[i - 1]))) {
        return DEFAULT_STAGES;
    }
    return values;
}

function stages() {
    const [agent, special, legend] = stageLevels();
    return [
        [1, "Komitean harjoittelija"], [agent, "Agentti"],
        [special, "Erikoisagentti"], [legend, "Komitean legenda"]
    ];
}

module.exports = { xpUnit, stageLevels, stages };
