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
            formatter.quote(tools.msg.generateNotes(["Balas atau quote pesan untuk menjadikan teks sebagai input target, jika teks memerlukan baris baru.", `Gunakan ${formatter.monospace("blacklist")} untuk memasukkan grup ke dalam blacklist. (Hanya berfungsi pada grup)`]))
        );

        if (["b", "blacklist"].includes(input) && ctx.isGroup()) {
            let blacklist = await db.get("bot.blacklistBroadcast") || [];

            const groupIndex = blacklist.indexOf(ctx.id);
            if (groupIndex > -1) {
                blacklist.splice(groupIndex, 1);
                await db.set("bot.blacklistBroadcast", blacklist);
                return await ctx.reply("✅ Grup ini telah dihapus dari blacklist broadcast");
            } else {
                blacklist.push(ctx.id);
                await db.set("bot.blacklistBroadcast", blacklist);
                return await ctx.reply("✅ Grup ini telah ditambahkan ke blacklist broadcast");
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
            const blacklist = await db.get("bot.blacklistBroadcast") || [];
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