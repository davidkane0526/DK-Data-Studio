const path = require('path');

const PLUGIN_PACKAGE_SCHEMA = 1;
const MAX_FILES = 64;
const MAX_FILE_CHARS = 4 * 1024 * 1024;
const MAX_TOTAL_CHARS = 8 * 1024 * 1024;

function validPluginId(id) {
  return /^[a-z0-9][a-z0-9._-]*$/i.test(String(id || ''));
}

function normalizeRelativeFile(name) {
  const raw = String(name || '').replace(/\\/g, '/').trim();
  if (!raw || raw.startsWith('/') || /^[a-z]:\//i.test(raw)) throw new Error(`Invalid plugin file path: ${name}`);
  const normalized = path.posix.normalize(raw);
  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Error(`Unsafe plugin file path: ${name}`);
  }
  if (normalized.length > 220) throw new Error(`Plugin file path is too long: ${name}`);
  return normalized;
}

function normalizePluginPackage(input, { allowBuiltinId = false } = {}) {
  const pkg = typeof input === 'string' ? JSON.parse(input) : input;
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new Error('Plugin package must be an object.');
  if (Number(pkg.schema) !== PLUGIN_PACKAGE_SCHEMA) throw new Error(`Unsupported plugin package schema: ${pkg.schema}`);

  const sourceManifest = pkg.manifest;
  if (!sourceManifest || typeof sourceManifest !== 'object') throw new Error('Plugin package manifest is missing.');
  const id = String(sourceManifest.id || '').trim();
  if (!validPluginId(id)) throw new Error(`Invalid plugin id: ${id}`);
  if (!allowBuiltinId && id.startsWith('builtin.')) throw new Error('The builtin.* namespace is reserved for application plugins.');

  const name = String(sourceManifest.name || '').trim();
  const version = String(sourceManifest.version || '').trim();
  const apiVersion = String(sourceManifest.apiVersion || '1.0.0').trim();
  const entry = normalizeRelativeFile(sourceManifest.entry || 'plugin.js');
  if (!name) throw new Error('Plugin manifest.name is required.');
  if (!version) throw new Error('Plugin manifest.version is required.');
  if (!apiVersion.startsWith('1.')) throw new Error(`Unsupported Plugin API: ${apiVersion}`);

  const rawFiles = pkg.files;
  if (!rawFiles || typeof rawFiles !== 'object' || Array.isArray(rawFiles)) throw new Error('Plugin package files are missing.');
  const fileEntries = Object.entries(rawFiles);
  if (!fileEntries.length) throw new Error('Plugin package contains no files.');
  if (fileEntries.length > MAX_FILES) throw new Error(`Plugin package contains too many files (${fileEntries.length}/${MAX_FILES}).`);

  const files = {};
  let totalChars = 0;
  for (const [rawName, rawContent] of fileEntries) {
    const fileName = normalizeRelativeFile(rawName);
    if (Object.prototype.hasOwnProperty.call(files, fileName)) throw new Error(`Duplicate plugin file: ${fileName}`);
    if (typeof rawContent !== 'string') throw new Error(`Plugin package supports text files only: ${fileName}`);
    if (rawContent.length > MAX_FILE_CHARS) throw new Error(`Plugin file is too large: ${fileName}`);
    totalChars += rawContent.length;
    if (totalChars > MAX_TOTAL_CHARS) throw new Error('Plugin package is too large.');
    files[fileName] = rawContent;
  }
  if (!Object.prototype.hasOwnProperty.call(files, entry)) throw new Error(`Plugin entry not found in package: ${entry}`);

  const scripts = Array.isArray(sourceManifest.scripts) && sourceManifest.scripts.length
    ? sourceManifest.scripts.map(normalizeRelativeFile)
    : [entry];
  if (!scripts.includes(entry)) scripts.push(entry);
  for (const fileName of scripts) {
    if (!Object.prototype.hasOwnProperty.call(files, fileName)) throw new Error(`Plugin script not found: ${fileName}`);
    if (!fileName.toLowerCase().endsWith('.js')) throw new Error(`Plugin script must be JavaScript: ${fileName}`);
  }

  const styles = Array.isArray(sourceManifest.styles) ? sourceManifest.styles.map(normalizeRelativeFile) : [];
  for (const fileName of styles) {
    if (!Object.prototype.hasOwnProperty.call(files, fileName)) throw new Error(`Plugin stylesheet not found: ${fileName}`);
    if (!fileName.toLowerCase().endsWith('.css')) throw new Error(`Plugin stylesheet must be CSS: ${fileName}`);
  }

  const manifest = {
    ...sourceManifest,
    id,
    name,
    version,
    apiVersion,
    entry,
    scripts: [...new Set(scripts)],
    styles: [...new Set(styles)],
    enabled: sourceManifest.enabled !== false,
    source: 'external'
  };

  return {
    schema: PLUGIN_PACKAGE_SCHEMA,
    manifest,
    files,
    installedAt: pkg.installedAt || null
  };
}

function pluginPackageFileName(id) {
  if (!validPluginId(id)) throw new Error(`Invalid plugin id: ${id}`);
  return `${id}.dkplugin`;
}

module.exports = {
  PLUGIN_PACKAGE_SCHEMA,
  normalizePluginPackage,
  normalizeRelativeFile,
  pluginPackageFileName,
  validPluginId
};
