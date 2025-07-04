const prisma = require("../../lib/prisma");

module.exports = {
    name: "listbanneduser",
    aliases: ["listban", "listbanned"],
    category: "owner",
    permissions: {
        owner: true
    },
    code: async (ctx) => {
        try {
            // Ambil semua user yang dibanned
            const bannedUsers = await prisma.user.findMany({
                where: {
                    banned: true
                },
                select: {
                    phoneNumber: true
                }
            });

            let resultText = "";
            let userMentions = [];

            for (const user of bannedUsers) {
                const userJid = `${user.phoneNumber}@s.whatsapp.net`;
                resultText += `${formatter.quote(`@${user.phoneNumber}`)}\n`;
                userMentions.push(userJid);
            }

            return await ctx.reply({
                text: `${resultText.trim() || config.msg.notFound}\n` +
                    "\n" +
                    config.msg.footer,
                mentions: userMentions
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};