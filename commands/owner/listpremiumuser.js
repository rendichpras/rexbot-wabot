const prisma = require("../../lib/prisma");

module.exports = {
    name: "listpremiumuser",
    aliases: ["listprem", "listpremium"],
    category: "owner",
    permissions: {
        owner: true
    },
    code: async (ctx) => {
        try {
            // Ambil semua user premium
            const premiumUsers = await prisma.user.findMany({
                where: {
                    premium: true
                },
                select: {
                    phoneNumber: true,
                    premiumExpiration: true
                }
            });

            let resultText = "";
            let userMentions = [];

            for (const user of premiumUsers) {
                const userJid = `${user.phoneNumber}@s.whatsapp.net`;
                userMentions.push(userJid);

                if (user.premiumExpiration) {
                    const timeLeft = user.premiumExpiration.getTime() - Date.now();
                    const duration = tools.msg.convertMsToDuration(timeLeft);
                    resultText += `${formatter.quote(`@${user.phoneNumber} (${duration} tersisa)`)}\n`;
                } else {
                    resultText += `${formatter.quote(`@${user.phoneNumber} (Premium permanen)`)}\n`;
                }
            }

            return await ctx.reply({
                text: resultText.trim() || config.msg.notFound,
                mentions: userMentions,
                footer: config.msg.footer,
                interactiveButtons: []
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};