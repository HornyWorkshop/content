import { readJson } from 'fs-extra'

export const readContent = async <T = {}|[]>(path: string) => {
    try {
        return await readJson(path, { throws: false }) as T
    }
    catch {
        return {} as T
    }
}