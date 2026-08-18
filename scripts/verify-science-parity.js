const { execFileSync } = require('child_process');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const current = require(path.join(root, 'src', 'analysis.js'));
const baselineRef = process.env.DKDS_PARITY_BASELINE_REF || 'main';

function readBaselineSource(relativePath) {
  return execFileSync('git', ['show', `${baselineRef}:${relativePath}`], {
    cwd: root,
    encoding: 'utf8',
  });
}

function resolveBaselineModule(parentPath, request) {
  if (!request.startsWith('./') && !request.startsWith('../')) {
    throw new Error(`Unsupported baseline dependency ${request} from ${parentPath}`);
  }
  let resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(parentPath), request)
  );
  if (!path.posix.extname(resolved)) resolved += '.js';
  return resolved;
}

function loadBaselineModule(relativePath, context, cache) {
  const normalizedPath = path.posix.normalize(relativePath);
  if (cache.has(normalizedPath)) return cache.get(normalizedPath).exports;

  const source = readBaselineSource(normalizedPath);
  const moduleRecord = { exports: {} };
  cache.set(normalizedPath, moduleRecord);

  const wrapper = vm.runInContext(
    `(function(module, exports, require, __filename, __dirname) {\n${source}\n})`,
    context,
    { filename: `${baselineRef}/${normalizedPath}` }
  );

  const localRequire = request => loadBaselineModule(
    resolveBaselineModule(normalizedPath, request),
    context,
    cache
  );

  wrapper(
    moduleRecord,
    moduleRecord.exports,
    localRequire,
    normalizedPath,
    path.posix.dirname(normalizedPath)
  );
  return moduleRecord.exports;
}

function loadBaseline() {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
  };
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  return loadBaselineModule('src/analysis.js', context, new Map());
}

const baseline = loadBaseline();

function stable(value) {
  return JSON.stringify(value, (key, v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return Number(v.toPrecision(13));
    return v;
  });
}

function equal(label, a, b) {
  const sa = stable(a);
  const sb = stable(b);
  if (sa !== sb) {
    console.error(`PARITY FAILED: ${label}`);
    console.error('baseline:', sa.slice(0, 2000));
    console.error('current :', sb.slice(0, 2000));
    process.exit(2);
  }
  console.log(`PARITY OK: ${label}`);
}

const iv = {
  name: 'vg=5.csv',
  path: 'vg=5.csv',
  text: 'Vd,I\n0,1e-9\n1,5e-9\n2,2e-9\n1,4e-9\n0,1e-9\n-1,3e-9\n-2,1e-9\n-1,2e-9\n0,1e-9',
};
equal('parseCsv', baseline.parseCsv(iv), current.parseCsv(iv));
equal('buildSweeps', baseline.buildSweeps(baseline.parseCsv(iv)), current.buildSweeps(current.parseCsv(iv)));

const sweep = current.buildSweeps(current.parseCsv(iv))[0];
const settings = current.preset('balanced');
equal(
  'transformSweep:dlog',
  baseline.transformSweep(sweep, 'dlog', {}),
  current.transformSweep(sweep, 'dlog', {})
);
equal(
  'detectPeaks',
  baseline.detectPeaks(sweep, settings, {}),
  current.detectPeaks(sweep, settings, {})
);

const terDatasets = [{
  name: 'vg=5.csv',
  path: 'vg=5.csv',
  vg: 5,
  points: [
    {v:-1,i:1e-6},{v:0,i:2e-6},{v:1,i:4e-6},
    {v:1,i:1e-6},{v:0,i:2e-6},{v:-1,i:2e-6},
  ],
}];
equal(
  'computeTerMatrix',
  baseline.computeTerMatrix(terDatasets, {vmin:-1,vmax:1,vstep:1,tolerance:.05,currentFloor:1e-15}),
  current.computeTerMatrix(terDatasets, {vmin:-1,vmax:1,vstep:1,tolerance:.05,currentFloor:1e-15})
);

const pulseRows = ['Meta','Time(s),id(0.0),Time(s),vd(0.0)'];
let t = 0;
const blocks = [1,.5,.5,.5,-1,.5,-.5,.5];
for (const v of blocks) {
  for (let k=0;k<20;k++) {
    t += .00005;
    pulseRows.push(`${t},${v===.5?2e-6:v*4e-6},${t},${v}`);
  }
}
const pulseFile = {name:'pulse.csv',path:'pulse.csv',text:pulseRows.join('\n')};
equal('analyzePulseReadData', baseline.analyzePulseReadData(pulseFile, {}), current.analyzePulseReadData(pulseFile, {}));

console.log(`Scientific engine rewrite matches the preserved ${baselineRef} baseline for representative mature workflows.`);
