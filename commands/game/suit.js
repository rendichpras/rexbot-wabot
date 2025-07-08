const prisma = require('../../lib/prisma');
const session = new Map();

module.exports = {
    name: "suit",
    category: "game",
    permissions: {
        group: true
    },
    code: async (ctx) => {
        const accountJid = ctx?.quoted?.senderJid || ctx.msg.message?.[ctx.getMessageType()]?.contextInfo?.mentionedJid?.[0] || null;
        const accountId = ctx.getId(accountJid);

        const senderJid = ctx.sender.jid;
        const senderId = ctx.getId(senderJid);

        if (!accountJid) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${senderId}`))}\n` +
                formatter.quote(tools.msg.generateNotes(["Balas atau kutip pesan untuk memilih pengguna sebagai lawan bermain."])),
            mentions: [senderJid]
        });

        if (accountId === config.bot.id) return await ctx.reply(formatter.quote("Tidak bisa menantang bot!"));
        if (accountJid === senderJid) return await ctx.reply(formatter.quote("Tidak bisa menantang diri sendiri!"));

        const existingGame = [...session.values()].find(game => game.players.includes(senderJid) || game.players.includes(accountJid));
        if (existingGame) return await ctx.reply(formatter.quote("🎮 Mohon tunggu, salah satu pemain sedang dalam sesi permainan lain"));

        try {
            const game = {
                players: [senderJid, accountJid],
                coin: 10,
                timeout: 120000,
                choices: new Map(),
                started: false
            };

            await ctx.reply({
                text: `${formatter.quote(`🎮 @${accountId}, Anda mendapat tantangan bermain suit dari @${senderId}!`)}\n` +
                    `${formatter.quote(`💰 Hadiah: ${game.coin} Koin`)}\n` +
                    formatter.quote(`Bonus: ${game.coin} Koin`),
                mentions: [accountJid],
                footer: config.msg.footer,
                buttons: [{
                    buttonId: "accept",
                    buttonText: {
                        displayText: "Terima"
                    },
                    type: 1
                }, {
                    buttonId: "reject",
                    buttonText: {
                        displayText: "Tolak"
                    },
                    type: 1
                }],
                headerType: 1
            });

            session.set(senderJid, game);
            session.set(accountJid, game);

            const collector = ctx.MessageCollector({
                time: game.timeout,
                filter: (m) => [senderJid, accountJid].includes(m.sender)
            });

            collector.on("collect", async (m) => {
                if (![senderJid, accountJid].includes(m.sender)) return;

                const participantAnswer = m.content.toLowerCase();
                const participantJid = m.sender;
                const participantId = ctx.getId(participantJid);
                const isGroup = m.jid.endsWith("@g.us");

                if (!game.started && isGroup && participantId === accountId) {
                    if (participantAnswer === "accept") {
                        await ctx.sendMessage(m.jid, {
                            text: formatter.quote(`✨ @${accountId} menerima tantangan! Silakan pilih pilihan Anda di obrolan pribadi.`),
                            mentions: [accountJid]
                        }, {
                            quoted: m
                        });

                        const choiceText = formatter.quote("Silahkan pilih salah satu!");
                        const buttons = [{
                                buttonId: "batu",
                                buttonText: {
                                    displayText: "Batu"
                                },
                                type: 1
                            }, {
                                buttonId: "kertas",
                                buttonText: {
                                    displayText: "Kertas"
                                },
                                type: 1
                            },
                            {
                                buttonId: "gunting",
                                buttonText: {
                                    displayText: "Gunting"
                                },
                                type: 1
                            }
                        ];

                        await ctx.sendMessage(senderJid, {
                            text: choiceText,
                            footer: config.msg.footer,
                            buttons,
                            headerType: 1
                        });
                        await ctx.sendMessage(accountJid, {
                            text: choiceText,
                            footer: config.msg.footer,
                            buttons,
                            headerType: 1
                        });
                    } else if (participantAnswer === "reject") {
                        session.delete(senderJid);
                        session.delete(accountJid);
                        await ctx.sendMessage(m.jid, {
                            text: formatter.quote(`❎ @${accountId} menolak tantangan permainan`),
                            mentions: [accountJid]
                        }, {
                            quoted: m
                        });
                        return collector.stop();
                    }
                }

                if (!isGroup && game.started) {

                    const choices = {
                        batu: {
                            index: 0,
                            name: "Batu"
                        },
                        kertas: {
                            index: 1,
                            name: "Kertas"
                        },
                        gunting: {
                            index: 2,
                            name: "Gunting"
                        }
                    };
                    const choiceData = choices[participantAnswer];

                    if (choiceData) {
                        game.choices.set(participantId, choiceData);

                        await ctx.sendMessage(participantJid, {
                            text: formatter.quote(`Anda memilih: ${choiceData.name}`)
                        }, {
                            quoted: m
                        });

                        if (game.choices.size === 2) {
                            const [sChoice, aChoice] = [
                                game.choices.get(senderId),
                                game.choices.get(accountId)
                            ];

                            const result = (3 + sChoice.index - aChoice.index) % 3;
                            let winnerText, coinText = "Tak seorang pun menang, tak seorang pun mendapat koin";

                            if (result === 0) {
                                winnerText = "🤝 Seri!";
                            } else if (result === 1) {
                                winnerText = `🎉 @${senderId} memenangkan permainan!`;
                                await prisma.user.upsert({
                                    where: { phoneNumber: senderId },
                                    create: {
                                        phoneNumber: senderId,
                                        coin: game.coin,
                                        winGame: 1,
                                        username: `@user_${senderId.slice(-6)}`
                                    },
                                    update: {
                                        coin: { increment: game.coin },
                                        winGame: { increment: 1 }
                                    }
                                });
                                coinText = `+${game.coin} Koin untuk ${senderId}`;
                            } else {
                                winnerText = `🎉 @${accountId} memenangkan permainan!`;
                                await prisma.user.upsert({
                                    where: { phoneNumber: accountId },
                                    create: {
                                        phoneNumber: accountId,
                                        coin: game.coin,
                                        winGame: 1,
                                        username: `@user_${accountId.slice(-6)}`
                                    },
                                    update: {
                                        coin: { increment: game.coin },
                                        winGame: { increment: 1 }
                                    }
                                });
                                coinText = `+${game.coin} Koin untuk @${accountId}`;
                            }

                            await ctx.reply({
                                text: `${formatter.quote("📊 Hasil Permainan:")}\n` +
                                    `${formatter.quote(`@${senderId}: ${sChoice.name}`)}\n` +
                                    `${formatter.quote(`@${accountId}: ${aChoice.name}`)}\n` +
                                    `${formatter.quote(winnerText)}` +
                                    formatter.quote(coinText),
                                mentions: [senderJid, accountJid]
                            });

                            session.delete(senderJid);
                            session.delete(accountJid);
                            return collector.stop();
                        }
                    }
                }
            });
        } catch (error) {
            return await tools.cmd.handleError(ctx, error);
        }
    }
};