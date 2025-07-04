const prisma = require("../../lib/prisma");

module.exports = {
    name: "donate",
    aliases: ["donasi"],
    category: "information",
    code: async (ctx) => {
        try {
            const botSettings = await prisma.bot.findUnique({
                where: { id: "bot" },
                select: { settings: true }
            });

            const customText = botSettings?.settings?.donate || null;
            const text = customText ?
                customText
                .replace(/%tag%/g, `@${ctx.getId(ctx.sender.jid)}`)
                .replace(/%name%/g, config.bot.name)
                .replace(/%prefix%/g, ctx.used.prefix)
                .replace(/%command%/g, ctx.used.command)
                .replace(/%footer%/g, config.msg.footer)
                .replace(/%readmore%/g, config.msg.readmore) :
                `${formatter.quote("081585030507 (DANA)")}\n` +
                `${formatter.quote("─────")}\n` +
                `${formatter.quote("https://paypal.me/rendichpras (PayPal)")}\n` +
                `${formatter.quote("https://saweria.co/rexbot-wabot (Saweria)")}\n` +
                `${formatter.quote("https://trakteer.id/rexbot-wabot (Trakteer)")}\n` +
                "\n" +
                config.msg.footer;

            return await ctx.reply({
                text: text,
                mentions: [ctx.sender.jid]
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};