const API_URL = (process.env.D1_API_URL || "").replace(/\/+$/, "");
const API_KEY = process.env.D1_API_KEY || "";

async function d1Request(path, body) {
    if (!API_URL || !API_KEY) {
        throw new Error("D1_API_URL tai D1_API_KEY puuttuu.");
    }

    const response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify(body)
    });

    const text = await response.text();

    let data;

    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(
            `D1 API palautti virheellisen vastauksen (HTTP ${response.status}).`
        );
    }

    if (!response.ok || data?.error) {
        throw new Error(
            data?.error || `D1 API HTTP ${response.status}`
        );
    }

    return data;
}

async function run(sql, params = []) {
    const result = await d1Request("/api/run", {
        query: sql,
        params
    });

    return {
        lastID: result?.meta?.last_row_id ?? 0,
        changes: result?.meta?.changes ?? 0
    };
}

async function get(sql, params = []) {
    const result = await d1Request("/api/all", {
        query: sql,
        params
    });

    return result?.results?.[0];
}

async function all(sql, params = []) {
    const result = await d1Request("/api/all", {
        query: sql,
        params
    });

    return result?.results ?? [];
}

module.exports = {
    run,
    get,
    all,
    ready: Promise.resolve()
};
