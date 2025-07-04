const prisma = require("../../lib/prisma");

module.exports = {
    name: "afk",
    category: "profile",
    code: async (ctx) => {
        const input = ctx.args.join(" ") || null;

        try {
            const phoneNumber = ctx.getId(ctx.sender.jid);
            
            await prisma.user.upsert({
                where: {
                    phoneNumber: phoneNumber
                },
                create: {
                    phoneNumber: phoneNumber,
                    afk: {
                        reason: input,
                        timestamp: Date.now()
                    }
                },
                update: {
                    afk: {
                        reason: input,
                        timestamp: Date.now()
                    }
                }
            });

            return await ctx.reply(formatter.quote(`📴 Kamu akan AFK, ${input ? `dengan alasan "${input}"` : "tanpa alasan apapun"}.`));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};