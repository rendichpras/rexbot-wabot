module.exports = {
    name: "add",
    category: "group",
    permissions: {
        admin: true,
        botAdmin: true,
        group: true,
        restrict: true
    },
    code: async (ctx) => {
        const input = ctx.args.join(" ") || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            formatter.quote(tools.msg.generateCmdExample(ctx.used, ctx.getId(ctx.sender.jid)))
        );

        const accountJid = `${input.replace(/[^\d]/g, "")}@s.whatsapp.net`;

        const isOnWhatsApp = await ctx.core.onWhatsApp(accountJid);
        if (isOnWhatsApp.length === 0) return await ctx.reply(formatter.quote("❎ Nomor tidak terdaftar di WhatsApp!"));

        try {
            await ctx.group().add([accountJid]);

            return await ctx.reply(formatter.quote("✅ Berhasil menambahkan nomor tersebut ke grup!"));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};