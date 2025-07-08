const prisma = require("../../lib/prisma");

module.exports = {
    name: "fixdb",
    aliases: ["fixdatabase"],
    category: "owner",
    permissions: {
        owner: true
    },
    code: async (ctx) => {
        const input = ctx.args[0] || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            formatter.quote(tools.msg.generateCmdExample(ctx.used, "user")) +
            formatter.quote(tools.msg.generateNotes([`Silakan ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} list`)} untuk menampilkan daftar lengkap.`]))
        );

        if (input.toLowercase() === "list") {
            const listText = await tools.list.get("fixdb");
            return await ctx.reply(listText);
        }

        try {
            const waitMsg = await ctx.reply(config.msg.wait);

            const processUsers = async () => {
                await ctx.editMessage(waitMsg.key, formatter.quote("🔄 Memproses data user..."));
                const users = await prisma.user.findMany();
                
                for (const user of users) {
                    // Validasi dan perbaiki data user
                    const updatedData = {
                        phoneNumber: user.phoneNumber,
                        username: user.username || "",
                        coin: typeof user.coin === "number" ? user.coin : 0,
                        xp: typeof user.xp === "number" ? user.xp : 0,
                        level: typeof user.level === "number" ? user.level : 0,
                        winGame: typeof user.winGame === "number" ? user.winGame : 0,
                        premium: typeof user.premium === "boolean" ? user.premium : false,
                        premiumExpiration: user.premiumExpiration || null,
                        banned: typeof user.banned === "boolean" ? user.banned : false,
                        autolevelup: typeof user.autolevelup === "boolean" ? user.autolevelup : true
                    };

                    // Update user dengan data yang sudah divalidasi
                    await prisma.user.update({
                        where: { id: user.id },
                        data: updatedData
                    });
                }
            };

            const processGroups = async () => {
                await ctx.editMessage(waitMsg.key, formatter.quote("🔄 Memproses data group..."));
                const groups = await prisma.group.findMany();
                
                for (const group of groups) {
                    // Validasi dan perbaiki data group
                    const updatedData = {
                        id: group.id,
                        mutebot: group.mutebot || null,
                        mute: Array.isArray(group.mute) ? group.mute : [],
                        sewa: typeof group.sewa === "boolean" ? group.sewa : false,
                        sewaExpiration: group.sewaExpiration || null,
                        option: typeof group.option === "object" ? group.option : {},
                        text: typeof group.text === "object" ? group.text : null,
                        warnings: typeof group.warnings === "object" ? group.warnings : {},
                        maxwarnings: typeof group.maxwarnings === "number" ? group.maxwarnings : 3
                    };

                    // Update group dengan data yang sudah divalidasi
                    await prisma.group.update({
                        where: { id: group.id },
                        data: updatedData
                    });
                }
            };

            const processMenfess = async () => {
                await ctx.editMessage(waitMsg.key, formatter.quote("🔄 Memproses data menfess..."));
                const menfessChats = await prisma.menfess.findMany();
                
                for (const chat of menfessChats) {
                    // Validasi dan perbaiki data menfess
                    const updatedData = {
                        conversationId: chat.conversationId,
                        fromNumber: chat.fromNumber,
                        toNumber: chat.toNumber,
                        active: typeof chat.active === "boolean" ? chat.active : true
                    };

                    // Update menfess dengan data yang sudah divalidasi
                    await prisma.menfess.update({
                        where: { id: chat.id },
                        data: updatedData
                    });
                }
            };

            switch (input) {
                case "user":
                    await processUsers();
                    break;
                case "group":
                    await processGroups();
                    break;
                case "menfess":
                    await processMenfess();
                    break;
                default:
                    return await ctx.reply(formatter.quote(`❎ Key "${input}" tidak valid!`));
            }

            return await ctx.editMessage(waitMsg.key, formatter.quote(`✅ Database berhasil dibersihkan untuk ${input}!`));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};