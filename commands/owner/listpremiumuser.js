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
                    const daysLeft = Math.ceil(Number(user.premiumExpiration - BigInt(Date.now())) / (24 * 60 * 60 * 1000));
                    resultText += `${formatter.quote(`@${user.phoneNumber} (${daysLeft} hari tersisa)`)}\n`;
                } else {
                    resultText += `${formatter.quote(`@${user.phoneNumber} (Premium permanen)`)}\n`;
                }
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