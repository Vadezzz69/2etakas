function route(i) {
    const id=i.customId;
    if (typeof id!=="string" || !(i.isButton?.() || i.isStringSelectMenu?.() || i.isModalSubmit?.())) return null;
    if (id.startsWith("km:")) return require("./musiikki/yhteiso/library").handle;
    if (id.startsWith("ks:")) return require("./musiikki/yhteiso/social").handle;
    if (id.startsWith("kc:")) return require("./cards/ui").handle;
    return null;
}
module.exports={route};
