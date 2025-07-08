const prisma = require('../../lib/prisma');

module.exports = {
    name: "settext",
    aliases: ["settxt"],
    category: "group",
    permissions: {
        admin: true,
        botAdmin: true,
        group: true
    },
    code: async (ctx) => {
        const key = ctx.args[0] || null;
        const text = ctx.args.slice(1).join(" ") || ctx?.quoted?.conversation || (ctx.quoted && ((Object.values(ctx.quoted).find(v => v?.text || v?.caption)?.text) || (Object.values(ctx.quoted).find(v => v?.text || v?.caption)?.caption))) || null;

        
        if (key.toLowerCase() === "list") {
            const listText = await tools.list.get("settext");
            return await ctx.reply({
                text: listText,
                footer: config.msg.footer,
                interactiveButtons: []
            });
        }
        
        if (!key || !text) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            `${formatter.quote(tools.msg.generateCmdExample(ctx.used, "welcome Selamat datang di grup!"))}\n` +
            formatter.quote(tools.msg.generateNotes([`Silakan ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} list`)} untuk menampilkan daftar lengkap.`, "Untuk input multi-baris, Anda dapat membalas atau mengutip pesan yang diinginkan.", `Gunakan ${formatter.monospace("delete")} sebagai teks untuk menghapus teks yang disimpan sebelumnya.`]))
        );

        try {
            const groupId = ctx.getId(ctx.id);
            const validKeys = ["goodbye", "intro", "welcome"];
            const textKey = key.toLowerCase();

            if (!validKeys.includes(textKey)) {
                return await ctx.reply(formatter.quote(`❎ Teks '${key}' tidak valid!`));
            }

            let group = await prisma.group.findUnique({
                where: { id: groupId },
                select: { text: true }
            });

            const currentTexts = group?.text || {};

            if (text.toLowerCase() === "delete") {
                // Hapus teks spesifik
                delete currentTexts[textKey];
                
                await prisma.group.upsert({
                    where: { id: groupId },
                    create: {
                        id: groupId,
                        text: {}
                    },
                    update: {
                        text: currentTexts
                    }
                });

                return await ctx.reply(formatter.quote(`🗑️ Pesan untuk teks '${key}' berhasil dihapus!`));
            }

            // Update atau tambah teks baru
            await prisma.group.upsert({
                where: { id: groupId },
                create: {
                    id: groupId,
                    text: {
                        [textKey]: text
                    }
                },
                update: {
                    text: {
                        ...currentTexts,
                        [textKey]: text
                    }
                }
            });

            return await ctx.reply(formatter.quote(`✅ Pesan untuk teks '${key}' berhasil disimpan!`));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};