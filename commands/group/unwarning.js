const prisma = require('../../lib/prisma');

module.exports = {
    name: "unwarning",
    category: "group",
    permissions: {
        admin: true,
        botAdmin: true,
        group: true,
        restrict: true
    },
    code: async (ctx) => {
        const accountJid = ctx?.quoted?.senderJid || ctx.msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
        const accountId = ctx.getId(accountJid);

        if (!accountJid) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${ctx.getId(ctx.sender.jid)}`))}\n` +
                formatter.quote(tools.msg.generateNotes(["Silakan balas atau kutip pesan untuk menentukan pengguna yang akan dijadikan target."])),
            mentions: [ctx.sender.jid]
        });

        if (accountId === config.bot.id) return await ctx.reply(formatter.quote(`❎ Tidak bisa mengurangi warning bot.`));
        if (accountJid === await ctx.group().owner()) return await ctx.reply(formatter.quote("❎ Tidak bisa mengurangi warning admin grup!"));

        try {
            const groupId = ctx.getId(ctx.id);
            
            let group = await prisma.group.findUnique({
                where: { id: groupId },
                select: { warnings: true }
            });

            const warnings = group?.warnings || {};
            const current = warnings[accountId] || 0;

            if (current <= 0) return await ctx.reply(formatter.quote("✅ Pengguna ini tidak memiliki warning."));

            const newWarning = current - 1;
            if (newWarning <= 0) {
                delete warnings[accountId];
            } else {
                warnings[accountId] = newWarning;
            }

            await prisma.group.upsert({
                where: { id: groupId },
                create: {
                    id: groupId,
                    warnings
                },
                update: {
                    warnings
                }
            });

            return await ctx.reply(formatter.quote(`✅ Warning berhasildikurangi! Sekarang warning @${accountId} menjadi ${newWarning}/5.`), {
                mentions: [accountJid]
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};