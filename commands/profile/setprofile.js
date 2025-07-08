const prisma = require("../../lib/prisma");

module.exports = {
    name: "setprofile",
    aliases: ["set", "setp", "setprof"],
    category: "profile",
    code: async (ctx) => {
        const input = ctx.args.join(" ") || null;

        if (!input) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            `${formatter.quote(tools.msg.generateCmdExample(ctx.used, "autolevelup"))}\n` +
            formatter.quote(tools.msg.generateNotes([`Silakan ketik ${formatter.monospace(`${ctx.used.prefix + ctx.used.command} list`)} untuk menampilkan daftar lengkap.`]))
        );

        if (input.toLowerCase() === "list") {
            const listText = await tools.list.get("setprofile");
            return await ctx.reply(listText);
        }

        try {
            const senderId = ctx.getId(ctx.sender.jid);
            const args = ctx.args;
            const command = args[0]?.toLowerCase();

            switch (command) {
                case "username": {
                    const input = args.slice(1).join(" ").trim();

                    if (!input) return await ctx.reply(formatter.quote("❎ Mohon masukkan username yang ingin digunakan."));
                    if (/[^a-zA-Z0-9._-]/.test(input)) return await ctx.reply(formatter.quote("❎ Username hanya boleh berisi huruf, angka, titik (.), underscore (_) atau tanda hubung (-)."));

                    // Cek username sudah dipakai atau belum
                    const existingUser = await prisma.user.findFirst({
                        where: {
                            username: `@${input}`
                        }
                    });

                    if (existingUser) return await ctx.reply(formatter.quote("❎ Username tersebut sudah digunakan oleh pengguna lain."));

                    const username = `@${input}`;
                    await prisma.user.upsert({
                        where: { phoneNumber: senderId },
                        create: {
                            phoneNumber: senderId,
                            username: username
                        },
                        update: { username: username }
                    });

                    return await ctx.reply(formatter.quote(`✅ Username berhasil diubah menjadi '${username}'!`));
                    break;
                }
                case "autolevelup": {
                    const user = await prisma.user.findUnique({
                        where: { phoneNumber: senderId }
                    });

                    const newStatus = !(user?.autolevelup ?? false);
                    
                    await prisma.user.upsert({
                        where: { phoneNumber: senderId },
                        create: {
                            phoneNumber: senderId,
                            autolevelup: newStatus,
                            username: `@user_${senderId.slice(-6)}`
                        },
                        update: { autolevelup: newStatus }
                    });

                    const statusText = newStatus ? "diaktifkan" : "dinonaktifkan";
                    return await ctx.reply(formatter.quote(`✅ Fitur '${command}' berhasil ${statusText}!`));
                    break;
                }
                default:
                    return await ctx.reply(formatter.quote("❎ Teks tidak valid."));
            }
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};