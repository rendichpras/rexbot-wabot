const prisma = require("../../lib/prisma");

module.exports = {
    name: "addpremiumuser",
    aliases: ["addpremuser", "addprem", "apu"],
    category: "owner",
    permissions: {
        owner: true
    },
    code: async (ctx) => {
        const mentionedJid = ctx.msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const userJid = ctx?.quoted?.senderJid || mentionedJid || (ctx.args[0] ? `${ctx.args[0].replace(/[^\d]/g, "")}@s.whatsapp.net` : null);
        const daysAmount = ctx.args[mentionedJid ? 1 : 0] ? parseInt(ctx.args[mentionedJid ? 1 : 0], 10) : null;

        if (!userJid) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${ctx.getId(ctx.sender.jid)} 30`))}\n` +
                `${formatter.quote(tools.msg.generateNotes(["Silakan balas atau kutip pesan untuk menentukan pengguna yang akan dijadikan target."]))}\n` +
                formatter.quote(tools.msg.generatesFlagInfo({
                    "-s": "Tidak mengirimkan notifikasi kepada pengguna yang bersangkutan"
                })),
            mentions: [ctx.sender.jid]
        });

        const isOnWhatsApp = await ctx.core.onWhatsApp(userJid);
        if (isOnWhatsApp.length === 0) return await ctx.reply(formatter.quote("❎ Nomor tidak terdaftar di WhatsApp!"));

        if (daysAmount && daysAmount <= 0) return await ctx.reply(formatter.quote("❎ Durasi Premium (dalam hari) harus diisi dan lebih dari 0!"));

        try {
            const userId = ctx.getId(userJid);
            const expirationDate = daysAmount ? Date.now() + (daysAmount * 24 * 60 * 60 * 1000) : null;

            // Update atau buat user baru dengan status premium
            await prisma.user.upsert({
                where: {
                    phoneNumber: userId
                },
                create: {
                    phoneNumber: userId,
                    premium: true,
                    premiumExpiration: expirationDate ? BigInt(expirationDate) : null
                },
                update: {
                    premium: true,
                    premiumExpiration: expirationDate ? BigInt(expirationDate) : null
                }
            });

            const flag = tools.cmd.parseFlag(ctx.args.join(" "), {
                "-s": {
                    type: "boolean",
                    key: "silent"
                }
            });

            const silent = flag?.silent || false;

            if (!silent) {
                const message = daysAmount 
                    ? `📢 Anda telah ditambahkan sebagai pengguna Premium oleh Owner selama ${daysAmount} hari!`
                    : "📢 Anda telah ditambahkan sebagai pengguna Premium selamanya oleh Owner!";
                
                await ctx.sendMessage(userJid, {
                    text: formatter.quote(message)
                });
            }

            const successMessage = daysAmount 
                ? `✅ Berhasil menambahkan Premium selama ${daysAmount} hari kepada pengguna itu!`
                : "✅ Berhasil menambahkan Premium selamanya kepada pengguna itu!";
            
            return await ctx.reply(formatter.quote(successMessage));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};