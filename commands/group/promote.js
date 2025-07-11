module.exports = {
    name: "promote",
    category: "group",
    permissions: {
        admin: true,
        botAdmin: true,
        group: true
    },
    code: async (ctx) => {
        const accountJid = ctx.msg.message?.[ctx.getMessageType()]?.contextInfo?.mentionedJid?.[0] || ctx?.quoted?.senderJid || null;

        if (!accountJid) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${ctx.getId(ctx.sender.jid)}`))}\n` +
                formatter.quote(tools.msg.generateNotes(["Silakan balas atau kutip pesan untuk menentukan pengguna yang akan dijadikan target."])),
            mentions: [ctx.sender.jid]
        });

        if (accountJid === await ctx.group().owner()) return await ctx.reply(formatter.quote("❎ Nomor tersebut adalah owner grup!"));

        try {
            await ctx.group().promote([accountJid]);

            return await ctx.reply(formatter.quote("✅ Berhasil meningkatkan nomor tersebut menjadi admin!"));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};