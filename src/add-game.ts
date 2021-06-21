import { Client, TextChannel } from "discord.js"
import { readContent } from "./tools"
import { writeJson } from "fs-extra"
import { config } from 'dotenv'
import { join } from "path"

const contentPath = 'content/games.json';

type Game = {
    uuid: string
    icons: { [key in string]: string }
}

type Games = { [key in string]: Game }

const uploadGame = async (channel: TextChannel, path: string) => {
    let files = Array.from(Array(9).keys()).map((e, i) => {
        const name = `${1 + i}.ico`
        return {
            attachment: join(path, name),
            name
        }
    })

    return (await channel.send({ files })).attachments.map(a => a.url)
}

(async () => {
    config()

    const { gameUuid, fileStashChannel, discordToken, iconsPath } = process.env;

    if (gameUuid === undefined) {
        throw new Error("gameUuid is undefined");
    }

    if (fileStashChannel === undefined) {
        throw new Error("fileStashChannel is undefined");
    }

    if (discordToken === undefined) {
        throw new Error("fileStashChannel is undefined");
    }

    if (iconsPath === undefined) {
        throw new Error("fileStashChannel is undefined");
    }

    const games = await readContent<Games>(contentPath)

    const client = new Client()
    await client.login(discordToken)

    const channel = await client.channels.fetch(fileStashChannel, false)
    const icons = await uploadGame(channel as TextChannel, iconsPath)

    games[gameUuid] = {
        uuid: gameUuid,
        icons: Object.fromEntries(icons.map((e, i) => [1 + i, e]))
    }

    await writeJson(contentPath, games)

    process.exit(0)
})()
