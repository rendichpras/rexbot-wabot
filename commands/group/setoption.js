const prisma = require('../../lib/prisma');

module.exports = {
    name: "setoption",
    aliases: ["setopt"],
    category: "group",
    permissions: {
        admin: true,
        botAdmin: true,
        group: true
    },
    code: async (ctx) => {
        const input = ctx.args.join(" ") || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            `${formatter.quote(tools.msg.generateCmdExample(ctx.used, "antilink"))}\n` +
            formatter.quote(tools.msg.generateNotes([`Silakan ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} list`)} untuk menampilkan daftar lengkap.`, `Ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} status`)} untuk melihat status.`]))
        );

        if (input.toLowerCase() === "list") {
            const listText = await tools.list.get("setoption");
            return await ctx.reply({
                text: listText,
                footer: config.msg.footer,
                interactiveButtons: []
            });
        }

        const groupId = ctx.getId(ctx.id);
        let group = await prisma.group.findUnique({
            where: { id: groupId },
            select: { option: true }
        });

        if (input.toLowerCase() === "status") {
            const options = group?.option || {};
            
            return await ctx.reply({
                text: `${formatter.quote(`Antiaudio: ${options.antiaudio ? "Aktif" : "Nonaktif"}`)}\n` +
                    `${formatter.quote(`Antidocument: ${options.antidocument ? "Aktif" : "Nonaktif"}`)}\n` +
                    `${formatter.quote(`Antigif: ${options.antigif ? "Aktif" : "Nonaktif"}`)}\n` +
                    `${formatter.quote(`Antiimage: ${options.antiimage ? "Aktif" : "Nonaktif"}`)}\n` +
                    `${formatter.quote(`Antilink: ${options.antilink ? "Aktif" : "Nonaktif"}`)}\n` +
                    `${formatter.quote(`Antinsfw: ${options.antinsfw ? "Aktif" : "Nonaktif"}`)}\n` +
                    `${formatter.quote(`Antispam: ${options.antispam ? "Aktif" : "Nonaktif"}`)}\n` +
                    `${formatter.quote(`Antisticker: ${options.antisticker ? "Aktif" : "Nonaktif"}`)}\n` +
                    `${formatter.quote(`Antitagsw: ${options.antitagsw ? "Aktif" : "Nonaktif"}`)}\n` +
                    `${formatter.quote(`Antitoxic: ${options.antitoxic ? "Aktif" : "Nonaktif"}`)}\n` +
                    `${formatter.quote(`Antivideo: ${options.antivideo ? "Aktif" : "Nonaktif"}`)}\n` +
                    `${formatter.quote(`Autokick: ${options.autokick ? "Aktif" : "Nonaktif"}`)}\n` +
                    `${formatter.quote(`Gamerestrict: ${options.gamerestrict ? "Aktif" : "Nonaktif"}`)}\n` +
                    formatter.quote(`Welcome: ${options.welcome ? "Aktif" : "Nonaktif"}`),
                footer: config.msg.footer,
                interactiveButtons: []
            });
        }

        try {
            const validOptions = [
                "antiaudio", "antidocument", "antigif", "antiimage",
                "antilink", "antinsfw", "antispam", "antisticker",
                "antitagsw", "antitoxic", "antivideo", "autokick",
                "gamerestrict", "welcome"
            ];

            const option = input.toLowerCase();
            if (!validOptions.includes(option)) {
                return await ctx.reply(formatter.quote(`❎ Opsi '${input}' tidak valid!`));
            }

            const currentOptions = group?.option || {};
            const newStatus = !currentOptions[option];
            
            // Update opsi grup
            await prisma.group.upsert({
                where: { id: groupId },
                create: {
                    id: groupId,
                    option: {
                        [option]: newStatus
                    }
                },
                update: {
                    option: {
                        ...currentOptions,
                        [option]: newStatus
                    }
                }
            });

            const statusText = newStatus ? "diaktifkan" : "dinonaktifkan";
            return await ctx.reply(formatter.quote(`✅ Opsi '${option}' berhasil ${statusText}!`));
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};