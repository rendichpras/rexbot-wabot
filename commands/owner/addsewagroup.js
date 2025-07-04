const prisma = require("../../lib/prisma");

module.exports = {
    name: "addsewagroup",
    aliases: ["addsewa", "addsewagrup", "adg"],
    category: "owner",
    permissions: {
        owner: true
    },
    code: async (ctx) => {
        const groupJid = ctx.isGroup() ? ctx.id : (ctx.args[0] ? `${ctx.args[0].replace(/[^\d]/g, "")}@g.us` : null);
        const daysAmount = ctx.args[ctx.isGroup() ? 0 : 1] ? parseInt(ctx.args[ctx.isGroup() ? 0 : 1], 10) : null;

        if (!groupJid) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            `${formatter.quote(tools.msg.generateCmdExample(ctx.used, "1234567890 30"))}\n` +
            `${formatter.quote(tools.msg.generateNotes(["Gunakan di grup untuk otomatis menyewakan grup tersebut."]))}\n` +
            formatter.quote(tools.msg.generatesFlagInfo({
                "-s": "Tetap diam dengan tidak menyiarkan ke orang yang relevan"
            }))
        );

        if (daysAmount !== null && daysAmount <= 0) return await ctx.reply(formatter.quote("❎ Durasi sewa (dalam hari) harus lebih dari 0!"));

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
            const groupOwnerJid = await group.owner();

            if (daysAmount && daysAmount > 0) {
                const expirationDate = BigInt(Date.now() + (daysAmount * 24 * 60 * 60 * 1000));

                // Update status sewa dan expiration menggunakan Prisma
                await prisma.group.upsert({
                    where: { id: groupId },
                    create: {
                        id: groupId,
                        sewa: true,
                        sewaExpiration: expirationDate
                    },
                    update: {
                        sewa: true,
                        sewaExpiration: expirationDate
                    }
                });

                if (!silent && groupOwnerJid) {
                    await ctx.sendMessage(groupOwnerJid, {
                        text: formatter.quote(`📢 Bot berhasil disewakan ke grup anda selama ${daysAmount} hari!`)
                    }).catch(() => { });
                }

                return await ctx.reply(formatter.quote(`✅ Berhasil menyewakan bot ke grup ini selama ${daysAmount} hari!`));
            } else {
                // Update status sewa tanpa expiration menggunakan Prisma
                await prisma.group.upsert({
                    where: { id: groupId },
                    create: {
                        id: groupId,
                        sewa: true,
                        sewaExpiration: null
                    },
                    update: {
                        sewa: true,
                        sewaExpiration: null
                    }
                });

                if (!silent && groupOwnerJid) {
                    await ctx.sendMessage(groupOwnerJid, {
                        text: formatter.quote(`📢 Bot berhasil disewakan ke grup anda selamanya!`)
                    }).catch(() => { });
                }

                return await ctx.reply(formatter.quote(`✅ Berhasil menyewakan bot ke grup ini selamanya!`));
            }
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};