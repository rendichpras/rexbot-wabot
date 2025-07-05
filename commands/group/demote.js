module.exports = {
    name: "demote",
    category: "group",
    permissions: {
        admin: true,
        botAdmin: true,
        group: true
    },
    code: async (ctx) => {
        const accountJid = ctx?.quoted?.senderJid || ctx.msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;

        if (!accountJid) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${ctx.getId(ctx.sender.jid)}`))}\n` +
                formatter.quote(tools.msg.generateNotes(["Silakan balas atau kutip pesan untuk menentukan pengguna yang akan dijadikan target."])),
            mentions: [ctx.sender.jid]
        });

        if (!await ctx.group().isAdmin(accountJid)) return await ctx.reply(formatter.quote("❎ Nomor tersebut bukan admin!"));

        try {
            await ctx.group().demote([accountJid]);

            return await ctx.reply(formatter.quote("✅ Berhasil menurunkan admin tersebut menjadi anggota!"));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};