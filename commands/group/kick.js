module.exports = {
    name: "kick",
    category: "group",
    permissions: {
        admin: true,
        botAdmin: true,
        group: true,
        restrict: true
    },
    code: async (ctx) => {
        const accountJid = ctx?.quoted?.senderJid || ctx.msg.message?.[ctx.getMessageType()]?.contextInfo?.mentionedJid?.[0] || null;

        if (!accountJid) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${ctx.getId(ctx.sender.jid)}`))}\n` +
                formatter.quote(tools.msg.generateNotes(["Silakan balas atau kutip pesan untuk menentukan pengguna yang akan dijadikan target."])),
            mentions: [ctx.sender.jid]
        });

        if (accountJid === await ctx.group().owner()) return await ctx.reply(formatter.quote("❎ Nomor tersebut adalah owner grup!"));

        try {
            await ctx.group().kick([accountJid]);

            return await ctx.reply(formatter.quote("✅ Berhasil menghapus nomor tersebut dari grup!"));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};