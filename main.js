// Impor modul dan dependensi yang diperlukan
const middleware = require("./middleware.js");
const events = require("./events/handler.js");
const {
    Client,
    CommandHandler
} = require("@itsreimau/gktw");
const path = require("node:path");
const util = require("node:util");
const prisma = require('./lib/prisma');

// Konfigurasi bot dari file 'config.js'
const {
    bot: botConfig,
    system
} = config;
const {
    authAdapter
} = botConfig;

// Pilih adapter autentikasi sesuai dengan konfigurasi
const adapters = {
    mysql: () => require("baileys-mysql").useSqlAuthState(authAdapter.mysql),
    mongodb: () => require("baileys-mongodb").useMongoAuthState(authAdapter.mongodb.url),
    firebase: () => require("baileys-firebase").useFireAuthState(authAdapter.firebase)
};
const selectedAuthAdapter = adapters[authAdapter.adapter] ? adapters[authAdapter.adapter]() : null;

consolefy.log("Connecting..."); // Logging proses koneksi

// Pastikan data bot ada di database
async function initBotSettings() {
    try {
        const botSettings = await prisma.bot.upsert({
            where: { id: 'bot' },
            create: {
                id: 'bot',
                mode: 'public',
                settings: {}
            },
            update: {}
        });
        consolefy.success("Berhasil terhubung ke database!");
        return botSettings;
    } catch (error) {
        consolefy.error(`Gagal terhubung ke database: ${error.message}`);
        throw error;
    }
}

// Buat instance bot dengan pengaturan yang sesuai
const bot = new Client({
    prefix: botConfig.prefix,
    phoneNumber: botConfig.phoneNumber,
    authAdapter: selectedAuthAdapter,
    authDir: authAdapter.adapter === "default" ? path.resolve(__dirname, authAdapter.default.authDir) : null,
    readIncommingMsg: system.autoRead,
    printQRInTerminal: !system.usePairingCode,
    markOnlineOnConnect: system.alwaysOnline,
    usePairingCode: system.usePairingCode,
    customPairingCode: system.customPairingCode,
    selfReply: system.selfReply,
    autoMention: system.autoMention,
    autoAiLabel: system.autoAiLabel
});

// Inisialisasi event dan middleware
events(bot);
middleware(bot);

// Muat dan jalankan command handler
const cmd = new CommandHandler(bot, path.resolve(__dirname, "commands"));
cmd.load();

// Inisialisasi bot settings dan jalankan bot
initBotSettings()
    .then(() => bot.launch())
    .catch(error => consolefy.error(`Error: ${util.format(error)}`));