#!/usr/bin/env node
/**
 * 本地一键构建脚本
 * 1. 检查 Payload CMS 是否在运行（构建时需要从它拉数据）
 * 2. CMS 在线 → 执行 astro build
 *
 * 用法：npm run build:local
 */

import { execSync } from 'node:child_process'

const PAYLOAD_URL = process.env.PUBLIC_PAYLOAD_URL || 'http://localhost:3000'

async function main() {
  console.log(`[build:local] ① 检查 CMS（${PAYLOAD_URL}）是否在线...`)

  let ok = false
  try {
    const res = await fetch(`${PAYLOAD_URL}/api/posts?limit=1`)
    ok = res.ok
  } catch {
    ok = false
  }

  if (!ok) {
    console.error('')
    console.error('[build:local] ❌ CMS 未运行！构建会拿到空数据。')
    console.error('')
    console.error('   请先在另一个终端启动 CMS：')
    console.error('   cd D:\\web\\bubblecrisp-cms')
    console.error('   npm run dev')
    console.error('')
    process.exit(1)
  }

  console.log('[build:local] ② CMS 在线 ✅，开始构建前端...')
  execSync('npx astro build', { stdio: 'inherit' })
  console.log('[build:local] ✅ 构建完成，产物在 dist/')
}

main()
