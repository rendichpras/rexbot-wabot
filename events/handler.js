// Impor modul dan dependensi yang diperlukan
const {
    Events,
    VCardBuilder
} = require("@itsreimau/gktw");
const axios = require("axios");
const fs = require("node:fs");
const moment = require("moment-timezone");

// Fungsi untuk menangani event pengguna bergabung/keluar grup
async function handleWelcome(bot, m, type, isSimulate = false) {
    const groupJid = m.id;
    const groupId = bot.getId(m.id);
    const groupDb = await db.get(`group.${groupId}`) || {};
    const botDb = await db.get("bot") || {};

    if (!isSimulate && groupDb?.mutebot) return;
    if (!isSimulate && !groupDb?.option?.welcome) return;
    if (!isSimulate && ["private", "self"].includes(botDb?.mode)) return;
    const now = moment().tz(config.system.timeZone);
    const hour = now.hour();
    if (!isSimulate && hour >= 0 && hour < 6) return;

    for (const jid of m.participants) {
        const isWelcome = type === Events.UserJoin;
        const userTag = `@${bot.getId(jid)}`;
        const customText = isWelcome ? groupDb?.text?.welcome : groupDb?.text?.goodbye;
        const metadata = await bot.core.groupMetadata(groupJid);
        const text = customText ?
            customText
            .replace(/%tag%/g, userTag)
            .replace(/%subject%/g, metadata.subject)
            .replace(/%description%/g, metadata.description) :
            (isWelcome ?
                formatter.quote(`👋 Selamat datang ${userTag} di grup ${metadata.subject}!`) :
                formatter.quote(`👋 Selamat tinggal, ${userTag}!`));
        const profilePictureUrl = await bot.core.profilePictureUrl(jid, "image").catch(() => "https://i.pinimg.com/736x/70/dd/61/70dd612c65034b88ebf474a52ccc70c4.jpg");

        await bot.core.sendMessage(groupJid, {
            text,
            contextInfo: {
                mentionedJid: [jid],
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.bot.newsletterJid,
                    newsletterName: config.bot.name
                },
                externalAdReply: {
                    title: config.bot.name,
                    body: config.bot.version,
                    mediaType: 1,
                    thumbnailUrl: profilePictureUrl
                }
            }
        }, {
            quoted: tools.cmd.fakeMetaAiQuotedText(`Event: ${type}`)
        });

        if (isWelcome && groupDb?.text?.intro) await bot.core.sendMessage(groupJid, {
            text: groupDb.text.intro,
            mentions: [jid]
        }, {
            quoted: tools.cmd.fakeMetaAiQuotedText("Jangan lupa untuk mengisi intro!")
        });
    }
}

// Fungsi untuk menambahkan warning
async function addWarning(ctx, groupDb, senderJid, groupId) {
    const senderId = ctx.getId(senderJid);

    const warnings = groupDb?.warnings || {};
    const maxwarnings = groupDb?.maxwarnings || 3;
    const current = warnings[senderId] || 0;
    const newWarning = current + 1;
    warnings[senderId] = newWarning;

    await db.set(`group.${groupId}.warnings`, warnings);
    await ctx.reply({
        text: formatter.quote(`⚠️ Warning ${newWarning}/${maxwarnings} untuk @${senderId}!`),
        mentions: [senderJid]
    });

    if (newWarning >= maxwarnings) {
        await ctx.reply(formatter.quote(`⛔ Kamu telah menerima ${maxwarnings} warning dan akan dikeluarkan dari grup!`));
        if (!config.system.restrict) await ctx.group().kick([senderJid]);
        delete groupDb.warnings[senderId];
        await db.set(`group.${groupId}`, groupDb);
    }
}

