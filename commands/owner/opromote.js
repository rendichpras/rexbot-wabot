module.exports = {
    name: "opromote",
    category: "owner",
    permissions: {
        botAdmin: true,
        group: true,
        owner: true
    },
    code: async (ctx) => {
        const accountJid = ctx?.quoted?.senderJid || ctx.msg.message?.[ctx.getMessageType()]?.contextInfo?.mentionedJid?.[0] || null;

        if (!accountJid) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${ctx.getId(ctx.sender.jid)}`))}\n` +
                formatter.quote(tools.msg.generateNotes(["Silakan balas atau kutip pesan untuk menentukan pengguna yang akan dijadikan target."])),
            mentions: [ctx.sender.jid]
        });

        if (accountJid === await ctx.group().owner()) return await ctx.reply(formatter.quote("❎ Dia adalah owner grup!"));

        try {
            await ctx.group().promote([accountJid]);

            return await ctx.reply(formatter.quote("✅ Berhasil ditingkatkan dari anggota menjadi admin!"));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};