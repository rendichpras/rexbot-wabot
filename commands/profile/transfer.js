const prisma = require("../../lib/prisma");

module.exports = {
    name: "transfer",
    aliases: ["tf"],
    category: "profile",
    code: async (ctx) => {
        const userJid = ctx?.quoted?.senderJid || ctx.msg.message?.[ctx.getMessageType()]?.contextInfo?.mentionedJid?.[0] || (ctx.args[0] ? `${ctx.args[0].replace(/[^\d]/g, "")}@s.whatsapp.net` : null);
        const coinAmount = parseInt(ctx.args[ctx?.quoted?.senderJid ? 0 : 1], 10) || null;

        const senderJid = ctx.sender.jid;
        const senderId = ctx.getId(senderJid);

        if (!userJid && !coinAmount) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${senderId} 8`))}\n` +
                formatter.quote(tools.msg.generateNotes(["Silakan balas atau kutip pesan untuk menentukan pengguna yang akan dijadikan target."])),
            mentions: [senderJid]
        });

        const isOnWhatsApp = await ctx.core.onWhatsApp(userJid);
        if (isOnWhatsApp.length === 0) return await ctx.reply(formatter.quote("❎ Nomor tidak terdaftar di WhatsApp!"));

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