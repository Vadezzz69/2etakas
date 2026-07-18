// Weighting: messages contribute up to 2 points (capped at 20/day per point-
// unit), voice up to 2 points (capped at 1h per point-unit), commands up to 1
// point (capped at 10/day). The max attainable score is therefore exactly
// ACTIVITY_SCORE_MAX — used to turn the raw score into a clean percentage.
const MESSAGE_WEIGHT_CAP = 2;
const MESSAGE_UNIT = 20;
const VOICE_WEIGHT_CAP = 2;
const VOICE_UNIT_SECONDS = 3600;
const COMMAND_WEIGHT_CAP = 1;
const COMMAND_UNIT = 10;

const ACTIVITY_SCORE_MAX = MESSAGE_WEIGHT_CAP + VOICE_WEIGHT_CAP + COMMAND_WEIGHT_CAP;

function computeActivityScore({ messages, voice, commandUsage }) {
    const messageScore = Math.min(messages.today / MESSAGE_UNIT, MESSAGE_WEIGHT_CAP);
    const voiceScore = Math.min(voice.todaySeconds / VOICE_UNIT_SECONDS, VOICE_WEIGHT_CAP);
    const commandScore = Math.min(commandUsage / COMMAND_UNIT, COMMAND_WEIGHT_CAP);

    return messageScore + voiceScore + commandScore;
}

function scoreToLevel(score) {
    if (score >= 3) return "high";
    if (score >= 1.5) return "moderate";
    if (score > 0) return "low";
    return "inactive";
}

/** Raw 0..ACTIVITY_SCORE_MAX score. Exposed for callers that want the number, not just the bucket. */
function getActivityScore(stats) {
    return computeActivityScore(stats);
}

/** The score normalized to 0-100, ready for a progress bar. */
function getActivityPercent(stats) {
    const percent = (computeActivityScore(stats) / ACTIVITY_SCORE_MAX) * 100;
    return Math.max(0, Math.min(100, Math.round(percent)));
}

function getActivityLevel(stats) {
    return scoreToLevel(computeActivityScore(stats));
}

module.exports = { getActivityLevel, getActivityScore, getActivityPercent, ACTIVITY_SCORE_MAX };
