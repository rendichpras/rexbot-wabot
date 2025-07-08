const prisma = require('../../lib/prisma');

module.exports = {
    name: "warning",
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

        const senderJid = ctx.sender.jid;
        const senderId = ctx.getId(senderJid);

        if (!accountJid) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${senderId}`))}\n` +
                formatter.quote(tools.msg.generateNotes(["Silakan balas atau kutip pesan untuk menentukan pengguna yang akan dijadikan target."])),
            mentions: [senderJid]
        });

        if (accountId === config.bot.id) return await ctx.reply(formatter.quote(`❎ Tidak dapat memberikan warning ke bot!`));
        if (accountJid === await ctx.group().owner()) return await ctx.reply(formatter.quote("❎ Tidak dapat memberikan warning ke admin grup!"));

        try {
            const groupId = ctx.getId(ctx.id);
            
            let group = await prisma.group.findUnique({
                where: { id: groupId }
            });

            if (!group) {
                group = await prisma.group.create({
                    data: {
                        id: groupId,
                        warnings: {},
                        maxwarnings: 3
                    }
                });
            }

            const warnings = group.warnings || {};
            const current = warnings[accountId] || 0;
            const newWarning = current + 1;
            const maxwarnings = group.maxwarnings || 3;

            if (newWarning >= maxwarnings) {
                await ctx.reply(formatter.quote(`⛔ Anda telah menerima ${maxwarnings} warning dan akan dikeluarkan dari grup!`));
                if (!config.system.restrict) await ctx.group().kick([accountJid]);
                
                delete warnings[accountId];
                await prisma.group.update({
                    where: { id: groupId },
                    data: { warnings }
                });
                
                return;
            }

            warnings[accountId] = newWarning;
            await prisma.group.update({
                where: { id: groupId },
                data: { warnings }
            });

            return await ctx.reply(formatter.quote(`✅ Warning berhasil diberikan! Sekarang warning @${accountId} menjadi ${newWarning}/${maxwarnings}.`), {
                mentions: [accountJid]
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};