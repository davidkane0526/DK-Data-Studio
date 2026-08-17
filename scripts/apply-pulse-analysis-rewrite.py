from pathlib import Path
import base64, json, re, subprocess, zlib
ROOT=Path(__file__).resolve().parents[1]
PAYLOAD=ROOT/'.pulse-rewrite'
def dec(name): return zlib.decompress(base64.b64decode((PAYLOAD/name).read_text())).decode('utf-8')

def replace_between(text,start_marker,end_marker,replacement):
    start=text.find(start_marker)
    if start<0: raise SystemExit('start marker not found: '+start_marker)
    end=text.find(end_marker,start)
    if end<0: raise SystemExit('end marker not found: '+end_marker)
    return text[:start]+replacement+text[end:]

main_new=subprocess.check_output(['git','show','98bb3e25eecdf33936180ab78d884a30f838e83e:main.js'],cwd=ROOT,text=True)
main_new=re.sub(r"\nfunction revealAuxiliaryWindow\(win\) \{.*?\n\}\n", "\n", main_new, flags=re.S)
main_new=main_new.replace("    show: false,\n", "")
main_new=re.sub(r"\n  // The renderer explicitly signals only after the auxiliary activity page is.*?win\.webContents\.once\('did-fail-load', \(\) => revealAuxiliaryWindow\(win\)\);", "", main_new, flags=re.S)
main_new=re.sub(r"\n  ipcMain\.on\('windows:activityReady', event => \{.*?\n  \}\);", "", main_new, flags=re.S)
if any(x in main_new for x in ('windows:activityReady','show: false','revealAuxiliaryWindow')): raise SystemExit('auxiliary readiness gate still present in main.js')
(ROOT/'main.js').write_text(main_new,encoding='utf-8')

app_path=ROOT/'src/app.js'
text=app_path.read_text(encoding='utf-8')
text=replace_between(text,'  function pulseColumnOptions(','\n\n  function terLongCsvText',dec('app.b64'))
app_path.write_text(text,encoding='utf-8')
(ROOT/'src/science/pulse.js').write_text(dec('pulse.b64'),encoding='utf-8')
(ROOT/'src/plugins/pulse-analysis/plugin.js').write_text(dec('plugin.b64'),encoding='utf-8')
(ROOT/'scripts/test-pulse-analysis.js').write_text(dec('test.b64'),encoding='utf-8')

manifest_path=ROOT/'src/plugins/pulse-analysis/plugin.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
manifest['version']='2.1.0'
manifest['description']='Batch pulse/read transient extraction with unequal write/read widths and current-only data support.'
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

pkg_path=ROOT/'package.json'
pkg=json.loads(pkg_path.read_text(encoding='utf-8'))
for key in ('test','check'):
    cmd=pkg['scripts'][key]
    needle='node scripts/test-pulse-analysis.js'
    if needle not in cmd:
        anchor='node scripts/test-workspace-safeguards.js'
        cmd=cmd.replace(anchor,needle+' && '+anchor,1) if anchor in cmd else cmd+' && '+needle
        pkg['scripts'][key]=cmd
pkg_path.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Pulse analysis rewrite applied.')
