import Logger from "pino"

export default Logger({
    level: process.env.LOG_LEVEL || "info",
    transport: {
        target: "pino-pretty", // Fixed: removed the line break between 'target' and ':'
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
        },
    },
})