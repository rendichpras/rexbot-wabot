// Impor modul dan dependensi yang diperlukan
const {
    Events,
    VCardBuilder
} = require("@itsreimau/gktw");
const axios = require("axios");
const moment = require("moment-timezone");
const prisma = require('../lib/prisma');

// Fungsi untuk menangani event pengguna bergabung/keluar grup
async function handleWelcome(bot, m, type, isSimulate = false) {
    const groupJid = m.id;
    const groupId = bot.getId(m.id);
    
    const [groupDb, botDb] = await Promise.all([
        prisma.group.findUnique({ where: { id: groupId } }),
        prisma.bot.findUnique({ where: { id: 'bot' } })
    ]);

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
                formatter.quote(`🎉 Selamat datang ${userTag} di grup ${metadata.subject}`) :
                formatter.quote(`👋 Terima kasih ${userTag} telah menjadi bagian dari grup ini`));
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
            quoted: tools.cmd.fakeMetaAiQuotedText("Silakan perkenalkan diri Anda kepada anggota grup")
        });
    }
}

// Fungsi untuk menambahkan warning
async function addWarning(ctx, groupDb, senderJid, groupId) {
    const senderId = ctx.getId(senderJid);
    const maxwarnings = groupDb?.maxwarnings || 3;
    const warnings = groupDb?.warnings || {};
    const current = warnings[senderId] || 0;
    const newWarning = current + 1;
    
    warnings[senderId] = newWarning;

    await prisma.group.update({
        where: { id: groupId },
        data: { warnings }
    });

    await ctx.reply({
        text: formatter.quote(`⚠️ Peringatan ${newWarning}/${maxwarnings} untuk @${senderId}`),
        mentions: [senderJid]
    });

    if (newWarning >= maxwarnings) {
        await ctx.reply(formatter.quote(`🚫 Anda telah mencapai batas maksimal ${maxwarnings} peringatan dan akan dikeluarkan dari grup`));
        if (!config.system.restrict) await ctx.group().kick([senderJid]);
        delete warnings[senderId];
        await prisma.group.update({
            where: { id: groupId },
            data: { warnings }
        });
    }
}

