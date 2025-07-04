const prisma = require("../../lib/prisma");

module.exports = {
    name: "coin",
    aliases: ["koin"],
    category: "profile",
    code: async (ctx) => {
        const senderId = ctx.getId(ctx.sender.jid);

        try {
            const user = await prisma.user.findUnique({
                where: {
                    phoneNumber: senderId
                }
            });

            if (tools.cmd.isOwner(senderId, ctx.msg.key.id) || user?.premium) {
                return await ctx.reply(formatter.quote("🤑 Kamu memiliki koin tak terbatas."));
            }

            const userCoin = user?.coin || 0;
            return await ctx.reply(formatter.quote(`💰 Kamu memiliki ${userCoin} koin tersisa.`));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};