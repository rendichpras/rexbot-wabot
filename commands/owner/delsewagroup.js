const prisma = require("../../lib/prisma");

module.exports = {
    name: "delsewagroup",
    aliases: ["delsewa", "delsewagrup", "dsg"],
    category: "owner",
    permissions: {
        owner: true
    },
    code: async (ctx) => {
        const groupJid = ctx.isGroup() ? ctx.id : (ctx.args[0] ? `${ctx.args[0].replace(/[^\d]/g, "")}@g.us` : null);

        if (!groupJid) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            `${formatter.quote(tools.msg.generateCmdExample(ctx.used, "1234567890 30"))}\n` +
            `${formatter.quote(tools.msg.generateNotes(["Gunakan di grup untuk otomatis menyewakan grup tersebut."]))}\n` +
            formatter.quote(tools.msg.generatesFlagInfo({
                "-s": "Tidak mengirimkan notifikasi kepada pengguna yang bersangkutan"
            }))
        );

        const group = await ctx.group(groupJid);
        if (!group) return await ctx.reply(formatter.quote("❎ Grup tidak valid atau bot tidak ada di grup tersebut!"));

        try {
            const groupId = ctx.getId(groupJid);
            const flag = tools.cmd.parseFlag(ctx.args.join(" "), {
                "-s": {
                    type: "boolean",
                    key: "silent"
                }
            });

            const silent = flag?.silent || false;
            const group = await ctx.group(groupJid);
            const groupOwner = await group.owner();

            // Update grup untuk menghapus status sewa
            await prisma.group.update({
                where: {
                    id: groupId
                },
                data: {
                    sewa: false,
                    sewaExpiration: null
                }
            });

            if (!silent && groupOwner) {
                const groupMentions = [{
                    groupJid: `${group.id}@g.us`,
                    groupSubject: await group.name()
                }];
                await ctx.sendMessage(groupOwner, {
                    text: formatter.quote(`📢 Sewa bot untuk grup @${groupMentions.groupJid} telah dihentikan oleh Owner!`),
                    contextInfo: {
                        groupMentions
                    }
                });
            }

            return await ctx.reply(formatter.quote(`✅ Berhasil menghapus sewa bot untuk grup ini!`));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};