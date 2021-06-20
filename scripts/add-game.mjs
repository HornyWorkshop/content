import fsExtra from "fs-extra"
const { readJson, writeJson } = fsExtra

import { Client, TextChannel } from "discord.js"
import { config } from 'dotenv'
import { join } from "path"

const readGames = async () => {
    try {
        return await readJson(process.env.gamesPath, { throws: false })
    }
    catch {
        return {}
    }
}

(async () => {
    config()

    const games = await readGames()

    const client = new Client()
    await client.login(process.env.discordToken)

    const channel = await client.channels.fetch(process.env.fileStashChannel, false)
    const icons = await uploadGame(channel, process.env.iconsPath)

    games[process.env.gameUuid] = {
        uuid: process.env.gameUuid,
        icons: Object.fromEntries(icons.map((e, i) => [1 + i, e]))
    }

    await writeJson(process.env.gamesPath, games)

    process.exit(0)
})()

/**
 * @param {TextChannel} channel
 * @param {string} path
 * 
 * @returns {Promise<string>}
 */
const uploadGame = async (channel, path) => {
    let files = Array.from(Array(9).keys()).map((e, i) => {
        const name = `${1 + i}.ico`
        return {
            attachment: join(path, name),
            name
        }
    })

    return (await channel.send({ files })).attachments.map(a => a.url)
}