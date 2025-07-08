const prisma = require('../../lib/prisma');

module.exports = {
    name: "mute",
    category: "group",
    permissions: {
        admin: true,
        botAdmin: true,
        group: true
    },
    code: async (ctx) => {
        const groupId = ctx.getId(ctx.id);

        try {
            // Cek apakah grup sudah ada di database
            let group = await prisma.group.findUnique({
                where: { id: groupId }
            });

            // Jika grup belum ada, buat baru
            if (!group) {
                group = await prisma.group.create({
                    data: {
                        id: groupId,
                        mute: []
                    }
                });
            }

            if (ctx.args[0]?.toLowerCase() === "bot") {
                await prisma.group.update({
                    where: { id: groupId },
                    data: { mutebot: "true" }
                });
                return await ctx.reply(formatter.quote("✅ Berhasil mute grup dari bot!"));
            }

            const accountJid = ctx?.quoted?.senderJid || ctx.msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
            const accountId = ctx.getId(accountJid);

            if (!accountJid) return await ctx.reply({
                text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                    `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${ctx.getId(ctx.sender.jid)}`))}\n` +
                    formatter.quote(tools.msg.generateNotes(["Silakan balas atau kutip pesan untuk menentukan pengguna yang akan dijadikan target.", `Ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} bot`)} untuk me-mute bot.`])),
                mentions: [ctx.sender.jid]
            });

            if (accountId === config.bot.id) return await ctx.reply(formatter.quote(`❎ Ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} bot`)} untuk me-mute bot.`));
            if (accountJid === await ctx.group().owner()) return await ctx.reply(formatter.quote("❎ Nomor tersebut adalah owner grup!"));

            // Update mute list
            const muteList = group.mute || [];
            if (!muteList.includes(accountId)) {
                await prisma.group.update({
                    where: { id: groupId },
                    data: {
                        mute: {
                            push: accountId
                        }
                    }
                });
            }

            return await ctx.reply(formatter.quote("✅ Berhasil mute nomor tersebut dari grup!"));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};