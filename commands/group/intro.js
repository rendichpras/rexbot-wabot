const prisma = require('../../lib/prisma');

module.exports = {
    name: "intro",
    category: "group",
    permissions: {
        botAdmin: true,
        group: true
    },
    code: async (ctx) => {
        try {
            const groupId = ctx.getId(ctx.id);
            
            // Mengambil data grup dari Prisma
            const group = await prisma.group.findUnique({
                where: { id: groupId },
                select: { text: true }
            });

            const introText = group?.text?.intro || formatter.quote("❎ Grup tidak memiliki intro.");

            return await ctx.reply(introText);
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};