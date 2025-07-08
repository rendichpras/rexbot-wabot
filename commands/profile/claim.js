const prisma = require("../../lib/prisma");

module.exports = {
    name: "claim",
    aliases: ["bonus", "klaim"],
    category: "profile",
    code: async (ctx) => {
        const input = ctx.args.join(" ") || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            `${formatter.quote(tools.msg.generateCmdExample(ctx.used, "daily"))}\n` +
            formatter.quote(tools.msg.generateNotes([`Silakan ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} list`)} untuk menampilkan daftar lengkap.`]))
        );

        if (input.toLowerCase() === "list") {
            const listText = await tools.list.get("claim");
            return await ctx.reply(listText);
        }

        const claim = claimRewards[input];
        const senderId = ctx.getId(ctx.sender.jid);
        
        if (!claim) return await ctx.reply(formatter.quote("❎ Hadiah tidak valid!"));

        const user = await prisma.user.findUnique({
            where: { phoneNumber: senderId }
        });

        if (tools.cmd.isOwner(senderId, ctx.msg.key.id) || user?.premium) {
            return await ctx.reply(formatter.quote("❎ Anda sudah memiliki koin tak terbatas, tidak perlu mengklaim lagi."));
        }

        const level = user?.level || 0;
        if (level < claim.level) {
            return await ctx.reply(formatter.quote(`❎ Anda perlu mencapai level ${claim.level} untuk mengklaim hadiah ini. Levelmu saat ini adalah ${level}.`));
        }

        const currentTime = Date.now();
        const lastClaim = (user?.lastClaim ?? {})[input] || 0;
        const timePassed = currentTime - lastClaim;
        const remainingTime = claim.cooldown - timePassed;

        if (remainingTime > 0) {
            return await ctx.reply(formatter.quote(`⏳ Anda telah mengklaim hadiah ${input}. Tunggu ${tools.msg.convertMsToDuration(remainingTime)} untuk mengklaim lagi.`));
        }

        try {
            const updatedUser = await prisma.user.upsert({
                where: { phoneNumber: senderId },
                create: {
                    phoneNumber: senderId,
                    coin: claim.reward,
                    lastClaim: {
                        [input]: currentTime
                    },
                    username: `@user_${senderId.slice(-6)}`
                },
                update: {
                    coin: {
                        increment: claim.reward
                    },
                    lastClaim: {
                        ...(user?.lastClaim || {}),
                        [input]: currentTime
                    }
                }
            });

            return await ctx.reply(formatter.quote(`✅ Anda berhasil mengklaim hadiah ${input} sebesar ${claim.reward} koin! Koin-mu saat ini adalah ${updatedUser.coin}.`));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};

// Daftar hadiah klaim yang tersedia
const claimRewards = {
    daily: {
        reward: 100,
        cooldown: 24 * 60 * 60 * 1000, // 24 jam (100 koin)
        level: 1
    },
    weekly: {
        reward: 500,
        cooldown: 7 * 24 * 60 * 60 * 1000, // 7 hari (500 koin)
        level: 15
    },
    monthly: {
        reward: 2000,
        cooldown: 30 * 24 * 60 * 60 * 1000, // 30 hari (2000 koin)
        level: 50
    },
    yearly: {
        reward: 10000,
        cooldown: 365 * 24 * 60 * 60 * 1000, // 365 hari (10000 koin)
        level: 75
    }
};