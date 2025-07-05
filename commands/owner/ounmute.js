const prisma = require("../../lib/prisma");

module.exports = {
    name: "ounmute",
    category: "owner",
    permissions: {
        group: true,
        owner: true
    },
    code: async (ctx) => {
        const groupId = ctx.getId(ctx.id);

        if (["b", "bot"].includes(ctx.args[0]?.toLowerCase())) {
            // Update status mute bot untuk grup
            await prisma.group.upsert({
                where: { id: groupId },
                create: {
                    id: groupId,
                    mutebot: true
                },
                update: {
                    mutebot: true
                }
            });
            return await ctx.reply(formatter.quote("✅ Berhasil me-unmute grup ini dari bot!"));
        }

        const accountJid = ctx?.quoted?.senderJid || ctx.msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
        const accountId = ctx.getId(accountJid);

        if (!accountJid) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${ctx.getId(ctx.sender.jid)}`))}\n` +
                formatter.quote(tools.msg.generateNotes(["Silakan balas atau kutip pesan untuk menentukan pengguna yang akan dijadikan target.", `Ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} bot`)} untuk me-unmute bot.`])),
            mentions: [ctx.sender.jid]
        });

        if (accountId === config.bot.id) return await ctx.reply(formatter.quote(`❎ Ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} bot`)} untuk me-unmute bot.`));
        if (accountJid === await ctx.group().owner()) return await ctx.reply(formatter.quote("❎ Dia adalah owner grup!"));

        try {
            // Ambil data grup yang ada
            const group = await prisma.group.findUnique({
                where: { id: groupId },
                select: { mute: true }
            });

            // Update daftar mute
            const muteList = (group?.mute || []).filter(item => item !== accountId);
            await prisma.group.update({
                where: { id: groupId },
                data: {
                    mute: muteList
                }
            });

            return await ctx.reply(formatter.quote("✅ Berhasil me-unmute pengguna itu dari grup ini!"));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};