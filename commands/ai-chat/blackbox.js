const axios = require("axios");
const prisma = require('../../lib/prisma');

module.exports = {
    name: "blackbox",
    aliases: ["bb"],
    category: "ai-chat",
    permissions: {
        coin: 10
    },
    code: async (ctx) => {
        const input = ctx.args.join(" ") || ctx?.quoted?.conversation || (ctx.quoted && ((Object.values(ctx.quoted).find(v => v?.text || v?.caption)?.text) || (Object.values(ctx.quoted).find(v => v?.text || v?.caption)?.caption))) || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            `${formatter.quote(tools.msg.generateCmdExample(ctx.used, "apa itu bot whatsapp?"))}\n` +
            formatter.quote(tools.msg.generateNotes(["AI ini dapat melihat gambar dan menjawab pertanyaan tentang gambar tersebut.", "Balas atau quote pesan untuk menjadikan teks sebagai input target, jika teks memerlukan baris baru."]))
        );

        const messageType = ctx.getMessageType();
        const [checkMedia, checkQuotedMedia] = await Promise.all([
            tools.cmd.checkMedia(messageType, "image"),
            tools.cmd.checkQuotedMedia(ctx?.quoted, "image")
        ]);

        try {
            const senderId = ctx.getId(ctx.sender.jid);
            const user = await prisma.user.findUnique({
                where: { phoneNumber: senderId }
            });

            if (checkMedia || checkQuotedMedia) {
                const buffer = await ctx.msg.media.toBuffer() || await ctx.quoted.media.toBuffer();
                const uploadUrl = await tools.cmd.upload(buffer, "image");
                const apiUrl = tools.api.createUrl("nekorinn", "/ai/blackbox", {
                    text: input,
                    imageUrl: uploadUrl
                });
                const result = (await axios.get(apiUrl)).data.result;

                return await ctx.reply(result);
            } else {
                const apiUrl = tools.api.createUrl("nekorinn", "/ai/blackbox", {
                    text: input,
                    sessionid: user?.username || "guest"
                });
                const result = (await axios.get(apiUrl)).data.result;

                return await ctx.reply(result);
            }
        } catch (error) {
            return await tools.cmd.handleError(ctx, error, true);
        }
    }
};