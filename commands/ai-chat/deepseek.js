const axios = require("axios");

module.exports = {
    name: "deepseek",
    category: "ai-chat",
    permissions: {
        coin: 10
    },
    code: async (ctx) => {
        const input = ctx.args.join(" ") || ctx?.quoted?.conversation || (ctx.quoted && ((Object.values(ctx.quoted).find(v => v?.text || v?.caption)?.text) || (Object.values(ctx.quoted).find(v => v?.text || v?.caption)?.caption))) || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            `${formatter.quote(tools.msg.generateCmdExample(ctx.used, "Bagaimana cara kerja bot WhatsApp?"))}\n` +
            formatter.quote(tools.msg.generateNotes(["Untuk input multi-baris, Anda dapat membalas atau mengutip pesan yang diinginkan."]))
        );

        try {
            const apiUrl = tools.api.createUrl("archive", "/api/ai/deepseek-r1", {
                text: input
            });
            const result = (await axios.get(apiUrl)).data.result;

            return await ctx.reply(result);
        } catch (error) {
            return await tools.cmd.handleError(ctx, error, true);
        }
    }
};