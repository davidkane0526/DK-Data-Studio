const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const backendPath = path.join(root, 'tools', 'windows', 'grs-tools.ps1');
const guiPath = path.join(root, 'tools', 'windows', 'grs-gui.ps1');
const cmdPath = path.join(root, 'GRS.cmd');
const guiCmdPath = path.join(root, 'GRS_GUI.cmd');

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const backend = read(backendPath);
const gui = read(guiPath);
const cmd = read(cmdPath);
const guiCmd = read(guiCmdPath);

// PowerShell reserves $args as an automatic variable. Using it as a formal
// parameter caused npm arguments to disappear under Windows PowerShell 5.1.
assert(!/\[string\[\]\]\s*\$Args\b/i.test(backend), 'Backend must not declare $Args as a parameter.');
assert(!/@Args\b/i.test(backend), 'Backend must not splat the automatic $Args variable.');
assert(/\[string\[\]\]\s*\$Arguments\s*=\s*@\(\)/.test(backend), 'Invoke-Step must use an explicit $Arguments parameter.');
assert(/Invoke-Step\s+-FilePath\s+'npm\.cmd'\s+-Arguments\s+@\('install'\)/.test(backend), 'npm install arguments must be explicit.');

// Geometry must use typed constructors instead of New-Object overload syntax;
// expressions such as ($Y + 42) were parsed as extra constructor arguments.
assert(!/New-Object\s+System\.Drawing\./i.test(gui), 'GUI contains fragile System.Drawing New-Object constructor syntax.');
assert(/\[System\.Drawing\.Point\]::new\(/.test(gui), 'GUI should use typed Point constructors.');
assert(/FlowLayoutPanel/.test(gui) && /Resize-ActionCards/.test(gui), 'GUI should retain responsive card layout.');
assert(/install-deps/.test(gui) && /doctor/.test(gui), 'GUI should expose dependency repair and diagnostics.');

assert(/tools\\windows\\grs-tools\.ps1/i.test(cmd), 'GRS.cmd must route to grs-tools.ps1.');
assert(/tools\\windows\\grs-gui\.ps1/i.test(guiCmd), 'GRS_GUI.cmd must route to grs-gui.ps1.');

// Windows PowerShell 5.1 needs a BOM to reliably read Chinese source text.
for (const file of [backendPath, guiPath]) {
  const data = fs.readFileSync(file);
  assert(data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF,
    `${path.basename(file)} must be UTF-8 with BOM for Windows PowerShell 5.1.`);
}

console.log('Windows tooling regression checks passed.');
