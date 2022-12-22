import { resolve } from 'path'
import serveStatic from 'serve-static'
import type { MetaOptions, ManifestOptions, IconOptions, PWAContext, WorkboxOptions } from '../types'
import { fromNodeMiddleware } from 'h3'
import { PKG } from './utils'
import { icon } from './icon'
import { manifest } from './manifest'
import { meta, metaRuntime } from './meta'
import { workbox } from './workbox'

interface PWAOptions {
  meta?: Partial<MetaOptions> | false
  icon?: Partial<IconOptions> | false
  workbox?: Partial<WorkboxOptions> | false
  manifest?: Partial<ManifestOptions> | false
}

export default async function pwa (moduleOptions: PWAOptions) {
  const { nuxt } = this
  const moduleContainer = this // TODO: remove dependency when module-utils

  const isBuild = nuxt.options._build
  const isGenerate = nuxt.options.target === 'static' && !nuxt.options.dev
  const isRuntime = !isBuild && !isGenerate

  if (isRuntime) {
    // Load meta.json for SPA renderer
    metaRuntime(nuxt)
    return
  }

  const modules = { icon, manifest, meta, workbox }

  // Shared options context
  nuxt.options.pwa = { ...(nuxt.options.pwa || {}), ...(moduleOptions || {}) }
  const pwa: PWAContext = nuxt.options.pwa

  // Normalize options
  for (const name in modules) {
    // Skip disabled modules
    if (pwa[name] === false || nuxt.options[name] === false) {
      continue
    }
    // Ensure options are an object
    if (pwa[name] === undefined) {
      pwa[name] = {}
    }
    // Backward compatibility for top-level options
    if (nuxt.options[name] !== undefined) {
      pwa[name] = { ...nuxt.options[name], ...pwa[name] }
    }
  }

  // Execute modules in sequence
  for (const name in modules) {
    if (pwa[name] === false) {
      continue
    }
    await modules[name](nuxt, pwa, moduleContainer)
  }

  // Serve dist from disk
  if (nuxt.options.dev) {
    const clientDir = resolve(nuxt.options.buildDir, 'dist/client')
    nuxt.options.serverMiddleware.push({
      path: nuxt.options.build.publicPath,
      handler: fromNodeMiddleware(serveStatic(clientDir))
    })
  }
}

declare module '@nuxt/types/config/index' {
  interface NuxtOptions {
    pwa?: Partial<PWAOptions>
    meta?: Partial<MetaOptions> | false
    icon?: Partial<IconOptions> | false
    workbox?: Partial<WorkboxOptions> | false
    manifest?: Partial<ManifestOptions> | false
  }
}

pwa.meta = PKG
