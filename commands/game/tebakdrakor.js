const axios = require("axios");
const didYouMean = require("didyoumean");


const session = new Map();

module.exports = {
    name: "tebakdrakor",
    category: "game",
    code: async (ctx) => {
        if (session.has(ctx.id)) return await ctx.reply(formatter.quote("🎮 Mohon selesaikan permainan yang sedang berlangsung terlebih dahulu"));

        try {
            const apiUrl = tools.api.createUrl("https://raw.githubusercontent.com", "/ERLANRAHMAT/games/refs/heads/main/tebakdrakor.json");
            const result = tools.cmd.getRandomElement((await axios.get(apiUrl)).data);

            const game = {
                coin: 10,
                timeout: 60000,
                answer: result.jawaban.toLowerCase()
            };

            session.set(ctx.id, true);

            await ctx.reply({
                image: {
                    url: result.img
                },
                mimetype: tools.mime.lookup("jpeg"),
                caption: `${formatter.quote(`📝 Deskripsi: ${result.deskripsi}`)}\n` +
                    `${formatter.quote(`💰 Hadiah: ${game.coin} Koin`)}\n` +
                    `${formatter.quote(`⏳ Waktu: ${tools.msg.convertMsToDuration(game.timeout)}`)}\n` +
                    `${formatter.quote(`ℹ️ Ketik ${formatter.monospace("h")} untuk mendapatkan bantuan`)}\n` +
                    `${formatter.quote(`❎ Ketik ${formatter.monospace("s")} untuk mengakhiri permainan`)}\n` +
                    "\n" +
                    config.msg.footer
            });

            const collector = ctx.MessageCollector({
                time: game.timeout
            });

            collector.on("collect", async (m) => {
                const participantAnswer = m.content.toLowerCase();
                const participantId = ctx.getId(m.sender);

                if (participantAnswer === game.answer) {
                    session.delete(ctx.id);
                    
                    await prisma.user.upsert({
                        where: { phoneNumber: participantId },
                        create: {
                            phoneNumber: participantId,
                            coin: game.coin,
                            winGame: 1,
                            username: `@user_${participantId.slice(-6)}`
                        },
                        update: {
                            coin: {
                                increment: game.coin
                            },
                            winGame: {
                                increment: 1
                            }
                        }
                    });
                    
                    await ctx.sendMessage(ctx.id, {
                        text: `${formatter.quote("✨ Selamat! Jawaban Anda benar!")}\n` +
                            formatter.quote(`💰 Anda mendapatkan ${game.coin} Koin`)
                    }, {
                        quoted: m
                    });
                    return collector.stop();
                } else if (["h"].includes(participantAnswer)) {
                    const clue = game.answer.replace(/[aiueo]/g, "_");
                    await ctx.sendMessage(ctx.id, {
                        text: `${formatter.quote("💡 Petunjuk:")}\n` +
                            formatter.monospace(clue.toUpperCase())
                    }, {
                        quoted: m
                    });
                } else if (["s"].includes(participantAnswer)) {
                    session.delete(ctx.id);
                    await ctx.sendMessage(ctx.id, {
                        text: `${formatter.quote("🏳️ Permainan diakhiri")}\n` +
                            formatter.quote(`Jawaban yang benar adalah: ${tools.msg.ucwords(game.answer)}`)
                    }, {
                        quoted: m
                    });
                    return collector.stop();
                } else if (didYouMean(participantAnswer, [game.answer]) === game.answer) {
                    await ctx.sendMessage(ctx.id, {
                        text: formatter.quote("🎯 Jawaban Anda sudah mendekati benar!")
                    }, {
                        quoted: m
                    });
                }
            });

            collector.on("end", async () => {
                if (session.has(ctx.id)) {
                    session.delete(ctx.id);
                    return await ctx.reply(
                        `${formatter.quote("⏱️ Waktu permainan telah habis")}\n` +
                        formatter.quote(`Jawaban yang benar adalah: ${tools.msg.ucwords(game.answer)}`)
                    );
                }
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error, true);
        }
    }
};