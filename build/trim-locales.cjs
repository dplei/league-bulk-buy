/**
 * Electron 自带 55 个语言包，占 45MB，只留中英文
 * electron-builder 的 electronLanguages 不支持 Windows，只能打包后删
 */
const { readdir, rm } = require('fs/promises')
const { join } = require('path')

const KEEP = new Set(['zh-CN.pak', 'en-US.pak'])

exports.default = async function trimLocales(context) {
  const dir = join(context.appOutDir, 'locales')
  const files = await readdir(dir)
  await Promise.all(files.filter((f) => !KEEP.has(f)).map((f) => rm(join(dir, f))))
  console.log(`  • trim locales      removed=${files.length - KEEP.size}`)
}
