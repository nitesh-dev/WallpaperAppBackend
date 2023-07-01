import { promises } from 'fs'
import { ProcessStack } from './DataType'


export async function loadFile() {
    let data = await promises.readFile('./src/temp/stack.json', 'utf8')
    return JSON.parse(data) as ProcessStack
}

export async function saveFile(data: ProcessStack) {
    const json = JSON.stringify(data)
    await promises.writeFile('./src/temp/stack.json', json)
}
