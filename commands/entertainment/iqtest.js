const prisma = require('../../lib/prisma');

module.exports = {
    name: "iqtest",
    aliases: ["iq", "testiq"],
    category: "entertainment",
    permissions: {
        coin: 10
    },
    code: async (ctx) => {
        const senderId = ctx.getId(ctx.sender.jid);
        const user = await prisma.user.findUnique({
            where: { phoneNumber: senderId },
            select: { winGame: true }
        });

        const winGame = user?.winGame || 0;
        let iqScore;
        let feedback;

        if (winGame < 5) {
            iqScore = Math.floor(Math.random() * 50) + 1;
            feedback = iqScore < 50 ? 
                "Jangan khawatir, setiap orang memiliki kesempatan untuk berkembang. Teruslah berlatih!" : 
                "Potensi Anda mulai terlihat. Teruslah mengasah kemampuan Anda!";
        } else if (winGame < 20) {
            iqScore = Math.floor(Math.random() * 50) + 51;
            feedback = iqScore < 100 ? 
                "Anda menunjukkan perkembangan yang baik. Tingkatkan terus performa Anda!" : 
                "Prestasi yang membanggakan! Anda berada di jalur yang tepat.";
        } else {
            iqScore = Math.floor(Math.random() * 50) + 101;
            feedback = iqScore < 150 ? 
                "Pencapaian yang luar biasa! Anda memiliki kemampuan di atas rata-rata." : 
                "Selamat! Anda menunjukkan kemampuan yang sangat istimewa.";
        }

        // Menampilkan hasil tes IQ
        return await ctx.reply(
            formatter.quote(`🧠 Hasil Tes IQ\n\n` +
            `Skor IQ: ${iqScore}\n` +
            `Evaluasi: ${feedback}`)
        );
    }
};