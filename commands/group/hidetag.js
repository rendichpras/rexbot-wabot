module.exports = {
    name: "hidetag",
    aliases: ["ht"],
    category: "group",
    permissions: {
        admin: true,
        group: true
    },
    code: async (ctx) => {
        const input = ctx.args.join(" ") || formatter.quote("👋 Hai semua!");

        try {
            const members = await ctx.group().members();
            const mentions = members.map(m => m.id);

            return await ctx.reply({
                text: input,
                mentions
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};