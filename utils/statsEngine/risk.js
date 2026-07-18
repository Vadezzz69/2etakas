// Weighting: every fine adds 1 point, every investigation (open or closed)
// adds 1 point, and every currently-open investigation adds 2 extra points
// on top of that (open cases matter more than closed history).
const FINE_WEIGHT = 1;
const INVESTIGATION_WEIGHT = 1;
const OPEN_INVESTIGATION_EXTRA_WEIGHT = 2;

// "High" risk starts at 7 raw points; RISK_SCALE_MAX sits just above that so
// a percentage bar reads as nearly full exactly when risk becomes "high".
const RISK_HIGH_THRESHOLD = 7;
const RISK_MEDIUM_THRESHOLD = 3;
const RISK_SCALE_MAX = RISK_HIGH_THRESHOLD + 1;

function computeRiskScore({ fines, investigations }) {
    return (
        fines * FINE_WEIGHT +
        investigations.total * INVESTIGATION_WEIGHT +
        investigations.open * OPEN_INVESTIGATION_EXTRA_WEIGHT
    );
}

function scoreToRiskLevel(score, openInvestigations) {
    if (openInvestigations >= 2 || score >= RISK_HIGH_THRESHOLD) return "high";
    if (openInvestigations >= 1 || score >= RISK_MEDIUM_THRESHOLD) return "medium";
    return "low";
}

/** Raw, unbounded risk score. Exposed for callers that want the number, not just the bucket. */
function getRiskScore(stats) {
    return computeRiskScore(stats);
}

/** The score normalized to 0-100 (capped), ready for a progress bar. */
function getRiskPercent(stats) {
    const percent = (computeRiskScore(stats) / RISK_SCALE_MAX) * 100;
    return Math.max(0, Math.min(100, Math.round(percent)));
}

function getRisk(stats) {
    return scoreToRiskLevel(computeRiskScore(stats), stats.investigations.open);
}

module.exports = { getRisk, getRiskScore, getRiskPercent, RISK_HIGH_THRESHOLD, RISK_MEDIUM_THRESHOLD };
