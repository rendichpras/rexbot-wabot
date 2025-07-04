const {
    exec
} = require("node:child_process");
const process = require("node:process");
const util = require("node:util");
const prisma = require("../../lib/prisma");

module.exports = {
    name: "restart",
    aliases: ["r"],
    category: "owner",
    permissions: {
        owner: true
    },
    code: async (ctx) => {
        if (!process.env.PM2_HOME) return await ctx.reply(formatter.quote("❎ Bot tidak berjalan di bawah PM2! Restart manual diperlukan."));

        try {
            const waitMsg = await ctx.reply(config.msg.wait);
            
            // Simpan informasi restart di database
            await prisma.bot.upsert({
                where: { id: "bot" },
                create: {
                    id: "bot",
                    restart: {
                        jid: ctx.id,
                        key: waitMsg.key,
                        timestamp: Date.now()
                    }
                },
                update: {
                    restart: {
                        jid: ctx.id,
                        key: waitMsg.key,
                        timestamp: Date.now()
                    }
                }
            });

            return await util.promisify(exec)("pm2 restart $(basename $(pwd))"); // Hanya berfungsi saat menggunakan PM2
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};