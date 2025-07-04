const prisma = require("../../lib/prisma");

module.exports = {
    name: "leaderboard",
    aliases: ["lb", "peringkat"],
    category: "profile",
    code: async (ctx) => {
        try {
            const senderId = ctx.getId(ctx.sender.jid);

            // Ambil semua user dan urutkan berdasarkan winGame dan level
            const users = await prisma.user.findMany({
                select: {
                    phoneNumber: true,
                    username: true,
                    level: true,
                    winGame: true
                },
                orderBy: [
                    { winGame: 'desc' },
                    { level: 'desc' }
                ]
            });

            const leaderboardData = users.map(user => ({
                id: user.phoneNumber,
                username: user.username || "guest",
                level: user.level,
                winGame: user.winGame
            }));

            const userRank = leaderboardData.findIndex(user => user.id === senderId) + 1;
            const topUsers = leaderboardData.slice(0, 10);
            let resultText = "";

            topUsers.forEach((user, index) => {
                const isSelf = user.id === senderId;
                const displayName = isSelf ? `@${user.id}` : user.username ? user.username : `${user.id}`;
                resultText += formatter.quote(`${index + 1}. ${displayName} - Menang: ${user.winGame}, Level: ${user.level}\n`);
            });

            if (userRank > 10) {
                const userStats = leaderboardData[userRank - 1];
                const displayName = `@${senderId}`;
                resultText += formatter.quote(`${userRank}. ${displayName} - Menang: ${userStats.winGame}, Level: ${userStats.level}\n`);
            }

            return await ctx.reply({
                text: `${resultText.trim()}\n` +
                    "\n" +
                    config.msg.footer,
                mentions: [`${senderId}@s.whatsapp.net`]
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};