const prisma = require("../../lib/prisma");

module.exports = {
    name: "broadcastgc",
    aliases: ["bc", "bcgc", "broadcast"],
    category: "owner",
    permissions: {
        owner: true
    },
    code: async (ctx) => {
        const input = ctx.args.join(" ") || ctx?.quoted?.conversation || (ctx.quoted && ((Object.values(ctx.quoted).find(v => v?.text || v?.caption)?.text) || (Object.values(ctx.quoted).find(v => v?.text || v?.caption)?.caption))) || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            `${formatter.quote(tools.msg.generateCmdExample(ctx.used, "halo, dunia!"))}\n` +
            `${formatter.quote(tools.msg.generatesFlagInfo({
                "-ht": "Kirim dengan hidetag"
            }))}\n` +
            formatter.quote(tools.msg.generateNotes(["Untuk input multi-baris, Anda dapat membalas atau mengutip pesan yang diinginkan.", `Gunakan ${formatter.monospace("blacklist")} untuk memasukkan grup ke dalam blacklist. (Hanya berfungsi pada grup)`]))
        );

        if (input === "blacklist" && ctx.isGroup()) {
            // Ambil data bot yang ada
            const botSettings = await prisma.bot.findUnique({
                where: { id: "bot" },
                select: { settings: true }
            }) || { settings: {} };

            const blacklist = botSettings.settings?.blacklistBroadcast || [];
            const groupId = ctx.getId(ctx.id);

            const groupIndex = blacklist.indexOf(groupId);
            if (groupIndex > -1) {
                // Hapus grup dari blacklist
                blacklist.splice(groupIndex, 1);
                await prisma.bot.update({
                    where: { id: "bot" },
                    data: {
                        settings: {
                            ...botSettings.settings,
                            blacklistBroadcast: blacklist
                        }
                    }
                });
                return await ctx.reply(formatter.quote("✅ Grup ini telah dihapus dari blacklist broadcast"));
            } else {
                // Tambah grup ke blacklist
                await prisma.bot.upsert({
                    where: { id: "bot" },
                    create: {
                        id: "bot",
                        settings: {
                            blacklistBroadcast: [groupId]
                        }
                    },
                    update: {
                        settings: {
                            ...botSettings.settings,
                            blacklistBroadcast: [...blacklist, groupId]
                        }
                    }
                });
                return await ctx.reply(formatter.quote("✅ Grup ini telah ditambahkan ke blacklist broadcast"));
            }
        }

        try {
            const flag = tools.cmd.parseFlag(input, {
                "-ht": {
                    type: "boolean",
                    key: "hidetag"
                }
            });

            const hidetag = flag?.hidetag || false;
            const text = flag?.input;

            const groupIds = Object.values(await ctx.core.groupFetchAllParticipating()).map(g => g.id);
            const botSettings = await prisma.bot.findUnique({
                where: { id: "bot" },
                select: { settings: true }
            }) || { settings: {} };

            const blacklist = botSettings.settings?.blacklistBroadcast || [];
            const filteredGroupIds = groupIds.filter(groupId => !blacklist.includes(groupId));

            const waitMsg = await ctx.reply(formatter.quote(`🔄 Mengirim siaran ke ${filteredGroupIds.length} grup, perkiraan waktu: ${tools.msg.convertMsToDuration(filteredGroupIds.length * 0.5 * 1000)}`));

            const delay = ms => new Promise(res => setTimeout(res, ms));
            const failedGroupIds = [];
            for (const groupId of filteredGroupIds) {
                await delay(500);
                try {
                    let mentions = [];
                    if (hidetag) {
                        const members = await ctx.group(groupId).members();
                        mentions = members.map(m => m.id);
                    }

                    const contextInfo = {
                        mentionedJid: [mentions],
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.bot.newsletterJid,
                            newsletterName: config.bot.name
                        },
                        externalAdReply: {
                            title: config.bot.name,
                            body: config.bot.version,
                            mediaType: 1,
                            thumbnailUrl: config.bot.thumbnail,
                            renderLargerThumbnail: true
                        }
                    };

                    await ctx.sendMessage(groupId, {
                        text,
                        contextInfo
                    }, {
                        quoted: tools.cmd.fakeMetaAiQuotedText(config.msg.footer)
                    });
                } catch (error) {
                    failedGroupIds.push(groupId);
                }
            }
            const successCount = filteredGroupIds.length - failedGroupIds.length;

            return await ctx.editMessage(waitMsg.key, formatter.quote(`✅ Berhasil mengirim ke ${successCount} grup. Gagal mengirim ke ${failedGroupIds.length} grup, ${blacklist.length} grup dalam blacklist tidak dikirim.`));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};