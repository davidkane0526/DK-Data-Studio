const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ProjectFileSafety } = require('../desktop/project-file-safety');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dkds-project-safety-'));
try {
  const downloads = path.join(tmp, 'Downloads');
  const recovery = path.join(tmp, 'userData', 'project-recovery');
  const audit = path.join(tmp, 'userData', 'project-file-audit.jsonl');
  fs.mkdirSync(downloads, { recursive:true });
  const projectPath = path.join(downloads, 'old-project.dkds.json');
  const original = JSON.stringify({ schema:1, datasets:[{name:'legacy'}] }, null, 2) + '\n';
  fs.writeFileSync(projectPath, original, 'utf8');

  const safety = new ProjectFileSafety({
    recoveryRoot:recovery,
    auditPath:audit,
    parseBytes:bytes=>JSON.parse(Buffer.from(bytes).toString('utf8'))
  });

  safety.registerOpen(projectPath);
  assert.strictEqual(fs.readFileSync(projectPath, 'utf8'), original, 'opening a project must not move, delete, rename or rewrite the source file');
  assert.strictEqual(safety.trackedPaths().length, 1, 'opened project must be tracked for quit/update protection');

  const updated = JSON.stringify({ schema:2, datasets:[{name:'legacy'}], plugins:{} }, null, 2) + '\n';
  safety.safeWrite(projectPath, updated);
  assert.strictEqual(fs.readFileSync(projectPath, 'utf8'), updated, 'safe save must leave a valid project at the exact original path');

  const report = safety.prepareForQuit('test-close');
  assert.strictEqual(report.length, 1);
  assert.strictEqual(report[0].exists, true, 'closing the application must observe the opened project still present');
  assert.ok(report[0].backup && fs.existsSync(report[0].backup), 'a recovery copy must exist outside the source/download directory before quit');
  assert.ok(fs.existsSync(audit), 'project file operations must leave a local audit trail');
  const auditText=fs.readFileSync(audit,'utf8');
  assert.ok(auditText.includes('"event":"open"') && auditText.includes('"event":"quit-check"'), 'audit must cover open and close boundaries');

  assert.deepStrictEqual(safety.pathsInside(downloads), [path.resolve(projectPath)], 'install-root hazard detection must identify an opened project inside that tree');

  const main=fs.readFileSync(path.join(__dirname,'..','desktop','main.js'),'utf8');
  const updater=fs.readFileSync(path.join(__dirname,'..','desktop','update-client.js'),'utf8');
  assert.ok(main.includes("getProjectFileSafety().registerOpen(filePath)"), 'desktop openProject must register a recovery snapshot');
  assert.ok(main.includes("getProjectFileSafety().safeWrite(filePath, serialized)"), 'desktop project save must use the safe writer');
  assert.ok(main.includes("prepareForQuit('app-before-quit')"), 'desktop quit must checkpoint opened project files');
  assert.ok(main.includes("pathsInside(installRoot)"), 'explicit updater install must reject an opened project inside the install tree');
  assert.ok(/autoInstallOnAppQuit\s*=\s*false/.test(updater), 'normal application quit must never auto-install an update');
  assert.ok(!/autoInstallOnAppQuit\s*=\s*this\.canApply/.test(updater), 'legacy on-quit update installation path must be absent');
  assert.ok(!/shell\.trashItem|moveItemToTrash/.test(main), 'desktop runtime must not expose a recycle-bin deletion path for projects');

  console.log('v3.61.63 project-file safety PASS: Downloads source survives open/save/quit, recovery/audit exist, and update-on-quit is disabled.');
} finally {
  fs.rmSync(tmp, { recursive:true, force:true });
}
