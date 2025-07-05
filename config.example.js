// Impor modul dan dependensi yang diperlukan
const {
    Formatter
} = require("@itsreimau/gktw");

// Konfigurasi
global.config = {
    // Informasi bot dasar
    bot: {
        name: "Rexbot-Wabot", // Nama bot
        prefix: /^[°•π÷×¶∆£¢€¥®™+✓_=|/~!?@#%^&.©^]/i, // Karakter awalan perintah yang diizinkan
        phoneNumber: "", // Nomor telepon bot (Tidak perlu diisi jika menggunakan QR code)
        thumbnail: "https://repository-images.githubusercontent.com/753096396/84e76ef0-ba19-4c87-8ec2-ea803b097479", // Gambar thumbnail bot
        groupJid: "", // JID untuk group bot (Opsional, jika tidak menggunakan requireBotGroupMembership)
        newsletterJid: "120363416372653441@newsletter", // JID untuk saluran bot

        // Konfigurasi autentikasi sesi bot
        authAdapter: {
            adapter: "default", // Adapter untuk menyimpan sesi (Pilihan adapter: default, mysql, mongo, firebase)

            // Konfigurasi default
            default: {
                authDir: "state"
            },

            // Konfigurasi MySQL
            mysql: {
                host: "localhost:3306", // Nama host
                user: "root", // Nama pengguna
                password: "admin123", // Kata sandi
                database: "rexbot-wabot" // Nama database
            },

            // Konfigurasi MongoDB
            mongodb: {
                url: "mongodb://localhost:27017/rexbot-wabot" // URL
            },

            // Konfigurasi Firebase
            firebase: {
                tableName: "rexbot-wabot", // Nama tabel
                session: "state" // Nama sesi
            }
        }
    },

    // Pesan bot yang disesuaikan untuk situasi tertentu
    msg: {
        admin: Formatter.quote("🔒 Mohon maaf, fitur ini hanya dapat diakses oleh administrator grup."), // Pesan saat perintah hanya untuk admin
        banned: Formatter.quote("🚫 Mohon maaf, akses Anda telah dibatasi oleh Administrator sistem."), // Pesan untuk pengguna yang dibanned
        botAdmin: Formatter.quote("⚠️ Mohon maaf, bot memerlukan status administrator grup untuk menjalankan fitur ini."), // Pesan jika bot bukan admin di grup
        botGroupMembership: Formatter.quote(`📝 Untuk mengakses fitur ini, Anda perlu bergabung dengan grup bot terlebih dahulu. Silakan ketik ${Formatter.monospace("/botgroup")} untuk mendapatkan tautan grup.`), // Pesan jika pengguna tidak bergabung dengan grup bot
        coin: Formatter.quote("💰 Mohon maaf, saldo koin Anda tidak mencukupi untuk menggunakan fitur ini."), // Pesan saat koin tidak cukup
        cooldown: Formatter.quote("⏳ Mohon tunggu beberapa saat sebelum menggunakan fitur ini kembali."), // Pesan saat cooldown perintah
        gamerestrict: Formatter.quote("ℹ️ Mohon maaf, fitur permainan tidak tersedia dalam grup ini."),
        group: Formatter.quote("📢 Mohon maaf, fitur ini hanya dapat diakses dalam grup."), // Pesan untuk perintah grup
        groupSewa: Formatter.quote(`💫 Bot belum diaktifkan dalam grup ini. Silakan ketik ${Formatter.monospace("/price")} untuk informasi biaya aktivasi atau ${Formatter.monospace("/owner")} untuk menghubungi Administrator.`), // Pesan jika grup belum melakukan sewa
        owner: Formatter.quote("🔐 Mohon maaf, fitur ini hanya dapat diakses oleh Administrator sistem."), // Pesan untuk perintah yang hanya owner bisa akses
        premium: Formatter.quote("✨ Mohon maaf, fitur ini hanya tersedia untuk pengguna Premium."), // Pesan jika pengguna bukan Premium
        private: Formatter.quote("📨 Mohon maaf, fitur ini hanya dapat diakses melalui pesan pribadi."), // Pesan untuk perintah obrolan pribadi
        restrict: Formatter.quote("🛡️ Mohon maaf, fitur ini dibatasi untuk alasan keamanan sistem."), // Pesan pembatasan perintah
        unavailableAtNight: Formatter.quote("🌙 Sistem sedang dalam periode maintenance (00:00 - 06:00 WIB). Silakan coba kembali pada jam operasional."), // Pesan jika tidak tersedia pada malam hari

        readmore: "\u200E".repeat(4001), // String read more
        note: "Memberikan pelayanan terbaik dengan integritas dan profesionalisme.", // Catatan
        footer: Formatter.italic("Dikembangkan oleh Rendiichtiar dengan dedikasi"),

        wait: Formatter.quote("⌛ Sedang memproses permintaan Anda..."), // Pesan loading
        notFound: Formatter.quote("📭 Mohon maaf, data yang Anda cari tidak ditemukan. Silakan coba kembali."), // Pesan item tidak ditemukan
        urlInvalid: Formatter.quote("🔗 Mohon maaf, URL yang Anda masukkan tidak valid.") // Pesan jika URL tidak valid
    },

    // Informasi owner bot
    owner: {
        name: "", // Nama owner bot
        organization: "", // Nama organisasi owner bot
        id: "", // Nomor telepon owner bot
        co: [""] // Nomor co-owner bot
    },

    // Stiker bot
    sticker: {
        packname: "Rexbot-Wabot", // Nama paket stiker
        author: "https://rexbot.rendiichtiar.com" // Pembuat stiker
    },

    // Sistem bot
    system: {
        alwaysOnline: true, // Bot selalu berstatus "online"
        antiCall: true, // Bot secara otomatis membanned orang yang menelepon
        autoMention: true, // Bot otomatis mention seseorang dalam pesan yang dikirim
        autoAiLabel: true, // Bot otomatis memamaki label AI dalam pesan yang dikirim (Hanya berfungsi di chat private)
        autoRead: true, // Bot baca pesan otomatis
        autoTypingOnCmd: true, // Tampilkan status "sedang mengetik" saat memproses perintah
        cooldown: 10 * 1000, // Jeda antar perintah (ms)
        maxListeners: 50, // Max listeners untuk events
        port: 3000, // Port (Jika pakai server)
        reportErrorToOwner: true, // Laporkan error ke owner bot
        restrict: false, // Batasi akses perintah
        requireBotGroupMembership: false, // Harus gabung grup bot
        requireGroupSewa: false, // Harus sewa bot untuk bisa dipakai di grup
        selfOwner: false, // Bot jadi owner sendiri
        selfReply: true, // Bot bisa balas pesan bot sendiri
        timeZone: "Asia/Jakarta", // Zona waktu bot
        unavailableAtNight: false, // Bot tidak tersedia pada malam hari, dari jam 12 malam sampai 6 pagi (Waktu akan disesuaikan menurut timeZone)
        uploaderHost: "Cloudku", // Host uploader untuk menyimpan media (Tersedia: Catbox, Cloudku, FastUrl, Litterbox, Pomf, Quax, Ryzumi, Uguu, Videy)
        useCoin: true, // Pakai koin
        usePairingCode: false, // Pakai kode pairing untuk koneksi
        customPairingCode: "UMBR4L15", // Kode pairing kustom untuk koneksi (Opsional, jika menggunakan QR code, jika kosong kode pairing akan random)
        useServer: false // Jalankan bot dengan server
    }
};