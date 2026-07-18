function createQueryHelpers(db) {
    function run(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function onRun(error) {
                if (error) return reject(error);
                resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    function get(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (error, row) => error ? reject(error) : resolve(row));
        });
    }

    function all(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
        });
    }

    return { run, get, all };
}

module.exports = { createQueryHelpers };
