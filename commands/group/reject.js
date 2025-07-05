module.exports = {
    name: "reject",
    category: "group",
    permissions: {
        admin: true,
        botAdmin: true,
        group: true
    },
    code: async (ctx) => {
        const input = ctx.args.join(" ") || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            `${formatter.quote(tools.msg.generateCmdExample(ctx.used, ctx.getId(ctx.sender.jid)))}\n` +
            formatter.quote(tools.msg.generateNotes([`Ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} all`)} untuk menolak semua anggota yang tertunda.`]))
        );

        const pending = await ctx.group().pendingMembers();

        if (["a", "all"].includes(input.toLowerCase())) {
            if (pending.length === 0) return await ctx.reply(formatter.quote("❎ Tidak ada yang menunggu persetujuan."));

            try {
                const allJids = pending.map(p => p.jid);
                await ctx.group().rejectPendingMembers(allJids);

                return await ctx.reply(formatter.quote(`✅ Berhasil menolak semua (${allJids.length}).`));
            } catch (error) {
                return await tools.cmd.handleError(ctx, error);
            }
        }

        const accountJid = `${input.replace(/[^\d]/g, "")}@s.whatsapp.net`;

        const isPending = pending.some(p => p.jid === accountJid);
        if (!isPending) return await ctx.reply(formatter.quote("❎ Nomor tidak terdaftar di grup!"));

        try {
            await ctx.group().rejectPendingMembers([accountJid]);

            return await ctx.reply(formatter.quote("✅ Berhasil menolak nomor tersebut dari grup!"));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};