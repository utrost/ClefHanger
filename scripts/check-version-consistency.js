#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const DEFAULT_FILES = ['index.html', 'src/app.js', 'sw.js'];

function defaultReadText(rootDir) {
  const rootPath = rootDir instanceof URL ? fileURLToPath(rootDir) : rootDir;
  return (path) => readFileSync(resolve(rootPath, path), 'utf8');
}

function matchOne(text, pattern, label, errors) {
  const match = text.match(pattern);
  if (!match) errors.push(`Missing ${label}`);
  return match?.[1] ?? null;
}

function collectVersionQueries(text) {
  const queries = [];
  const patterns = [
    /(?:src|href)=["']([^"']+\?v=([^"']+))["']/g,
    /register\(\s*['"]([^'"]+\?v=([^'"]+))['"]\s*\)/g,
    /from\s+['"]([^'"]+\?v=([^'"]+))['"]/g,
    /export\s+[^;]*\sfrom\s+['"]([^'"]+\?v=([^'"]+))['"]/g,
    /import\s*\(\s*['"]([^'"]+\?v=([^'"]+))['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      queries.push({ specifier: match[1], version: match[2] });
    }
  }
  return queries;
}

function appImportToSwAsset(specifier) {
  const bare = specifier.split('?')[0];
  if (bare.startsWith('./core/')) return `./src/${bare.slice(2)}`;
  if (bare.startsWith('./ui/')) return `./src/${bare.slice(2)}`;
  if (bare.startsWith('./src/')) return bare;
  return null;
}

function swContainsAsset(sw, asset) {
  return sw.includes(`'${asset}'`) || sw.includes(`"${asset}"`);
}

export function validateVersionConsistency({ rootDir = new URL('..', import.meta.url), readText } = {}) {
  const read = readText ?? defaultReadText(rootDir);
  const errors = [];
  const checkedFiles = [];

  const html = read('index.html');
  checkedFiles.push('index.html');
  const app = read('src/app.js');
  checkedFiles.push('src/app.js');
  const sw = read('sw.js');
  checkedFiles.push('sw.js');

  const htmlVersion = matchOne(html, /data-app-version="([^"]+)"/, 'index.html data-app-version', errors);
  const appVersion = matchOne(app, /const\s+appVersion\s*=\s*['"]([^'"]+)['"]/, 'src/app.js appVersion', errors);
  const sliceMarker = matchOne(html, /<p class="microcopy">([^<]+)<\/p>/, 'visible slice marker', errors);
  const cacheName = matchOne(sw, /const\s+CACHE_NAME\s*=\s*['"]([^'"]+)['"]/, 'sw.js CACHE_NAME', errors);

  if (htmlVersion && appVersion && htmlVersion !== appVersion) {
    errors.push(`index.html data-app-version ${htmlVersion} does not match src/app.js appVersion ${appVersion}`);
  }

  const expectedVersion = appVersion ?? htmlVersion;
  if (expectedVersion) {
    const htmlQueries = collectVersionQueries(html);
    const appQueries = collectVersionQueries(app);

    const appScriptQuery = htmlQueries.find(({ specifier }) => specifier.startsWith('./src/app.js?v='));
    if (!appScriptQuery) {
      errors.push('Missing index.html app script query');
    } else if (appScriptQuery.version !== expectedVersion) {
      errors.push(`index.html app script query ${appScriptQuery.version} does not match appVersion ${expectedVersion}`);
    }

    const swQuery = htmlQueries.find(({ specifier }) => specifier.startsWith('./sw.js?v='));
    if (!swQuery) {
      errors.push('Missing index.html service-worker query');
    } else if (swQuery.version !== expectedVersion) {
      errors.push(`index.html service-worker query ${swQuery.version} does not match appVersion ${expectedVersion}`);
    }

    for (const { specifier, version } of [...htmlQueries, ...appQueries]) {
      if (version !== expectedVersion) {
        errors.push(`${specifier} uses query ${version}, expected ${expectedVersion}`);
      }
    }
  }

  for (const asset of ['./', './index.html', './manifest.webmanifest', './src/app.js']) {
    if (!swContainsAsset(sw, asset)) errors.push(`service worker precaches ${asset}`);
  }

  for (const { specifier } of collectVersionQueries(app)) {
    const asset = appImportToSwAsset(specifier);
    if (asset && !swContainsAsset(sw, asset)) {
      errors.push(`service worker precaches ${asset}`);
    }
  }

  return {
    appVersion,
    htmlVersion,
    sliceMarker,
    cacheName,
    checkedFiles: DEFAULT_FILES.filter((file) => checkedFiles.includes(file)),
    errors,
  };
}

function main() {
  const result = validateVersionConsistency({ rootDir: new URL('..', import.meta.url) });
  if (result.errors.length > 0) {
    console.error('Version consistency check failed:');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Version consistency OK: ${result.appVersion} / ${result.cacheName}`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
const modulePath = fileURLToPath(import.meta.url);
if (invokedPath === modulePath) main();
