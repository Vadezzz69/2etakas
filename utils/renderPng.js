let pending = Promise.resolve();
let queued = 0;
const cache = new Map();
let bytes = 0;
const LIMIT = 6 * 1024 * 1024;

async function render(key, draw, shouldCache = () => true) {
    if (key && cache.has(key)) {
        const data = cache.get(key);
        cache.delete(key);
        cache.set(key,data);
        return data;
    }
    if (queued >= 8) throw new Error("Kuvajono on täynnä");
    queued++;
    const task = pending.then(async () => {
        if (key && cache.has(key)) return cache.get(key);
        const data = await draw(require("@napi-rs/canvas"));
        if (key && shouldCache() && data.length <= LIMIT) {
            while (bytes + data.length > LIMIT || cache.size >= 24) {
                const oldest = cache.keys().next().value;
                bytes -= cache.get(oldest).length;
                cache.delete(oldest);
            }
            cache.set(key,data);
            bytes += data.length;
        }
        return data;
    }).finally(() => { queued--; });
    pending = task.catch(() => {});
    return task;
}

// Canvas ja fontit alustuvat synkronisesti. Tee kylmä alustus ennen Discord-kirjautumista.
function warmup() {
    const ctx = require("@napi-rs/canvas").createCanvas(1,1).getContext("2d");
    ctx.font = "bold 24px sans-serif";
    ctx.measureText("Komitea");
}

function label(ctx, text, x, y, width, size = 24, color = "#eaf1ff", bold = false) {
    ctx.font = `${bold ? "bold " : ""}${size}px sans-serif`;
    ctx.fillStyle = color;
    let value = String(text ?? "");
    if (ctx.measureText(value).width > width) {
        while (value && ctx.measureText(value+"…").width > width) value = value.slice(0,-1);
        value += "…";
    }
    ctx.fillText(value,x,y);
}

module.exports = { render, label, warmup };
