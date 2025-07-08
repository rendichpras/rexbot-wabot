const axios = require("axios");
const didYouMean = require("didyoumean");
const prisma = require('../../lib/prisma');

const session = new Map();

module.exports = {
    name: "family100",
    category: "game",
    permissions: {
        group: true
    },
    code: async (ctx) => {
        if (session.has(ctx.id)) return await ctx.reply(formatter.quote("🎮 Mohon selesaikan permainan yang sedang berlangsung terlebih dahulu"));

        try {
            const apiUrl = tools.api.createUrl("https://raw.githubusercontent.com", "/BochilTeam/database/refs/heads/master/games/family100.json");
            const result = tools.cmd.getRandomElement((await axios.get(apiUrl)).data);

            const game = {
                coin: {
                    answered: 10,
                    allAnswered: 100
                },
                timeout: 90000,
                answers: new Set(result.jawaban.map(d => d.toLowerCase())),
                participants: new Set()
            };

            session.set(ctx.id, true);

            await ctx.reply(
                `${formatter.quote(`📝 Pertanyaan: ${result.soal}`)}\n` +
                `${formatter.quote(`📊 Total Jawaban: ${game.answers.size}`)}\n` +
                `${formatter.quote(`⏳ Waktu: ${tools.msg.convertMsToDuration(game.timeout)}`)}\n` +
                `${formatter.quote(`❌ Ketik ${formatter.monospace("s")} untuk mengakhiri permainan`)}\n` +
                "\n" +
                config.msg.footer
            );

            const collector = ctx.MessageCollector({
                time: game.timeout
            });

            collector.on("collect", async (m) => {
                const participantAnswer = m.content.toLowerCase();
                const participantId = ctx.getId(m.sender);

                if (game.answers.has(participantAnswer)) {
                    game.answers.delete(participantAnswer);
                    game.participants.add(participantId);

                    await prisma.user.upsert({
                        where: { phoneNumber: participantId },
                        create: {
                            phoneNumber: participantId,
                            coin: game.coin.answered,
                            username: `@user_${participantId.slice(-6)}`
                        },
                        update: {
                            coin: { increment: game.coin.answered }
                        }
                    });

                    await ctx.sendMessage(ctx.id, {
                        text: formatter.quote(`✨ Jawaban "${tools.msg.ucwords(participantAnswer)}" benar! Sisa jawaban: ${game.answers.size}`)
                    }, {
                        quoted: m
                    });

                    if (game.answers.size === 0) {
                        session.delete(ctx.id);
                        for (const participant of game.participants) {
                            await prisma.user.upsert({
                                where: { phoneNumber: participant },
                                create: {
                                    phoneNumber: participant,
                                    coin: game.coin.allAnswered,
                                    winGame: 1,
                                    username: `@user_${participant.slice(-6)}`
                                },
                                update: {
                                    coin: { increment: game.coin.allAnswered },
                                    winGame: { increment: 1 }
                                }
                            });
                        }
                        await ctx.sendMessage(ctx.id, {
                            text: formatter.quote(`🎉 Selamat! Semua jawaban telah ditemukan! Setiap peserta yang berpartisipasi mendapatkan ${game.coin.allAnswered} Koin.`)
                        }, {
                            quoted: m
                        });
                        return collector.stop();
                    }
                } else if (participantAnswer === "surrender") {
                    const remaining = [...game.answers].map(tools.msg.ucwords).join(", ").replace(/, ([^,]*)$/, ", dan $1");
                    session.delete(ctx.id);
                    await ctx.sendMessage(ctx.id, {
                        text: `${formatter.quote("🏳️ Permainan diakhiri")}\n` +
                            formatter.quote(`Jawaban yang belum ditemukan: ${remaining}`)
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
                const remaining = [...game.answers].map(tools.msg.ucwords).join(", ").replace(/, ([^,]*)$/, ", dan $1");

                if (session.has(ctx.id)) {
                    session.delete(ctx.id);
                    return await ctx.reply(
                        `${formatter.quote("⏱️ Waktu permainan telah habis")}\n` +
                        formatter.quote(`Jawaban yang belum ditemukan: ${remaining}`)
                    );
                }
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error, true);
        }
    }
};