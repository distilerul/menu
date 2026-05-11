#!/usr/bin/env node
/**
 * Upload all menu PNG images to a Cloudflare R2 bucket.
 *
 * Setup:
 *   1. Copy .env.example → .env and fill in your R2 credentials
 *   2. npm install --prefix scripts (installs @aws-sdk/client-s3)
 *   3. node --env-file=.env scripts/upload-r2.mjs
 *
 * Flags:
 *   --force    Re-upload files that already exist in the bucket (default: skip)
 *   --dry-run  Print what would be uploaded without actually uploading
 *
 * Key layout in R2:  1-meal/<filename>.png
 *                    2-meals/<filename>.png
 *                    3-meals/<filename>.png
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const IMAGES_DIR = join(ROOT, 'images')
const FOLDERS = ['1-meal', '2-meals', '3-meals']
const CONCURRENCY = 8

const FORCE = process.argv.includes('--force')
const DRY_RUN = process.argv.includes('--dry-run')

// ── credentials ─────────────────────────────────────────────────────────────

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
} = process.env

const missing = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']
  .filter((k) => !process.env[k])

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`)
  console.error('Run: node --env-file=.env scripts/upload-r2.mjs')
  process.exit(1)
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

// ── collect files ────────────────────────────────────────────────────────────

const files = []
for (const folder of FOLDERS) {
  const dir = join(IMAGES_DIR, folder)
  let entries
  try {
    entries = await readdir(dir)
  } catch {
    console.warn(`  warn  Folder not found: ${dir}`)
    continue
  }
  for (const entry of entries) {
    if (entry.toLowerCase().endsWith('.png')) {
      files.push({ key: `${folder}/${entry}`, localPath: join(dir, entry) })
    }
  }
}

console.log(`Found ${files.length} PNG files`)
if (DRY_RUN) console.log('(dry run — nothing will be uploaded)\n')

// ── upload with concurrency pool ─────────────────────────────────────────────

let uploaded = 0, skipped = 0, failed = 0

async function processFile({ key, localPath }) {
  if (!FORCE && !DRY_RUN) {
    try {
      await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
      console.log(`  skip  ${key}`)
      skipped++
      return
    } catch {
      // not found — proceed
    }
  }

  if (DRY_RUN) {
    console.log(`  would upload  ${key}`)
    uploaded++
    return
  }

  try {
    const body = await readFile(localPath)
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: 'image/png',
    }))
    console.log(`  ✓  ${key}`)
    uploaded++
  } catch (err) {
    console.error(`  ✗  ${key}  →  ${err.message}`)
    failed++
  }
}

const queue = [...files]
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const file = queue.shift()
      if (file) await processFile(file)
    }
  }),
)

console.log(`\n${DRY_RUN ? 'Dry run' : 'Done'}: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`)
if (failed > 0) process.exit(1)
