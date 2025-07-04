const prisma = require("../../lib/prisma");

module.exports = {
    name: "about",
    aliases: ["bot", "infobot"],
    category: "information",
    code: async (ctx) => {
        try {
            const botSettings = await prisma.bot.findUnique({
                where: { id: "bot" }
            }) || {};

            return await ctx.reply({
                text: `${formatter.quote(`👋 Halo! Saya adalah bot WhatsApp bernama ${config.bot.name}, dimiliki oleh ${config.owner.name}. Saya bisa melakukan banyak perintah, seperti membuat stiker, menggunakan AI untuk pekerjaan tertentu, dan beberapa perintah berguna lainnya. Saya di sini untuk menghibur dan menyenangkan kamu!`)}\n` + // Dapat diubah sesuai keinginan
                    `${formatter.quote("─────")}\n` +
                    `${formatter.quote(`Nama Bot: ${config.bot.name}`)}\n` +
                    `${formatter.quote(`Versi: ${config.bot.version}`)}\n` +
                    `${formatter.quote(`Owner: ${config.owner.name}`)}\n` +
                    `${formatter.quote(`Mode: ${tools.msg.ucwords(botSettings?.mode || "public")}`)}\n` +
                    `${formatter.quote(`Bot Uptime: ${config.bot.uptime}`)}\n` +
                    `${formatter.quote(`Database: PostgreSQL (Prisma ORM)`)}\n` +
                    `${formatter.quote("Library: @itsreimau/gktw (Fork of @mengkodingan/ckptw)")}\n` +
                    "\n" +
                    config.msg.footer,
                contextInfo: {
                    externalAdReply: {
                        title: config.bot.name,
                        body: config.bot.version,
                        mediaType: 1,
                        thumbnailUrl: config.bot.thumbnail,
                        renderLargerThumbnail: true
                    }
                }
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};