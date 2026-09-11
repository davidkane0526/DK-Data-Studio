const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function normalizePath(value) {
  const text = String(value || '').trim();
  if (!text || /^(?:web|webfs|native|remote|provider):\/\//i.test(text)) return '';
  try { return path.resolve(text); } catch { return ''; }
}

function pathKey(filePath) {
  return crypto.createHash('sha256').update(process.platform === 'win32' ? filePath.toLowerCase() : filePath).digest('hex').slice(0, 16);
}

function safeBaseName(filePath) {
  return path.basename(filePath).replace(/[^0-9A-Za-z._-]/g, '_').slice(0, 96) || 'project.dkds.json';
}

class ProjectFileSafety {
  constructor({ recoveryRoot, auditPath, parseBytes = null } = {}) {
    this.recoveryRoot = path.resolve(String(recoveryRoot || path.join(process.cwd(), '.dkds-project-recovery')));
    this.auditPath = path.resolve(String(auditPath || path.join(this.recoveryRoot, 'project-file-audit.jsonl')));
    this.parseBytes = typeof parseBytes === 'function' ? parseBytes : null;
    this.tracked = new Map();
  }

  _ensureRecoveryRoot() {
    fs.mkdirSync(this.recoveryRoot, { recursive: true });
  }

  _audit(event, detail = {}) {
    try {
      this._ensureRecoveryRoot();
      fs.appendFileSync(this.auditPath, JSON.stringify({ at:new Date().toISOString(), event:String(event || ''), ...detail }) + '\n', 'utf8');
    } catch {}
  }

  _entry(filePath) {
    const resolved = normalizePath(filePath);
    if (!resolved) return null;
    let row = this.tracked.get(resolved);
    if (!row) {
      const dir = path.join(this.recoveryRoot, pathKey(resolved));
      row = { path:resolved, dir, openedBackup:path.join(dir, `opened-${safeBaseName(resolved)}`), latestBackup:path.join(dir, `latest-${safeBaseName(resolved)}`) };
      this.tracked.set(resolved, row);
    }
    return row;
  }

  _copySnapshot(row, target, reason) {
    if (!row || !fs.existsSync(row.path)) return null;
    this._ensureRecoveryRoot();
    fs.mkdirSync(row.dir, { recursive:true });
    fs.copyFileSync(row.path, target);
    try {
      fs.writeFileSync(path.join(row.dir, 'source.json'), JSON.stringify({ sourcePath:row.path, updatedAt:new Date().toISOString() }, null, 2) + '\n', 'utf8');
    } catch {}
    this._audit('snapshot', { reason, path:row.path, backup:target, size:fs.statSync(target).size });
    return target;
  }

  registerOpen(filePath) {
    const row = this._entry(filePath);
    if (!row) return null;
    try {
      if (!fs.existsSync(row.openedBackup)) this._copySnapshot(row, row.openedBackup, 'open-original');
      this._copySnapshot(row, row.latestBackup, 'open-latest');
      this._audit('open', { path:row.path, exists:fs.existsSync(row.path) });
    } catch (err) {
      this._audit('snapshot-error', { reason:'open', path:row.path, error:String(err?.message || err) });
    }
    return row.path;
  }

  safeWrite(filePath, content) {
    const row = this._entry(filePath);
    if (!row) throw new Error('Invalid project file path.');
    const body = Buffer.isBuffer(content) ? content : Buffer.from(String(content ?? ''), 'utf8');
    fs.mkdirSync(path.dirname(row.path), { recursive:true });

    // Always preserve the last on-disk project before replacing it. Recovery
    // storage lives under app userData, outside ordinary project/download paths.
    try { if (fs.existsSync(row.path)) this._copySnapshot(row, row.latestBackup, 'before-save'); } catch (err) {
      this._audit('snapshot-error', { reason:'before-save', path:row.path, error:String(err?.message || err) });
    }

    const tmp = path.join(path.dirname(row.path), `.${path.basename(row.path)}.dkds-tmp-${process.pid}-${Date.now()}`);
    let fd = null;
    try {
      fd = fs.openSync(tmp, 'wx');
      fs.writeFileSync(fd, body);
      fs.fsyncSync(fd);
      fs.closeSync(fd); fd = null;
      if (this.parseBytes) this.parseBytes(fs.readFileSync(tmp));
      fs.renameSync(tmp, row.path);
      if (this.parseBytes) this.parseBytes(fs.readFileSync(row.path));
      this._copySnapshot(row, row.latestBackup, 'after-save');
      this._audit('save', { path:row.path, size:body.length });
      return row.path;
    } catch (err) {
      if (fd !== null) try { fs.closeSync(fd); } catch {}
      this._audit('save-error', { path:row.path, tempPath:tmp, error:String(err?.message || err) });
      throw err;
    } finally {
      try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}
    }
  }

  prepareForQuit(reason = 'app-quit') {
    const report = [];
    for (const row of this.tracked.values()) {
      const exists = fs.existsSync(row.path);
      let backup = null;
      if (exists) {
        try { backup = this._copySnapshot(row, row.latestBackup, reason); } catch (err) {
          this._audit('snapshot-error', { reason, path:row.path, error:String(err?.message || err) });
        }
      }
      report.push({ path:row.path, exists, backup });
      this._audit('quit-check', { reason, path:row.path, exists, backup:backup || null });
    }
    return report;
  }

  trackedPaths() { return [...this.tracked.keys()]; }

  pathsInside(rootPath) {
    const root = normalizePath(rootPath);
    if (!root) return [];
    const prefix = root.endsWith(path.sep) ? root : root + path.sep;
    return this.trackedPaths().filter(candidate => candidate === root || candidate.startsWith(prefix));
  }
}

module.exports = { ProjectFileSafety, normalizePath };
