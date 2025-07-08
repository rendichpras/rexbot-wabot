const prisma = require("../../lib/prisma");

module.exports = {
    name: "osettext",
    aliases: ["osettxt"],
    category: "owner",
    permissions: {
        owner: true
    },
    code: async (ctx) => {
        const key = ctx.args[0] || null;
        const text = ctx.args.slice(1).join(" ") || ctx?.quoted?.conversation || (ctx.quoted && ((Object.values(ctx.quoted).find(v => v?.text || v?.caption)?.text) || (Object.values(ctx.quoted).find(v => v?.text || v?.caption)?.caption))) || null;

        if (key.toLowercase() === "list") {
            const listText = await tools.list.get("osettext");
            return await ctx.reply({
                text: listText,
                footer: config.msg.footer,
                interactiveButtons: []
            });
        }
        
        if (!key || !text) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            `${formatter.quote(tools.msg.generateCmdExample(ctx.used, "price $1 untuk sewa bot 1 bulan"))}\n` +
            formatter.quote(tools.msg.generateNotes([`Silakan ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} list`)} untuk menampilkan daftar lengkap.`, "Untuk teks satu baris, ketik saja langsung ke perintah. Untuk teks dengan baris baru, balas pesan yang berisi teks tersebut ke perintah.", `Gunakan ${formatter.monospace("delete")} sebagai teks untuk menghapus teks yang disimpan sebelumnya.`]))
        );


        try {
            const validKeys = ["donate", "price"];
            const textKey = key.toLowerCase();

            if (!validKeys.includes(textKey)) {
                return await ctx.reply(formatter.quote(`❎ Teks '${key}' tidak valid!`));
            }

            // Ambil pengaturan bot yang ada
            const botSettings = await prisma.bot.findUnique({
                where: { id: "bot" },
                select: { settings: true }
            }) || { settings: {} };

            if (text.toLowerCase() === "delete") {
                // Hapus teks dari settings
                const updatedSettings = { ...botSettings.settings };
                delete updatedSettings[textKey];

                await prisma.bot.update({
                    where: { id: "bot" },
                    data: {
                        settings: updatedSettings
                    }
                });

                return await ctx.reply(formatter.quote(`🗑️ Pesan untuk teks '${key}' berhasil dihapus!`));
            }

            // Update settings dengan teks baru
            await prisma.bot.upsert({
                where: { id: "bot" },
                create: {
                    id: "bot",
                    settings: {
                        [textKey]: text
                    }
                },
                update: {
                    settings: {
                        ...botSettings.settings,
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