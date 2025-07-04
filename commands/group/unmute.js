const prisma = require('../../lib/prisma');

module.exports = {
    name: "unmute",
    category: "group",
    permissions: {
        admin: true,
        botAdmin: true,
        group: true
    },
    code: async (ctx) => {
        const groupId = ctx.getId(ctx.id);

        try {
            let group = await prisma.group.findUnique({
                where: { id: groupId }
            });

            if (["b", "bot"].includes(ctx.args[0]?.toLowerCase())) {
                await prisma.group.upsert({
                    where: { id: groupId },
                    create: {
                        id: groupId,
                        mutebot: "false"
                    },
                    update: {
                        mutebot: "false"
                    }
                });
                return await ctx.reply(formatter.quote("✅ Berhasil me-unmute grup ini dari bot!"));
            }

            const accountJid = ctx?.quoted?.senderJid || ctx.msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
            const accountId = ctx.getId(accountJid);

            if (!accountJid) return await ctx.reply({
                text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                    `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${ctx.getId(ctx.sender.jid)}`))}\n` +
                    formatter.quote(tools.msg.generateNotes(["Balas atau kutip pesan untuk menjadikan pengirim sebagai akun target.", `Ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} bot`)} untuk me-unmute bot.`])),
                mentions: [ctx.sender.jid]
            });

            if (accountId === config.bot.id) return await ctx.reply(formatter.quote(`❎ Ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} bot`)} untuk me-unmute bot.`));
            if (accountJid === await ctx.group().owner()) return await ctx.reply(formatter.quote("❎ Dia adalah owner grup!"));

            const muteList = group?.mute || [];
            const updatedMuteList = muteList.filter(item => item !== accountId);

            await prisma.group.upsert({
                where: { id: groupId },
                create: {
                    id: groupId,
                    mute: updatedMuteList
                },
                update: {
                    mute: updatedMuteList
                }
            });

            return await ctx.reply(formatter.quote("✅ Berhasil me-unmute pengguna itu dari grup ini!"));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};