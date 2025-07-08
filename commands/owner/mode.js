const prisma = require("../../lib/prisma");

module.exports = {
    name: "mode",
    alises: ["m"],
    category: "owner",
    permissions: {
        owner: true
    },
    code: async (ctx) => {
        const input = ctx.args.join(" ") || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            `${formatter.quote(tools.msg.generateCmdExample(ctx.used, "self"))}\n` +
            formatter.quote(tools.msg.generateNotes([`Silakan ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} list`)} untuk menampilkan daftar lengkap.`]))
        );

        if (input.toLowercase() === "list") {
            const listText = await tools.list.get("mode");
            return await ctx.reply({
                text: listText,
                footer: config.msg.footer,
                interactiveButtons: []
            });
        }

        try {
            const validModes = ["group", "private", "public", "self"];
            const mode = input.toLowerCase();

            if (!validModes.includes(mode)) {
                return await ctx.reply(formatter.quote(`❎ Mode "${input}" tidak valid!`));
            }

            // Update mode bot
            await prisma.bot.upsert({
                where: {
                    id: "bot"
                },
                create: {
                    id: "bot",
                    mode: mode
                },
                update: {
                    mode: mode
                }
            });

            return await ctx.reply(formatter.quote(`✅ Berhasil mengubah mode ke ${mode}!`));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};