const axios = require("axios");
const mime = require("mime-types");

module.exports = {
    name: "tiktoksearch",
    aliases: ["tiktoks", "ttsearch"],
    category: "search",
    permissions: {
        coin: 10
    },
    code: async (ctx) => {
        const input = ctx.args.join(" ") || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            formatter.quote(tools.msg.generateCmdExample(ctx.used, "evangelion"))
        );

        try {
            const apiUrl = tools.api.createUrl("archive", "/api/search/tiktok", {
                query: input
            });
            const result = (await axios.get(apiUrl)).data.result.no_watermark;

            return await ctx.reply({
                video: {
                    url: result
                },
                mimetype: mime.lookup("mp4")
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error, true);
        }
    }
};