// Events utama bot
module.exports = (bot) => {
    bot.ev.setMaxListeners(config.system.maxListeners); // Tetapkan max listeners untuk events

    // Event saat bot siap
    bot.ev.once(Events.ClientReady, async (m) => {
        consolefy.success(`${config.bot.name} oleh ${config.owner.name}, siap digunakan pada ${m.user.id}`);

        // Mulai ulang bot
        const botDb = await prisma.bot.findUnique({ 
            where: { id: 'bot' },
            select: { restart: true }
        });
        
        if (botDb?.restart?.jid && botDb?.restart?.timestamp) {
            const timeago = tools.msg.convertMsToDuration(Date.now() - botDb.restart.timestamp);
            await bot.core.sendMessage(botDb.restart.jid, {
                text: formatter.quote(`✅ Sistem berhasil dimulai ulang dalam waktu ${timeago}`),
                edit: botDb.restart.key
            });
            
            await prisma.bot.update({
                where: { id: 'bot' },
                data: { restart: null }
            });
        }

        // Tetapkan config pada bot
        const id = bot.getId(m.user.id);
        config.bot = {
            ...config.bot,
            id,
            jid: m.user.id,
            decodedJid: `${id}@s.whatsapp.net`,
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
        const [botDb, userDb, groupDb] = await Promise.all([
            prisma.bot.findUnique({ where: { id: 'bot' } }),
            prisma.user.findUnique({ where: { phoneNumber: senderId } }),
            isGroup ? prisma.group.findUnique({ where: { id: groupId } }) : null
        ]);

        // Pengecekan mode bot
        if (groupDb?.mutebot === true && !isOwner && !await ctx.group().isSenderAdmin()) return;
        if (groupDb?.mutebot === "owner" && !isOwner) return;
        if (botDb?.mode === "group" && isPrivate && !isOwner && !userDb?.premium) return;
        if (botDb?.mode === "private" && isGroup && !isOwner && !userDb?.premium) return;
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

            config.bot.uptime = tools.msg.convertMsToDuration(Date.now() - config.bot.readyAt); // Penangan pada uptime

            // Penanganan database pengguna
            if (userDb) {
                if (isOwner || userDb?.premium) {
                    await prisma.user.update({
                        where: { phoneNumber: senderId },
                        data: { coin: 0 }
                    });
                }
                if (userDb?.coin === undefined || !Number.isFinite(userDb.coin)) {
                    await prisma.user.update({
                        where: { phoneNumber: senderId },
                        data: { coin: 500 }
                    });
                }
                if (!userDb?.username) {
                    await prisma.user.update({
                        where: { phoneNumber: senderId },
                        data: { username: `@user_${senderId.slice(-6)}` }
                    });
                }
                if (userDb?.premium && Date.now() > userDb.premiumExpiration) {
                    await prisma.user.update({
                        where: { phoneNumber: senderId },
                        data: {
                            premium: false,
                            premiumExpiration: null
                        }
                    });
                }
            }

             // Did you mean?
             if (isCmd?.didyoumean) await ctx.reply({
                text: formatter.quote(`🧐 Apakah maksud Anda ${formatter.monospace(isCmd.prefix + isCmd.didyoumean)}?`),
                footer: config.msg.footer,
                buttons: [{
                    buttonId: `${isCmd.prefix + isCmd.didyoumean} ${isCmd.input}`,
                    buttonText: {
                        displayText: "Ya, benar!"
                    },
                    type: 1
                }],
                headerType: 1
            });

            // Penanganan AFK
            if (userDb?.afk?.reason || userDb?.afk?.timestamp) {
                const timeElapsed = Date.now() - userDb.afk.timestamp;
                if (timeElapsed > 3000) {
                    const timeago = tools.msg.convertMsToDuration(timeElapsed);
                    await ctx.reply(formatter.quote(`📱 Anda telah kembali dari status AFK ${userDb.afk.reason ? `dengan alasan "${userDb.afk.reason}"` : "tanpa keterangan"} setelah ${timeago}`));
                    await prisma.user.update({
                        where: { phoneNumber: senderId },
                        data: { afk: null }
                    });
                }
            }
        }

        // Penanganan obrolan grup
        if (isGroup) {
            if (m.key.fromMe) return;

            consolefy.info(`Pesan masuk dari grup: ${groupId}, pengirim: ${senderId}`);

            // Pengecekan sewa grup
            if (groupDb?.sewa && groupDb.sewaExpiration && Date.now() > Number(groupDb.sewaExpiration)) {
                await prisma.group.update({
                    where: { id: groupId },
                    data: {
                        sewa: false,
                        sewaExpiration: null
                    }
                });
            }

            // Penanganan AFK (Pengguna yang disebutkan atau di-balas/quote)
            const userMentions = ctx?.quoted?.senderJid ? [ctx.getId(ctx?.quoted?.senderJid)] : m.message?.[ctx.getMessageType()]?.contextInfo?.mentionedJid?.map((jid) => ctx.getId(jid)) || [];
            if (userMentions.length > 0) {
                const mentionedUsers = await prisma.user.findMany({
                    where: {
                        phoneNumber: { in: userMentions },
                        afk: { not: null }
                    }
                });

                for (const user of mentionedUsers) {
                    if (user.afk?.reason || user.afk?.timestamp) {
                        const timeago = tools.msg.convertMsToDuration(Date.now() - user.afk.timestamp);
                        await ctx.reply(formatter.quote(`📴 Mohon maaf, pengguna sedang AFK ${user.afk.reason ? `dengan alasan "${user.afk.reason}"` : "tanpa keterangan"} selama ${timeago}`));
                    }
                }
            }

            // Penanganan antimedia
            for (const type of ["audio", "document", "gif", "image", "sticker", "video"]) {
                if (groupDb?.option?.[`anti${type}`] && !isOwner && !await ctx.group().isSenderAdmin() && !isCmd) {
                    const checkMedia = await tools.cmd.checkMedia(ctx.getMessageType(), type);
                    if (checkMedia) {
                        await ctx.reply(formatter.quote(`🚫 Mohon maaf, pengiriman ${type} tidak diizinkan dalam grup ini`));
                        await ctx.deleteMessage(m.key);
                        if (groupDb?.option?.autokick) {
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
                    await ctx.reply(formatter.quote("🔗 Mohon maaf, pengiriman tautan tidak diizinkan dalam grup ini"));
                    await ctx.deleteMessage(m.key);
                    if (groupDb?.option?.autokick) {
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
                        await ctx.reply(formatter.quote("🔞 Mohon maaf, konten NSFW tidak diizinkan dalam grup ini"));
                        await ctx.deleteMessage(m.key);
                        if (groupDb?.option?.autokick) {
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
                const spamData = groupDb?.spam || {};
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

                await prisma.group.update({
                    where: { id: groupId },
                    data: { spam: spamData }
                });

                if (newCount > 5) {
                    await ctx.reply(formatter.quote("⚠️ Mohon kurangi frekuensi pengiriman pesan untuk menghindari spam"));
                    await ctx.deleteMessage(m.key);
                    if (groupDb?.option?.autokick) {
                        await ctx.group().kick([senderJid]);
                    } else {
                        await addWarning(ctx, groupDb, senderJid, groupId);
                    }
                    delete spamData[senderId];
                    await prisma.group.update({
                        where: { id: groupId },
                        data: { spam: spamData }
                    });
                }
            }

            // Penanganan antitagsw
            if (groupDb?.option?.antitagsw && !isOwner && !await ctx.group().isSenderAdmin() && !isCmd) {
                const checkMedia = await tools.cmd.checkMedia(ctx.getMessageType(), "groupStatusMention") && m.message?.groupStatusMentionMessage?.protocolMessage?.type === 25;
                if (checkMedia) {
                    await ctx.reply(formatter.quote(`🚫 Mohon tidak menandai grup dalam status WhatsApp`));
                    await ctx.deleteMessage(m.key);
                    if (groupDb?.option?.autokick) {
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
                    await ctx.reply(formatter.quote("🚫 Mohon gunakan bahasa yang sopan dalam grup ini"));
                    await ctx.deleteMessage(m.key);
                    if (groupDb?.option?.autokick) {
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

            consolefy.info(`Pesan masuk dari: ${senderId}`);

            // Penanganan menfess
            if (!isCmd || isCmd?.didyoumean) {
                const activeMenfess = await prisma.menfess.findMany({
                    where: {
                        OR: [
                            { fromNumber: senderId },
                            { toNumber: senderId }
                        ],
                        active: true
                    }
                });

                for (const menfess of activeMenfess) {
                    const targetNumber = senderId === menfess.fromNumber ? menfess.toNumber : menfess.fromNumber;
                    const targetId = `${targetNumber}@s.whatsapp.net`;

                    if (m.content === "delete") {
                        const replyText = formatter.quote("✅ Sesi menfess telah diakhiri");
                        await Promise.all([
                            ctx.reply(replyText),
                            ctx.sendMessage(targetId, { text: replyText }),
                            prisma.menfess.update({
                                where: { id: menfess.id },
                                data: { active: false }
                            })
                        ]);
                    } else {
                        await ctx.core.sendMessage(targetId, {
                            forward: m
                        });
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
                quoted: tools.cmd.fakeMetaAiQuotedText(`Mohon maaf, bot tidak dapat menerima panggilan ${call.isVideo ? "video" : "suara"}. Silakan hubungi Administrator untuk bantuan lebih lanjut.`)
            });
        }
    });

    // Event saat pengguna bergabung atau keluar dari grup
    bot.ev.on(Events.UserJoin, async (m) => handleWelcome(bot, m, Events.UserJoin));
    bot.ev.on(Events.UserLeave, async (m) => handleWelcome(bot, m, Events.UserLeave));
};
module.exports.handleWelcome = handleWelcome; // Penanganan event pengguna bergabung/keluar grup