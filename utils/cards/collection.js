const { randomUUID }=require("node:crypto");
const { db,Notice }=require("../community");

function owned(guild,user,rarity,offset=0) {
    return db.all(`SELECT * FROM cards_collection WHERE guild=? AND owner=?${rarity==null?"":" AND rarity=?"}
        ORDER BY rarity DESC,created DESC,id LIMIT 11 OFFSET ?`,[guild,user,...(rarity==null?[]:[rarity]),offset]);
}
async function offer(guild,sender,recipient,offered,requested) {
    if (sender===recipient || offered===requested || !/^[a-z0-9-]{12}$/i.test(offered) || !/^[a-z0-9-]{12}$/i.test(requested)) {
        throw new Notice("Tarkista pelaaja ja molempien keräilykorttien tunnisteet.");
    }
    const id=randomUUID().slice(0,12),expires=Date.now()+300_000;
    const result=await db.run(`INSERT INTO cards_trades(id,guild,sender,recipient,offered,requested,state,expires)
        SELECT ?,?,?,?,?,?,'pending',? WHERE EXISTS(SELECT 1 FROM cards_collection WHERE id=? AND guild=? AND owner=?)
        AND EXISTS(SELECT 1 FROM cards_collection WHERE id=? AND guild=? AND owner=?)`,
    [id,guild,sender,recipient,offered,requested,expires,offered,guild,sender,requested,guild,recipient]);
    if (!result.changes) throw new Notice("Varmista, että kumpikin pelaaja omistaa tarjoamansa keräilykortin.");
    return {id,guild,sender,recipient,offered,requested,state:"pending",expires};
}
async function respond(guild,id,user,accept) {
    const result=await db.get(`UPDATE cards_trades SET state=?
        WHERE guild=? AND id=? AND state='pending' AND expires>?
        AND (recipient=? OR (?=0 AND sender=?))
        AND (?=0 OR (EXISTS(SELECT 1 FROM cards_collection WHERE id=offered AND guild=cards_trades.guild AND owner=sender)
                  AND EXISTS(SELECT 1 FROM cards_collection WHERE id=requested AND guild=cards_trades.guild AND owner=recipient)))
        RETURNING *`,[accept?"accepted":"declined",guild,id,Date.now(),user,accept?1:0,user,accept?1:0]);
    if (!result?.id) throw new Notice("Vaihto on vanhentunut, kortti vaihtoi omistajaa tai toiminto ei kuulu sinulle.");
    return result;
}
module.exports={owned,offer,respond};
