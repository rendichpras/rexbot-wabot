const axios = require("axios");

module.exports = {
    name: "soundcloudsearch",
    aliases: ["soundcloud", "soundclouds"],
    category: "search",
    permissions: {
        coin: 10
    },
    code: async (ctx) => {
        const input = ctx.args.join(" ") || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            formatter.quote(tools.msg.generateCmdExample(ctx.used, "nina - hindia"))
        );

        try {
            const apiUrl = tools.api.createUrl("archive", "/api/search/soundcloud", {
                query: input
            });
            const result = (await axios.get(apiUrl)).data.result;

            const resultText = result.map(r =>
                `${formatter.quote(`Judul: ${r.title}`)}\n` +
                formatter.quote(`URL: ${r.url}`)
            ).join(
                "\n" +
                `${formatter.quote("─────")}\n`
            );
            return await ctx.reply({
                text: resultText || config.msg.notFound,
                footer: config.msg.footer,
                interactiveButtons: []
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error, true);
        }
    }
};