// Impor modul dan dependensi yang diperlukan
require("./config.js");
const pkg = require("./package.json");
const tools = require("./tools/exports.js");
const {
    Formatter
} = require("@itsreimau/gktw");
const {
    Consolefy
} = require("@mengkodingan/consolefy");
const CFonts = require("cfonts");
const http = require("node:http");
const prisma = require('./lib/prisma');

// Inisialisasi Consolefy untuk logging
const c = new Consolefy({
    tag: pkg.name
});

// Tetapkan variabel global
config.bot.version = `v${pkg.version}`;
Object.assign(global, {
    config,
    consolefy: c,
    prisma,
    formatter: Formatter,
    tools
});

c.log("Starting..."); // Logging proses awal

// Tampilkan nama proyek
CFonts.say(pkg.name, {
    font: "block",
    align: "center",
    colors: ["cyanBright", "white"],
    background: "transparent",
    letterSpacing: 1,
    lineHeight: 1,
    space: true
});

// Tampilkan deskripsi dan informasi pengembang
CFonts.say(
    `'${pkg.description}'\n` +
    `By ${pkg.author}`, {
        font: "console",
        align: "center",
        colors: ["white", "cyan"],
        lineHeight: 1
    }
);

// Jalankan server jika diaktifkan dalam konfigurasi
if (config.system.useServer) {
    const {
        port
    } = config.system;
    http.createServer((_, res) => res.end(`${pkg.name} berjalan di port ${port}`)).listen(port, () => c.success(`${pkg.name} runs on port ${port}`));
}

require("./main.js"); // Jalankan modul utama