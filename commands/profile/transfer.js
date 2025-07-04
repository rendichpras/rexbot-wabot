const prisma = require("../../lib/prisma");

module.exports = {
    name: "transfer",
    aliases: ["tf"],
    category: "profile",
    code: async (ctx) => {
        const mentionedJid = ctx.msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const userJid = ctx?.quoted?.senderJid || mentionedJid || (ctx.args[0] ? `${ctx.args[0].replace(/[^\d]/g, "")}@s.whatsapp.net` : null);
        const coinAmount = parseInt(ctx.args[mentionedJid ? 1 : 0], 10) || null;

        const senderJid = ctx.sender.jid;
        const senderId = ctx.getId(senderJid);

        if (!userJid && !coinAmount) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${senderId} 8`))}\n` +
                formatter.quote(tools.msg.generateNotes(["Balas atau kutip pesan untuk menjadikan pengirim sebagai akun target."])),
            mentions: [senderJid]
        });

        const isOnWhatsApp = await ctx.core.onWhatsApp(userJid);
        if (isOnWhatsApp.length === 0) return await ctx.reply(formatter.quote("❎ Akun tidak ada di WhatsApp!"));

        const sender = await prisma.user.findUnique({
            where: { phoneNumber: senderId }
        });

        if (tools.cmd.isOwner(senderId, ctx.msg.key.id) || sender?.premium) {
            return await ctx.reply(formatter.quote("❎ Koin tak terbatas tidak dapat ditransfer."));
        }

        if (coinAmount <= 0) {
            return await ctx.reply(formatter.quote("❎ Jumlah koin tidak boleh kurang dari atau sama dengan 0!"));
        }

        if (!sender?.coin || sender.coin < coinAmount) {
            return await ctx.reply(formatter.quote("❎ Koin-mu tidak mencukupi untuk transfer ini!"));
        }

        try {
            // Gunakan transaksi untuk memastikan kedua operasi berhasil
            await prisma.$transaction([
                // Kurangi koin pengirim
                prisma.user.update({
                    where: { phoneNumber: senderId },
                    data: { coin: { decrement: coinAmount } }
                }),
                // Tambah koin penerima
                prisma.user.upsert({
                    where: { phoneNumber: ctx.getId(userJid) },
                    create: {
                        phoneNumber: ctx.getId(userJid),
                        coin: coinAmount,
                        username: `@user_${ctx.getId(userJid).slice(-6)}`
                    },
                    update: { coin: { increment: coinAmount } }
                })
            ]);

            return await ctx.reply(formatter.quote(`✅ Berhasil mentransfer ${coinAmount} koin ke pengguna itu!`));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};