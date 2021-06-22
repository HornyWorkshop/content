import { config } from 'dotenv'
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest'
import { createHash } from 'crypto'
import { readContent } from './tools';
import { writeJson } from 'fs-extra';

config()

const contentPath = 'content/plugins.json'

const client = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

const providers = [{
    owner: 'BepInEx',
    repo: 'BepInEx',
    url: 'https://github.com/BepInEx/BepInEx'
}];

type PluginAuthor = {
    name: string
    urls: {
        type: string
        value: string
    }[]
}

type PluginInfo = {
    downloadUrl: string
}

type PluginArchs = { [key in string]: PluginInfo | null }

type PluginVersion = {
    version: string
    arch: PluginArchs
}

type PluginVersions = { [key in number]: PluginVersion }

type Plugin = {
    author: PluginAuthor
    readmeUrl?: string
    versions: PluginVersions
}

type Plugins = { [key in string]: Plugin }

type Data = RestEndpointMethodTypes["repos"]["getLatestRelease"]["response"]["data"]

const getOrCreatePlugin = (plugins: Plugins, data: Data, url: string): Plugin => {
    const hash = createHash('SHA3-224')
    const result = hash.update(url).digest('hex')

    if (result in plugins) {
        return plugins[result]
    }

    const plugin: Plugin = {
        author: {
            name: '',
            urls: []
        },
        versions: {}
    }

    if (data.author) {
        plugin.author.name = data.author.login
        plugin.author.urls.push({
            type: 'git',
            value: data.author.html_url
        })
    }

    plugins[result] = plugin

    return plugin
}

(async () => {
    const plugins = await readContent<Plugins>(contentPath)

    for (const provider of providers) {
        const { owner, repo } = provider
        const latestRelease = await client.repos.getLatestRelease({ owner, repo })

        if (latestRelease.status != 200) {
            throw new Error()
        }

        const { url } = provider
        const { data } = latestRelease

        const { data: dataReadme } = await client.repos.getReadme({ owner, repo })

        const plugin = getOrCreatePlugin(plugins, data, url)
        if (dataReadme.download_url) 
        {
            console.warn('No readme');
            plugin.readmeUrl = dataReadme.download_url
        }

        if (data.tag_name in plugin.versions) {
            console.log(`skip: ${owner} / ${repo} / ${data.tag_name}`);
            continue;
        }

        plugin.versions[data.id] = {
            version: data.tag_name,
            arch: Object.fromEntries(data.assets.map(asset => {
                let regex = /BepInEx_((?<arch>.*?))_/.exec(asset.name)
                if (regex === null) {
                    console.error('Regex: null');
                    regex = { groups: {} } as RegExpExecArray
                }

                const { groups } = regex
                if (groups === undefined) {
                    console.error('Regex: groups is undefined');
                    throw new Error();
                }

                if (groups.arch === undefined || !(['x86', 'x64', 'unix'].includes(groups.arch))) {
                    console.error('Undefined architecture:', groups.arch);
                    groups.arch = 'x64'
                }

                return [groups.arch, { downloadUrl: asset.browser_download_url }]
            }))
        }
    }

    await writeJson(contentPath, plugins)
})()