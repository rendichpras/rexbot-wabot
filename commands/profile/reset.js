const prisma = require("../../lib/prisma");

module.exports = {
    name: "reset",
    category: "profile",
    permissions: {
        private: true
    },
    code: async (ctx) => {
        await ctx.reply(formatter.quote(`🤖 Apakah kamu yakin ingin mereset datamu? Langkah ini akan menghapus seluruh data yang tersimpan dan tidak dapat dikembalikan. Ketik ${formatter.monospace("y")} untuk melanjutkan atau ${formatter.monospace("n")} untuk membatalkan.`));

        try {
            const collector = ctx.MessageCollector({
                time: 60000,
                hears: [ctx.sender.jid]
            });

            collector.on("collect", async (m) => {
                const content = m.content.trim().toLowerCase();
                const senderId = ctx.getId(ctx.sender.jid);

                if (content === "y") {
                    await prisma.user.delete({
                        where: {
                            phoneNumber: senderId
                        }
                    }).catch(() => {}); // Ignore if user doesn't exist
                    
                    await ctx.reply(formatter.quote("✅ Data-mu berhasil direset, semua data telah dihapus!"));
                    return collector.stop();
                } else if (content === "n") {
                    await ctx.reply(formatter.quote("❌ Proses reset data telah dibatalkan."));
                    return collector.stop();
                }
            });

            collector.on("end", async () => {
                if (session.has(ctx.id)) {
                    session.delete(ctx.id);
                    return await ctx.reply(formatter.quote("❌ Waktu konfirmasi telah habis."));
                }
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};