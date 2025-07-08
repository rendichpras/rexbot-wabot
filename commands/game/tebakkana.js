const axios = require("axios");
const didYouMean = require("didyoumean");

const session = new Map();

module.exports = {
    name: "tebakkana",
    category: "game",
    code: async (ctx) => {
        if (session.has(ctx.id)) return await ctx.reply(formatter.quote("🎮 Mohon selesaikan permainan yang sedang berlangsung terlebih dahulu"));

        const level = parseInt(ctx.args[0], 10) || null;

        if (!level) return await ctx.reply(
            `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
            `${formatter.quote(tools.msg.generateCmdExample(ctx.used, "1"))}\n` +
            formatter.quote(tools.msg.generateNotes(["Selain 1, bisa 2, 3, 4, dan 5."]))
        );

        try {
            const limit = {
                1: 3463,
                2: 1831,
                3: 1797,
                4: 632,
                5: 662
            } [level];
            const apiUrl = tools.api.createUrl("https://jlpt-vocab-api.vercel.app", "/api/words", {
                level,
                limit
            });
            const result = tools.cmd.getRandomElement((await axios.get(apiUrl)).data.words);

            let question, answer, clue;
            if (Math.random() < 0.5) {
                question = `Apa bentuk romaji dari "${result.furigana || result.word}"?`;
                answer = result.romaji;
                clue = answer.replace(/[aiueo]/g, "_").toUpperCase();
            } else {
                question = `Tuliskan kana untuk romaji "${result.romaji}"`;
                answer = result.furigana || result.word;
                clue = answer.replace(/[あいうえおアイウエオ]/g, "_");
            }

            const game = {
                coin: 10,
                timeout: 60000,
                answer: result.jawaban.toLowerCase(),
                description: await tools.cmd.translate(result.meaning, "id")
            };

            session.set(ctx.id, true);

            await ctx.reply({
                text: `${formatter.quote(`❓ Pertanyaan: ${question}`)}\n` +
                `${formatter.quote(`💰 Hadiah: ${game.coin} Koin`)}\n` +
                formatter.quote(`⏳ Waktu: ${tools.msg.convertMsToDuration(game.timeout)}`),
                footer: config.msg.footer,
                buttons: [{
                    buttonId: "hint",
                    buttonText: {
                        displayText: "Petunjuk"
                    },
                    type: 1
                }, {
                    buttonId: "surrender",
                    buttonText: {
                        displayText: "Menyerah"
                    },
                    type: 1
                }],
                headerType: 1
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
                            `${formatter.quote(`📝 Arti: ${game.description}`)}\n` +
                            formatter.quote(`💰 Anda mendapatkan ${game.coin} Koin`)
                    }, {
                        quoted: m
                    });
                    return collector.stop();
                } else if (participantAnswer === "hint") {
                    await ctx.sendMessage(ctx.id, {
                        text: `${formatter.quote("💡 Petunjuk:")}\n` +
                            formatter.monospace(clue)
                    }, {
                        quoted: m
                    });
                } else if (participantAnswer === "surrender") {
                    session.delete(ctx.id);
                    await ctx.sendMessage(ctx.id, {
                        text: `${formatter.quote("🏳️ Permainan diakhiri")}\n` +
                            `${formatter.quote(`Jawaban yang benar adalah: ${tools.msg.ucwords(game.answer)}`)}\n` +
                            formatter.quote(`📝 Arti: ${game.description}`)
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
                        `${formatter.quote(`Jawaban yang benar adalah: ${tools.msg.ucwords(game.answer)}`)}\n` +
                        formatter.quote(`📝 Arti: ${game.description}`)
                    );
                }
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error, true);
        }
    }
};