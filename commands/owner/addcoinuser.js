const prisma = require("../../lib/prisma");

module.exports = {
    name: "addcoinuser",
    aliases: ["acu", "addcoin"],
    category: "owner",
    permissions: {
        owner: true
    },
    code: async (ctx) => {
        const mentionedJid = ctx.msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const userJid = ctx?.quoted?.senderJid || mentionedJid || (ctx.args[0] ? `${ctx.args[0].replace(/[^\d]/g, "")}@s.whatsapp.net` : null);
        const coinAmount = parseInt(ctx.args[mentionedJid ? 1 : 0], 10) || null;

        if (!userJid && !coinAmount) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${ctx.getId(ctx.sender.jid)} 8`))}\n` +
                `${formatter.quote(tools.msg.generateNotes(["Silakan balas atau kutip pesan untuk menentukan pengguna yang akan dijadikan target."]))}\n` +
                formatter.quote(tools.msg.generatesFlagInfo({
                    "-s": "Tidak mengirimkan notifikasi kepada pengguna yang bersangkutan"
                })),
            mentions: [ctx.sender.jid]
        });

        const isOnWhatsApp = await ctx.core.onWhatsApp(userJid);
        if (isOnWhatsApp.length === 0) return await ctx.reply(formatter.quote("❎ Nomor tidak terdaftar di WhatsApp!"));

        try {
            // Update atau buat user baru dengan menambahkan coin
            await prisma.user.upsert({
                where: {
                    phoneNumber: ctx.getId(userJid)
                },
                create: {
                    phoneNumber: ctx.getId(userJid),
                    coin: coinAmount
                },
                update: {
                    coin: {
                        increment: coinAmount
                    }
                }
            });

            const flag = tools.cmd.parseFlag(ctx.args.join(" "), {
                "-s": {
                    type: "boolean",
                    key: "silent"
                }
            });

            const silent = flag?.silent || false;
            if (!silent) await ctx.sendMessage(userJid, {
                text: formatter.quote(`📢 Anda telah menerima ${coinAmount} koin dari Owner!`)
            });

            return await ctx.reply(formatter.quote(`✅ Berhasil menambahkan ${coinAmount} koin kepada pengguna itu!`));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};