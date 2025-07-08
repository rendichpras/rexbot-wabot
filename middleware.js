// Impor modul dan dependensi yang diperlukan
const {
    Cooldown
} = require("@itsreimau/gktw");
const moment = require("moment-timezone");
const prisma = require('./lib/prisma');

// Fungsi untuk mengecek apakah pengguna memiliki cukup koin sebelum menggunakan perintah tertentu
async function checkCoin(requiredCoin, userDb, senderId, isOwner) {
    if (isOwner || userDb?.premium) return false;
    if (userDb?.coin < requiredCoin) return true;
    
        await prisma.user.update({
            where: { phoneNumber: senderId },
            data: { coin: { decrement: requiredCoin } }
        });
    
    return false;
}

// Middleware utama bot
module.exports = (bot) => {
    bot.use(async (ctx, next) => {
        // Variabel umum
        const isGroup = ctx.isGroup();
        const isPrivate = !isGroup;
        const senderJid = ctx.sender.jid;
        const senderId = ctx.getId(senderJid);
        const groupJid = isGroup ? ctx.id : null;
        const groupId = isGroup ? ctx.getId(groupJid) : null;
        const isOwner = tools.cmd.isOwner(senderId, ctx.msg.key.id);

        // Mengambil data bot, pengguna, dan grup dari database
        const [botDb, userDb, groupDb] = await Promise.all([
            prisma.bot.findUnique({ where: { id: 'bot' } }),
            prisma.user.findUnique({ where: { phoneNumber: senderId } }),
            isGroup ? prisma.group.findUnique({ where: { id: groupId } }) : null
        ]);

        // Buat user baru jika belum ada
        if (!userDb) {
            await prisma.user.create({
                data: {
                    phoneNumber: senderId,
                    username: `@user_${senderId.slice(-6)}`,
                    coin: isOwner ? 0 : 500,
                    xp: 0,
                    level: 1,
                    premium: false,
                    banned: false
                }
            });
        }

        // Pengecekan mode bot (group, private, self)
        if (groupDb?.mutebot === true && !isOwner && !await ctx.group().isSenderAdmin()) return;
        if (groupDb?.mutebot === "owner" && !isOwner) return;
        if (botDb?.mode === "group" && isPrivate && !isOwner && !userDb?.premium) return;
        if (botDb?.mode === "private" && isGroup && !isOwner && !userDb?.premium) return;
        if (botDb?.mode === "self" && !isOwner) return;

        // Pengecekan mute pada grup
        const muteList = groupDb?.mute || [];
        if (muteList.includes(senderId)) return;

        // Menambah XP pengguna dan menangani level-up
        const xpGain = 10;
        const xpToLevelUp = 100;
        let newUserXp = (userDb?.xp || 0) + xpGain;
        if (newUserXp >= xpToLevelUp) {
            let newUserLevel = (userDb?.level || 0) + 1;
            newUserXp -= xpToLevelUp;

            if (userDb?.autolevelup) {
                const profilePictureUrl = await ctx.core.profilePictureUrl(ctx.sender.jid, "image").catch(() => "https://i.pinimg.com/736x/70/dd/61/70dd612c65034b88ebf474a52ccc70c4.jpg");
                await ctx.reply({
                    text: formatter.quote(`🎉 Selamat! Anda telah mencapai level ${newUserLevel}!`),
                    footer: formatter.italic(`Untuk menonaktifkan notifikasi kenaikan level, silakan gunakan perintah ${formatter.monospace(`${ctx.used.prefix}setprofile autolevelup`)}`),
                    footer: config.msg.footer,
                    buttons: [{
                        buttonId: `${ctx.used.prefix}setprofile autolevelup`,
                        buttonText: {
                            displayText: "Nonaktifkan Autolevelup"
                        },
                        type: 1
                    }],
                    headerType: 1
                });
            }

            await prisma.user.update({
                where: { phoneNumber: senderId },
                data: { 
                    xp: newUserXp,
                    level: newUserLevel
                }
            });
        } else {
            await prisma.user.update({
                where: { phoneNumber: senderId },
                data: { xp: newUserXp }
            });
        }

        // Simulasi mengetik jika diaktifkan dalam konfigurasi
        const simulateTyping = async () => {
            if (config.system.autoTypingOnCmd) await ctx.simulateTyping();
        };

        // Pengecekan kondisi restrictions
        const restrictions = [{
                key: "banned",
                condition: userDb?.banned,
                msg: config.msg.banned,
                reaction: "🚫"
            },
            {
                key: "cooldown",
                condition: !isOwner && !userDb?.premium && new Cooldown(ctx, config.system.cooldown).onCooldown,
                msg: config.msg.cooldown,
                reaction: "💤"
            },
            {
                key: "gamerestrict",
                condition: groupDb?.option?.gamerestrict && isGroup && ctx.bot.cmd.has(ctx.used.command) && ctx.bot.cmd.get(ctx.used.command).category === "game",
                msg: config.msg.gamerestrict,
                reaction: "🎮"
            }, {
                key: "requireBotGroupMembership",
                condition: config.system.requireBotGroupMembership && !isOwner && !userDb?.premium && ctx.used.command !== "botgroup" && config.bot.groupJid && !(await ctx.group(config.bot.groupJid).members()).some(member => member.id === senderJid),
                msg: config.msg.botGroupMembership,
                reaction: "🚫"
            },
            {
                key: "requireGroupSewa",
                condition: config.system.requireGroupSewa && isGroup && !isOwner && !["owner", "price"].includes(ctx.used.command) && groupDb?.sewa !== true,
                msg: config.msg.groupSewa,
                reaction: "🔒"
            },
            {
                key: "unavailableAtNight",
                condition: (() => {
                    const now = moment().tz(config.system.timeZone);
                    const hour = now.hour();
                    return config.system.unavailableAtNight && !isOwner && !userDb?.premium && hour >= 0 && hour < 6;
                })(),
                msg: config.msg.unavailableAtNight,
                reaction: "😴"
            }
        ];

        for (const {
                condition,
                msg,
                reaction,
                key
            }
            of restrictions) {
            if (condition) {
                const now = Date.now();
                const lastSentMsg = userDb?.lastSentMsg?.[key] || 0;
                const oneDay = 24 * 60 * 60 * 1000;
                if (!lastSentMsg || (now - lastSentMsg) > oneDay) {
                    await simulateTyping();
                    await ctx.reply({
                        text: msg,
                        footer: formatter.italic(`Untuk pemberitahuan selanjutnya akan ditampilkan dalam bentuk reaksi emoji ${formatter.monospace(reaction)}.`),
                        interactiveButtons: []
                    });
                    
                    await prisma.user.update({
                        where: { phoneNumber: senderId },
                        data: {
                            lastSentMsg: {
                                ...(userDb?.lastSentMsg || {}),
                                [key]: now
                            }
                        }
                    });
                    
                    return;
                } else {
                    return await ctx.react(ctx.id, reaction);
                }
            }
        }

        // Pengecekan kondisi permissions
        const command = [...ctx.bot.cmd.values()].find(cmd => [cmd.name, ...(cmd.aliases || [])].includes(ctx.used.command));
        if (!command) return await next();
        const {
            permissions = {}
        } = command;
        const permissionChecks = [{
                key: "admin",
                condition: isGroup && !await ctx.group().isSenderAdmin(),
                msg: config.msg.admin,
                reaction: "🛡️"
            },
            {
                key: "botAdmin",
                condition: isGroup && !await ctx.group().isBotAdmin(),
                msg: config.msg.botAdmin,
                reaction: "🤖"
            },
            {
                key: "coin",
                condition: permissions.coin && config.system.useCoin && await checkCoin(permissions.coin, userDb, senderId, isOwner),
                msg: config.msg.coin,
                reaction: "💰"
            },
            {
                key: "group",
                condition: isPrivate,
                msg: config.msg.group,
                reaction: "👥"
            },
            {
                key: "owner",
                condition: !isOwner,
                msg: config.msg.owner,
                reaction: "👑"
            },
            {
                key: "premium",
                condition: !isOwner && !userDb?.premium,
                msg: config.msg.premium,
                reaction: "💎"
            },
            {
                key: "private",
                condition: isGroup,
                msg: config.msg.private,
                reaction: "📩"
            },
            {
                key: "restrict",
                condition: config.system.restrict,
                msg: config.msg.restrict,
                reaction: "🚫"
            }
        ];

        for (const {
                key,
                condition,
                msg,
                reaction
            }
            of permissionChecks) {
            if (permissions[key] && condition) {
                const now = Date.now();
                const lastSentMsg = userDb?.lastSentMsg?.[key] || 0;
                const oneDay = 24 * 60 * 60 * 1000;
                if (!lastSentMsg || (now - lastSentMsg) > oneDay) {
                    await simulateTyping();
                    await ctx.reply({
                        text: msg,
                        footer: formatter.italic(`Untuk pemberitahuan selanjutnya akan ditampilkan dalam bentuk reaksi emoji ${formatter.monospace(reaction)}.`),
                        interactiveButtons: []
                    });

                    await prisma.user.upsert({
                        where: {
                            phoneNumber: senderId
                        },
                        create: {
                            phoneNumber: senderId,
                            lastSentMsg: {
                                [key]: now
                            }
                        },
                        update: {
                            lastSentMsg: {
                                ...(userDb?.lastSentMsg || {}),
                                [key]: now
                            }
                        }
                    });
                    return;
                } else {
                    return await ctx.react(ctx.id, reaction);
                }
            }
        }

        await simulateTyping();
        await next(); // Lanjut ke proses berikutnya jika semua kondisi terpenuhi
    });
};