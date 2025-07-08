const prisma = require("../../lib/prisma");

module.exports = {
    name: "omute",
    category: "owner",
    permissions: {
        group: true,
        owner: true
    },
    code: async (ctx) => {
        const groupId = ctx.getId(ctx.id);

        if (ctx.args[0]?.toLowerCase() === "bot") {
            // Update status mute bot untuk grup
            await prisma.group.upsert({
                where: { id: groupId },
                create: {
                    id: groupId,
                    mutebot: "owner"
                },
                update: {
                    mutebot: "owner"
                }
            });
            return await ctx.reply(formatter.quote("✅ Berhasil me-mute grup ini dari bot!"));
        }

        const accountJid = ctx?.quoted?.senderJid || ctx.msg.message?.[ctx.getMessageType()]?.contextInfo?.mentionedJid?.[0] || null;
        const accountId = ctx.getId(accountJid);

        if (!accountJid) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${ctx.getId(ctx.sender.jid)}`))}\n` +
                formatter.quote(tools.msg.generateNotes(["Silakan balas atau kutip pesan untuk menentukan pengguna yang akan dijadikan target.", `Ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} bot`)} untuk me-mute bot.`])),
            mentions: [ctx.sender.jid]
        });

        if (accountId === config.bot.id) return await ctx.reply(formatter.quote(`❎ Ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} bot`)} untuk me-mute bot.`));
        if (accountJid === await ctx.group().owner()) return await ctx.reply(formatter.quote("❎ Dia adalah owner grup!"));

        try {
            // Ambil data grup yang ada
            const group = await prisma.group.findUnique({
                where: { id: groupId },
                select: { mute: true }
            });

            // Update daftar mute
            const muteList = group?.mute || [];
            if (!muteList.includes(accountId)) {
                await prisma.group.upsert({
                    where: { id: groupId },
                    create: {
                        id: groupId,
                        mute: [accountId]
                    },
                    update: {
                        mute: [...muteList, accountId]
                    }
                });
            }

            return await ctx.reply(formatter.quote("✅ Berhasil me-mute pengguna itu dari grup ini!"));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};