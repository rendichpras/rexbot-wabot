module.exports = {
    name: "sc",
    aliases: ["script", "source", "sourcecode"],
    category: "information",
    code: async (ctx) => {
        return await ctx.reply(
            `${formatter.quote("https://github.com/rendichpras/rexbot-wabot")}\n` +
            "\n" +
            config.msg.footer
        ); // Jika kamu tidak menghapus ini, terima kasih!
    }
};