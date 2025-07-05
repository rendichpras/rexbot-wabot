const prisma = require('../../lib/prisma');
const session = new Map();

module.exports = {
    name: "suit",
    category: "game",
    permissions: {
        group: true
    },
    code: async (ctx) => {
        const accountJid = ctx?.quoted?.senderJid || ctx.msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
        const accountId = ctx.getId(accountJid);

        const senderJid = ctx.sender.jid;
        const senderId = ctx.getId(senderJid);

        if (!accountJid) return await ctx.reply({
            text: `${formatter.quote(tools.msg.generateInstruction(["send"], ["text"]))}\n` +
                `${formatter.quote(tools.msg.generateCmdExample(ctx.used, `@${senderId}`))}\n` +
                formatter.quote(tools.msg.generateNotes(["Balas atau kutip pesan untuk memilih pengguna sebagai lawan bermain."])),
            mentions: [senderJid]
        });

        const existingGame = [...session.values()].find(game => game.players.includes(senderJid) || game.players.includes(accountJid));
        if (existingGame) return await ctx.reply(formatter.quote("🎮 Mohon tunggu, salah satu pemain sedang dalam sesi permainan lain"));

        try {
            const game = {
                players: [senderJid, accountJid],
                coin: 10,
                timeout: 120000,
                choices: new Map()
            };

            await ctx.reply({
                text: `${formatter.quote(`🎮 @${accountId}, Anda mendapat tantangan bermain Suit!`)}\n` +
                    `${formatter.quote(`💰 Hadiah: ${game.coin} Koin`)}\n` +
                    `${formatter.quote(`✅ Ketik ${formatter.monospace("accept")} untuk menerima tantangan`)}\n` +
                    `${formatter.quote(`❌ Ketik ${formatter.monospace("reject")} untuk menolak tantangan`)}\n` +
                    "\n" +
                    config.msg.footer,
                mentions: [accountJid]
            });

            session.set(senderJid, game);
            session.set(accountJid, game);

            const collector = ctx.MessageCollector({
                time: game.timeout,
                hears: [senderJid, accountJid]
            });

            collector.on("collect", async (m) => {
                const participantAnswer = m.content.toLowerCase();
                const participantId = ctx.getId(m.sender);
                const isGroup = m.jid.endsWith("@g.us");

                if (isGroup && participantId === accountId) {
                    if (["a", "accept"].includes(participantAnswer)) {
                        await ctx.sendMessage({
                            text: formatter.quote(`✨ @${accountId} menerima tantangan! Silakan pilih pilihan Anda di obrolan pribadi.`),
                            mentions: [accountJid]
                        }, {
                            quoted: m
                        });

                        const choiceText = formatter.quote("📝 Silakan pilih salah satu:\n- Gunting (g)\n- Kertas (k)\n- Batu (b)");

                        await ctx.sendMessage(senderJid, {
                            text: choiceText
                        });
                        await ctx.sendMessage(accountJid, {
                            text: choiceText
                        });
                    } else if (["r", "reject"].includes(participantAnswer)) {
                        session.delete(senderJid);
                        session.delete(accountJid);
                        await ctx.reply({
                            text: formatter.quote(`❎ @${accountId} menolak tantangan permainan`),
                            mentions: [accountJid]
                        }, {
                            quoted: m
                        });
                        return collector.stop();
                    }
                }

                if (!isGroup) {
                    const participantJid = m.sender;
                    const currentGame = session.get(participantJid);
                    if (!currentGame) return;

                    const choiceMap = {
                        "1": "batu",
                        "2": "kertas",
                        "3": "gunting",
                        "b": "batu",
                        "k": "kertas",
                        "g": "gunting",
                        "batu": "batu",
                        "kertas": "kertas",
                        "gunting": "gunting"
                    };

                    const choices = {
                        batu: 0,
                        kertas: 1,
                        gunting: 2
                    };
                    const selectedChoice = choiceMap[participantAnswer];

                    if (selectedChoice) {
                        currentGame.choices.set(participantId, selectedChoice);

                        await ctx.reply({
                            text: formatter.quote(`✅ Anda memilih: ${tools.msg.ucwords(selectedChoice)}`)
                        }, {
                            quoted: m
                        });

                        if (currentGame.choices.has(senderId) && currentGame.choices.has(accountId)) {
                            const [sChoice, aChoice] = [currentGame.choices.get(senderId), currentGame.choices.get(accountId)];
                            const result = (3 + choices[sChoice] - choices[aChoice]) % 3;

                            let winner;
                            if (result === 0) {
                                winner = "🤝 Hasil: Seri!";
                            } else if (result === 1) {
                                winner = `🎉 @${senderId} memenangkan permainan!`;
                                await prisma.user.upsert({
                                    where: { phoneNumber: senderId },
                                    create: {
                                        phoneNumber: senderId,
                                        coin: currentGame.coin,
                                        winGame: 1,
                                        username: `@user_${senderId.slice(-6)}`
                                    },
                                    update: {
                                        coin: { increment: currentGame.coin },
                                        winGame: { increment: 1 }
                                    }
                                });
                            } else {
                                winner = `🎉 @${accountId} memenangkan permainan!`;
                                await prisma.user.upsert({
                                    where: { phoneNumber: accountId },
                                    create: {
                                        phoneNumber: accountId,
                                        coin: currentGame.coin,
                                        winGame: 1,
                                        username: `@user_${accountId.slice(-6)}`
                                    },
                                    update: {
                                        coin: { increment: currentGame.coin },
                                        winGame: { increment: 1 }
                                    }
                                });
                            }

                            await ctx.reply({
                                text: `${formatter.quote("📊 Hasil Permainan:")}\n` +
                                    `${formatter.quote(`@${senderId}: ${tools.msg.ucwords(sChoice)}`)}\n` +
                                    `${formatter.quote(`@${accountId}: ${tools.msg.ucwords(aChoice)}`)}\n` +
                                    `${formatter.quote(winner)}\n` +
                                    formatter.quote(`💰 Hadiah: ${currentGame.coin} Koin`),
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
            return await tools.cmd.handleError(ctx, error, true);
        }
    }
};