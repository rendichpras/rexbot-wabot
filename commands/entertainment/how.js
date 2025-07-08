module.exports = {
    name: "how",
    aliases: ["howgay", "howpintar", "howcantik", "howganteng", "howgabut", "howgila", "howlesbi", "howstress", "howbucin", "howjones", "howsadboy"],
    category: "entertainment",
    permissions: {
        coin: 10
    },
    code: async (ctx) => {
        const input = ctx.args.join(" ") || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            `${formatter.quote(tools.msg.generateCmdExample(ctx.used, ))}\n` +
            formatter.quote(tools.msg.generateNotes([`Silakan ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} list`)} untuk menampilkan daftar lengkap.`]))
        );

        if (ctx.used.command === "how" || input.toLowerCase() === "list") {
            const listText = await tools.list.get("how");
            return await ctx.reply(listText);
        }

        try {
            const randomNumber = Math.floor(Math.random() * 100);

            return await ctx.reply(formatter.quote(`${input} itu ${randomNumber}% ${(ctx.used.command.replace("how", ""))}.`));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};