// Events utama bot
module.exports = (bot) => {
    bot.ev.setMaxListeners(config.system.maxListeners); // Tetapkan max listeners untuk events

    // Event saat bot siap
    bot.ev.once(Events.ClientReady, async (m) => {
        consolefy.success(`${config.bot.name} by ${config.owner.name}, ready at ${m.user.id}`);

        // Mulai ulang bot
        const botRestart = await db.get("bot.restart") || {};
        if (botRestart?.jid && botRestart?.timestamp) {
            const timeago = tools.msg.convertMsToDuration(Date.now() - botRestart.timestamp);
            await bot.core.sendMessage(botRestart.jid, {
                text: formatter.quote(`✅ Berhasil dimulai ulang! Membutuhkan waktu ${timeago}.`),
                edit: botRestart.key
            });
            await db.delete("bot.restart");
        }

        // Tetapkan config pada bot
        const id = bot.getId(m.user.id);
        config.bot = {
            ...config.bot,
            id,
            jid: `${id}@s.whatsapp.net`,
            readyAt: bot.readyAt,
            groupLink: await bot.core.groupInviteCode(config.bot.groupJid).then(code => `https://chat.whatsapp.com/${code}`).catch(() => "https://chat.whatsapp.com/FxEYZl2UyzAEI2yhaH34Ye")
        };
    });

    // Event saat bot menerima pesan
    bot.ev.on(Events.MessagesUpsert, async (m, ctx) => {
        // Variabel umum
        const isGroup = ctx.isGroup();
        const isPrivate = !isGroup;
        const senderJid = ctx.sender.jid;
        const senderId = ctx.getId(senderJid);
        const groupJid = isGroup ? ctx.id : null;
        const groupId = isGroup ? ctx.getId(groupJid) : null;
        const isOwner = tools.cmd.isOwner(senderId, m.key.id);
        const isCmd = tools.cmd.isCmd(m.content, ctx.bot);

        // Mengambil database
        const botDb = await db.get("bot") || {};
        const userDb = await db.get(`user.${senderId}`) || {};
        const groupDb = await db.get(`group.${groupId}`) || {};

        // Pengecekan mode bot (group, private, self)
        if (groupDb?.mutebot === true && !isOwner && !await ctx.group().isSenderAdmin()) return;
        if (groupDb?.mutebot === "owner" && !isOwner) return;
        if (botDb?.mode === "group" && isPrivate && !isOwner) return;
        if (botDb?.mode === "private" && isGroup && !isOwner) return;
        if (botDb?.mode === "self" && !isOwner) return;

        // Pengecekan untuk tidak tersedia pada malam hari
        const now = moment().tz(config.system.timeZone);
        const hour = now.hour();
        if (hour >= 0 && hour < 6 && !isOwner && !userDb?.premium) return;

        // Pengecekan mute pada grup
        const muteList = groupDb?.mute || [];
        if (muteList.includes(senderId)) await ctx.deleteMessage(m.key);

        // Grup atau Pribadi
        if (isGroup || isPrivate) {
            if (m.key.fromMe) return;

            config.bot.dbSize = fs.existsSync("database.json") ? tools.msg.formatSize(fs.statSync("database.json").size / 1024) : "N/A"; // Penangan pada ukuran database
            config.bot.uptime = tools.msg.convertMsToDuration(Date.now() - config.bot.readyAt); // Penangan pada uptime

            // Penanganan database pengguna
            if (isOwner || userDb?.premium) db.set(`user.${senderId}.coin`, 0);
            if (userDb?.coin === undefined || !Number.isFinite(userDb.coin)) db.set(`user.${senderId}.coin`, 500);
            if (!userDb?.uid || userDb?.uid !== tools.cmd.generateUID(senderId)) db.set(`user.${senderId}.uid`, tools.cmd.generateUID(senderId));
            if (!userDb?.username) db.set(`user.${senderId}.username`, `@user_${tools.cmd.generateUID(senderId, false)}`);
            if (userDb?.premium && Date.now() > userDb.premiumExpiration) {
                await db.delete(`user.${senderId}.premium`);
                await db.delete(`user.${senderId}.premiumExpiration`);
            }

            if (isCmd?.didyoumean) await ctx.reply(formatter.quote(`❎ Kamu salah ketik, sepertinya ${formatter.monospace(isCmd.prefix + isCmd.didyoumean)}.`)); // Did you mean?

            // Penanganan AFK (Menghapus status AFK pengguna yang mengirim pesan)
            const userAfk = userDb?.afk || {};
            if (userAfk.reason || userAfk.timestamp) {
                const timeElapsed = Date.now() - userAfk.timestamp;
                if (timeElapsed > 3000) {
                    const timeago = tools.msg.convertMsToDuration(timeElapsed);
                    await ctx.reply(formatter.quote(`📴 Kamu telah keluar dari AFK ${userAfk.reason ? `dengan alasan "${userAfk.reason}"` : "tanpa alasan"} selama ${timeago}.`));
                    await db.delete(`user.${senderId}.afk`);
                }
            }
        }

        // Penanganan obrolan grup
        if (isGroup) {
            if (m.key.fromMe) return;

            consolefy.info(`Incoming message from group: ${groupId}, by: ${senderId}`) // Log pesan masuk

            // Variabel umum
            const groupAutokick = groupDb?.option?.autokick;

            // Penanganan database grup
            if (groupDb?.sewa && Date.now() > userDb?.sewaExpiration) {
                await db.delete(`group.${groupId}.sewa`);
                await db.delete(`group.${groupId}.sewaExpiration`);
            }

            // Penanganan AFK (Pengguna yang disebutkan atau di-balas/quote)
            const userMentions = ctx?.quoted?.senderJid ? [ctx.getId(ctx?.quoted?.senderJid)] : m.message?.[ctx.getMessageType()]?.contextInfo?.mentionedJid?.map((jid) => ctx.getId(jid)) || [];
            if (userMentions.length > 0) {
                for (const userMention of userMentions) {
                    const userMentionAfk = await db.get(`user.${userMention}.afk`) || {};
                    if (userMentionAfk.reason || userMentionAfk.timestamp) {
                        const timeago = tools.msg.convertMsToDuration(Date.now() - userMentionAfk.timestamp);
                        await ctx.reply(formatter.quote(`📴 Jangan tag! Dia sedang AFK ${userMentionAfk.reason ? `dengan alasan "${userMentionAfk.reason}"` : "tanpa alasan"} selama ${timeago}.`));
                    }
                }
            }

            // Penanganan antimedia
            for (const type of ["audio", "document", "gif", "image", "sticker", "video"]) {
                if (groupDb?.option?.[`anti${type}`] && !isOwner && !await ctx.group().isSenderAdmin() && !isCmd) {
                    const checkMedia = await tools.cmd.checkMedia(ctx.getMessageType(), type);
                    if (checkMedia) {
                        await ctx.reply(formatter.quote(`⛔ Jangan kirim ${type}!`));
                        await ctx.deleteMessage(m.key);
                        if (groupAutokick) {
                            await ctx.group().kick([senderJid]);
                        } else {
                            await addWarning(ctx, groupDb, senderJid, groupId);
                        }
                    }
                }
            }

            // Penanganan antilink
            if (groupDb?.option?.antilink && !isOwner && !await ctx.group().isSenderAdmin() && !isCmd) {
                if (m.content && await tools.cmd.isUrl(m.content)) {
                    await ctx.reply(formatter.quote("⛔ Jangan kirim link!"));
                    await ctx.deleteMessage(m.key);
                    if (groupAutokick) {
                        await ctx.group().kick([senderJid]);
                    } else {
                        await addWarning(ctx, groupDb, senderJid, groupId);
                    }
                }
            }

            // Penanganan antinsfw
            if (groupDb?.option?.antinsfw && !isOwner && !await ctx.group().isSenderAdmin() && !isCmd) {
                const checkMedia = await tools.cmd.checkMedia(ctx.getMessageType(), "image");
                if (checkMedia) {
                    const buffer = await ctx.msg.media.toBuffer();
                    const uploadUrl = await tools.cmd.upload(buffer, "image");
                    const apiUrl = tools.api.createUrl("nekorinn", "/tools/nsfw-checker", {
                        imageUrl: uploadUrl
                    });
                    const result = (await axios.get(apiUrl)).data.result.labelName.toLowerCase();

                    if (result.nsfw === "porn") {
                        await ctx.reply(formatter.quote("⛔ Jangan kirim NSFW, dasar cabul!"));
                        await ctx.deleteMessage(m.key);
                        if (groupAutokick) {
                            await ctx.group().kick([senderJid]);
                        } else {
                            await addWarning(ctx, groupDb, senderJid, groupId);
                        }
                    }
                }
            }

            // Penanganan antispam
            if (groupDb?.option?.antispam && !isOwner && !await ctx.group().isSenderAdmin() && !isCmd) {
                const now = Date.now();
                const spamData = await db.get(`group.${groupId}.spam`) || {};
                const data = spamData[senderId] || {
                    count: 0,
                    lastMessageTime: 0
                };

                const timeDiff = now - data.lastMessageTime;
                const newCount = timeDiff < 5000 ? data.count + 1 : 1;

                spamData[senderId] = {
                    count: newCount,
                    lastMessageTime: now
                };

                await db.set(`group.${groupId}.spam`, spamData);

                if (newCount > 5) {
                    await ctx.reply(formatter.quote("⛔ Jangan spam, ngelag woy!"));
                    await ctx.deleteMessage(m.key);
                    if (groupAutokick) {
                        await ctx.group().kick([senderJid]);
                    } else {
                        await addWarning(ctx, groupDb, senderJid, groupId);
                    }
                    delete spamData[senderId];
                    await db.set(`group.${groupId}.spam`, spamData);
                }
            }

            // Penanganan antitagsw
            if (groupDb?.option?.antitagsw && !isOwner && !await ctx.group().isSenderAdmin() && !isCmd) {
                const checkMedia = await tools.cmd.checkMedia(ctx.getMessageType(), "groupStatusMention") && m.message?.groupStatusMentionMessage?.protocolMessage?.type === 25;
                if (checkMedia) {
                    await ctx.reply(formatter.quote(`⛔ Jangan tag grup di SW, gak ada yg peduli!`));
                    await ctx.deleteMessage(m.key);
                    if (groupAutokick) {
                        await ctx.group().kick([senderJid]);
                    } else {
                        await addWarning(ctx, groupDb, senderJid, groupId);
                    }
                }
            }

            // Penanganan antitoxic
            if (groupDb?.option?.antitoxic && !isOwner && !await ctx.group().isSenderAdmin() && !isCmd) {
                const toxicRegex = /anj(k|g)|ajn?(g|k)|a?njin(g|k)|bajingan|b(a?n)?gsa?t|ko?nto?l|me?me?(k|q)|pe?pe?(k|q)|meki|titi(t|d)|pe?ler|tetek|toket|ngewe|go?blo?k|to?lo?l|idiot|(k|ng)e?nto?(t|d)|jembut|bego|dajj?al|janc(u|o)k|pantek|puki ?(mak)?|kimak|kampang|lonte|col(i|mek?)|pelacur|henceu?t|nigga|fuck|dick|bitch|tits|bastard|asshole|dontol|kontoi|ontol/i;
                if (m.content && toxicRegex.test(m.content)) {
                    await ctx.reply(formatter.quote("⛔ Jangan toxic!"));
                    await ctx.deleteMessage(m.key);
                    if (groupAutokick) {
                        await ctx.group().kick([senderJid]);
                    } else {
                        await addWarning(ctx, groupDb, senderJid, groupId);
                    }
                }
            }
        }

        // Penanganan obrolan pribadi
        if (isPrivate) {
            if (m.key.fromMe) return;

            consolefy.info(`Incoming message from: ${senderId}`); // Log pesan masuk

            // Penanganan menfess
            const allMenfessDb = await db.get("menfess") || {};
            if (!isCmd || isCmd?.didyoumean) {
                for (const [conversationId, {
                        from,
                        to
                    }] of Object.entries(allMenfessDb)) {
                    if (senderId === from || senderId === to) {
                        const targetId = `${senderId === from ? to : from}@s.whatsapp.net`;

                        if (m.content?.match(/\b(d|s|delete|stop)\b/i)) {
                            const replyText = formatter.quote("✅ Sesi menfess telah dihapus!");
                            await ctx.reply(replyText);
                            await ctx.sendMessage(targetId, {
                                text: replyText
                            });
                            await db.delete(`menfess.${conversationId}`);
                        } else {
                            await ctx.core.sendMessage(targetId, {
                                forward: m
                            });
                        }
                    }
                }
            }
        }
    });

    // Event saat bot menerima panggilan
    bot.ev.on(Events.Call, async (calls) => {
        if (!config.system.antiCall) return;

        for (const call of calls) {
            if (call.status !== "offer") continue;

            await bot.core.rejectCall(call.id, call.from);

            const vcard = new VCardBuilder()
                .setFullName(config.owner.name)
                .setOrg(config.owner.organization)
                .setNumber(config.owner.id)
                .build();
            return await bot.core.sendMessage(call.from, {
                contacts: {
                    displayName: config.owner.name,
                    contacts: [{
                        vcard
                    }]
                }
            }, {
                quoted: tools.cmd.fakeMetaAiQuotedText(`Bot tidak dapat menerima panggilan ${call.isVideo ? "video" : "suara"}! Jika kamu memerlukan bantuan, silakan menghubungi Owner.`)
            });
        }
    });

    // Event saat pengguna bergabung atau keluar dari grup
    bot.ev.on(Events.UserJoin, async (m) => handleWelcome(bot, m, Events.UserJoin));
    bot.ev.on(Events.UserLeave, async (m) => handleWelcome(bot, m, Events.UserLeave));
};
module.exports.handleWelcome = handleWelcome; // Penanganan event pengguna bergabung/keluar grup