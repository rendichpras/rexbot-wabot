const prisma = require("../../lib/prisma");

module.exports = {
    name: "profile",
    aliases: ["me", "prof", "profil"],
    category: "profile",
    permissions: {},
    code: async (ctx) => {
        try {
            const senderJid = ctx.sender.jid;
            const senderId = ctx.getId(senderJid);

            // Ambil peringkat user
            const users = await prisma.user.findMany({
                select: {
                    phoneNumber: true,
                    winGame: true,
                    level: true
                },
                orderBy: [
                    { winGame: 'desc' },
                    { level: 'desc' }
                ]
            });

            const userRank = users.findIndex(user => user.phoneNumber === senderId) + 1;

            // Ambil data user
            const user = await prisma.user.findUnique({
                where: { phoneNumber: senderId }
            });

            const isOwner = tools.cmd.isOwner(senderId, ctx.msg.key.id);
            const profilePictureUrl = await ctx.core.profilePictureUrl(senderJid, "image")
                .catch(() => "https://i.pinimg.com/736x/70/dd/61/70dd612c65034b88ebf474a52ccc70c4.jpg");

            return await ctx.reply({
                text: `${formatter.quote(`Nama: ${ctx.sender.pushName} (${user?.username || "guest"})`)}\n` +
                    `${formatter.quote(`Status: ${isOwner ? "Owner" : user?.premium ? `Premium (${user?.premiumExpiration ? tools.msg.convertMsToDuration(user.premiumExpiration.getTime() - Date.now()) : "Selamanya"})` : "Free"}`)}\n` +
                    `${formatter.quote(`Level: ${user?.level || 0} (${user?.xp || 0}/100)`)}\n` +
                    `${formatter.quote(`Koin: ${isOwner || user?.premium ? "Tak terbatas" : user?.coin || 0}`)}\n` +
                    `${formatter.quote(`Menang: ${user?.winGame || 0}`)}\n` +
                    formatter.quote(`Peringkat: ${userRank}`),
                footer: config.msg.footer,
                interactiveButtons: []
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};