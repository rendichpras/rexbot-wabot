const prisma = require("../../lib/prisma");

module.exports = {
    name: "banuser",
    aliases: ["ban", "bu"],
    category: "owner",
    permissions: {
        owner: true
    },
    code: async (ctx) => {
        const userJid = ctx?.quoted?.senderJid || ctx.msg.message?.[ctx.getMessageType()]?.contextInfo?.mentionedJid?.[0] || (ctx.args[0] ? `${ctx.args[0].replace(/[^\d]/g, "")}@s.whatsapp.net` : null);

        if (!userJid) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${ctx.getId(ctx.sender.jid)}`))}\n` +
                `${formatter.quote(tools.msg.generateNotes(["Silakan balas atau kutip pesan untuk menentukan pengguna yang akan dijadikan target."]))}\n` +
                formatter.quote(tools.msg.generatesFlagInfo({
                    "-s": "Tidak mengirimkan notifikasi kepada pengguna yang bersangkutan"
                })),
            mentions: [ctx.sender.jid]
        });

        const isOnWhatsApp = await ctx.core.onWhatsApp(userJid);
        if (isOnWhatsApp.length === 0) return await ctx.reply(formatter.quote("❎ Nomor tidak terdaftar di WhatsApp!"));

        try {
            const userId = ctx.getId(userJid);

            // Update atau buat user baru dengan status banned
            await prisma.user.upsert({
                where: {
                    phoneNumber: userId
                },
                create: {
                    phoneNumber: userId,
                    banned: true
                },
                update: {
                    banned: true
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
                text: formatter.quote("📢 Anda telah dibanned oleh Owner!")
            });

            return await ctx.reply(formatter.quote("✅ Berhasil dibanned!"));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};