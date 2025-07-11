

module.exports = {
    name: "editimage",
    aliases: ["editimg"],
    category: "ai-misc",
    permissions: {
        premium: true
    },
    code: async (ctx) => {
        const input = ctx.args.join(" ") || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            formatter.quote(tools.msg.generateCmdExample(ctx.used, "Mohon ubah gambar ini menjadi gaya seni pixel"))
        );

        const messageType = ctx.getMessageType();
        const [checkMedia, checkQuotedMedia] = await Promise.all([
            tools.cmd.checkMedia(messageType, "image"),
            tools.cmd.checkQuotedMedia(ctx?.quoted, "image")
        ]);

        if (!checkMedia && !checkQuotedMedia) return await ctx.reply(formatter.quote(tools.msg.generateInstruction(["send", "reply"], "image")));

        try {
            const buffer = await ctx.msg.media.toBuffer() || await ctx.quoted.media.toBuffer();
            const uploadUrl = await tools.cmd.upload(buffer, "image");
            const result = tools.api.createUrl("zell", "/ai/editimg", {
                imageUrl: uploadUrl,
                prompt: input
            });

            return await ctx.reply({
                image: {
                    url: result
                },
                mimetype: tools.mime.lookup("png")
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error, true);
        }
    }
};