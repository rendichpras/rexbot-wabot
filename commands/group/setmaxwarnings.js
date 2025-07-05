const prisma = require('../../lib/prisma');

module.exports = {
    name: "setmaxwarnings",
    category: "group",
    permissions: {
        admin: true,
        botAdmin: true,
        group: true
    },
    code: async (ctx) => {
        const input = parseInt(ctx.args[0], 10) || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            formatter.quote(tools.msg.generateCmdExample(ctx.used, "8"))
        );

        try {
            const groupId = ctx.getId(ctx.id);
            
            // Update atau buat grup baru dengan maxwarnings yang ditentukan
            await prisma.group.upsert({
                where: { id: groupId },
                create: {
                    id: groupId,
                    maxwarnings: input,
                    warnings: {} // Inisialisasi warnings kosong
                },
                update: {
                    maxwarnings: input
                }
            });

            return await ctx.reply(formatter.quote(`✅ Berhasil mengatur max warnings menjadi ${input}!`));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};