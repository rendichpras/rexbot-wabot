const prisma = require("../../lib/prisma");

module.exports = {
    name: "listsewagroup",
    aliases: ["listsewa"],
    category: "owner",
    permissions: {
        owner: true
    },
    code: async (ctx) => {
        try {
            // Ambil semua grup yang disewa
            const sewaGroups = await prisma.group.findMany({
                where: {
                    sewa: true
                },
                select: {
                    id: true,
                    sewaExpiration: true
                }
            });

            let resultText = "";
            let groupMentions = [];

            for (const group of sewaGroups) {
                const groupJid = `${group.id}@g.us`;
                const groupInfo = await ctx.group(groupJid);
                if (!groupInfo) continue; // Skip jika grup tidak ditemukan

                const groupName = await groupInfo.name();
                groupMentions.push({
                    groupJid,
                    groupSubject: groupName
                });

                if (group.sewaExpiration) {
                    const daysLeft = Math.ceil(Number(group.sewaExpiration - BigInt(Date.now())) / (24 * 60 * 60 * 1000));
                    resultText += `${formatter.quote(`${groupName} (${daysLeft} hari tersisa)`)}\n`;
                } else {
                    resultText += `${formatter.quote(`${groupName} (Sewa permanen)`)}\n`;
                }
            }

            return await ctx.reply({
                text: resultText.trim() || config.msg.notFound,
                footer: config.msg.footer,
                interactiveButtons: [],
                contextInfo: {
                    groupMentions
                }
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};