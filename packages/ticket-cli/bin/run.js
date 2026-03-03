#!/usr/bin/env node

import { execute } from '@oclif/core'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

await execute({
  development: false,
  dir: path.join(__dirname, '..', 'lib')
})