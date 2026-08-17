Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Runner = Join-Path $PSScriptRoot 'grs-tools.ps1'
$Package = Join-Path $Root 'package.json'
$Version = try { (Get-Content $Package -Raw | ConvertFrom-Json).version } catch { '?' }
$Branch = try { (& git -C $Root branch --show-current 2>$null).Trim() } catch { '?' }

$form = New-Object System.Windows.Forms.Form
$form.Text = 'GRS Developer Toolbox'
$form.StartPosition = 'CenterScreen'
$form.Size = New-Object System.Drawing.Size(860,610)
$form.MinimumSize = New-Object System.Drawing.Size(760,540)
$form.Font = New-Object System.Drawing.Font('Segoe UI',9)
$form.BackColor = [System.Drawing.Color]::FromArgb(246,248,252)

$head = New-Object System.Windows.Forms.Panel
$head.Dock='Top'; $head.Height=62; $head.BackColor=[System.Drawing.Color]::White
$form.Controls.Add($head)
$title = New-Object System.Windows.Forms.Label
$title.Text='Graphene Resonance Studio · Developer Toolbox'; $title.Font=New-Object System.Drawing.Font('Segoe UI',13,[System.Drawing.FontStyle]::Bold)
$title.Location=New-Object System.Drawing.Point(18,10); $title.AutoSize=$true; $head.Controls.Add($title)
$meta = New-Object System.Windows.Forms.Label
$meta.Text="Version $Version    Branch $Branch"; $meta.ForeColor=[System.Drawing.Color]::FromArgb(100,112,132); $meta.Location=New-Object System.Drawing.Point(20,37); $meta.AutoSize=$true; $head.Controls.Add($meta)

$tabs=New-Object System.Windows.Forms.TabControl
$tabs.Dock='Fill'; $tabs.Padding=New-Object System.Drawing.Point(16,7); $form.Controls.Add($tabs); $tabs.BringToFront()

function Run-Action([string]$Action,[string]$VersionArg='') {
  $args=@('-NoProfile','-ExecutionPolicy','Bypass','-NoExit','-File',('"'+$Runner+'"'),'-Action',$Action)
  if($VersionArg){$args+=@('-Version',$VersionArg)}
  Start-Process powershell.exe -WorkingDirectory $Root -ArgumentList ($args -join ' ')
}
function Add-ActionButton($page,[string]$Text,[string]$Desc,[string]$Action,[int]$X,[int]$Y,[int]$W=230) {
  $b=New-Object System.Windows.Forms.Button
  $b.Text=$Text; $b.Location=New-Object System.Drawing.Point($X,$Y); $b.Size=New-Object System.Drawing.Size($W,38)
  $b.FlatStyle='Flat'; $b.BackColor=[System.Drawing.Color]::White; $b.FlatAppearance.BorderColor=[System.Drawing.Color]::FromArgb(216,223,235)
  $b.Add_Click({ Run-Action $Action }.GetNewClosure()); $page.Controls.Add($b)
  $l=New-Object System.Windows.Forms.Label
  $l.Text=$Desc; $l.Location=New-Object System.Drawing.Point($X,$Y+42); $l.Size=New-Object System.Drawing.Size($W,34); $l.ForeColor=[System.Drawing.Color]::FromArgb(105,116,134)
  $page.Controls.Add($l)
}
function New-Page([string]$Name){$p=New-Object System.Windows.Forms.TabPage;$p.Text=$Name;$p.BackColor=[System.Drawing.Color]::FromArgb(250,251,253);$tabs.TabPages.Add($p);return $p}

$common=New-Page '常用'
Add-ActionButton $common '启动桌面开发版' '安装依赖（如需要）并运行 Electron。' 'dev' 24 24
Add-ActionButton $common '完整工程检查' '插件、结构、科学引擎 parity 与边界检查。' 'check' 276 24
Add-ActionButton $common '全部回归测试' '运行历史功能和当前框架测试。' 'test' 528 24
Add-ActionButton $common '构建 Windows' '生成 Setup 与 Portable。' 'build-windows' 24 112
Add-ActionButton $common '打开项目目录' '在资源管理器中打开工程根目录。' 'open-root' 276 112
Add-ActionButton $common '打开开发文档' '打开 docs/，新会话先读 HANDOFF。' 'open-docs' 528 112
Add-ActionButton $common '打开 Windows 输出' '打开 dist/。' 'open-dist' 24 200
Add-ActionButton $common '查看 Git 状态' '检查当前分支与未提交修改。' 'git-status' 276 200

$android=New-Page 'Android'
Add-ActionButton $android '检查 Android 环境' '检查 Node、JDK、adb、ANDROID_HOME、API 36。' 'android-check' 24 24
Add-ActionButton $android '构建 Debug APK' '同步 Web 资源、Prebuild、Gradle assembleDebug。' 'android-build' 276 24
Add-ActionButton $android '连接设备运行' '使用 expo run:android 编译并安装。' 'android-run' 528 24
Add-ActionButton $android '安装已有 APK' 'adb install -r mobile-dist 中的 debug APK。' 'android-install' 24 112
Add-ActionButton $android '打开 APK 输出' '打开 mobile-dist/。' 'open-mobile-dist' 276 112

$update=New-Page '局域网更新'
Add-ActionButton $update '启动更新服务器' '运行可信局域网更新服务。' 'update-server' 24 24
Add-ActionButton $update '发布已有构建' '发布 dist/latest.yml 对应的构建。' 'publish-update' 276 24
Add-ActionButton $update '安装服务器自启动' '创建登录时启动的 Windows 计划任务。' 'update-autostart-install' 24 112
Add-ActionButton $update '移除服务器自启动' '删除 GRS LAN Update Server 计划任务。' 'update-autostart-remove' 276 112
$verLabel=New-Object System.Windows.Forms.Label;$verLabel.Text='新版本号';$verLabel.Location=New-Object System.Drawing.Point(24,218);$verLabel.AutoSize=$true;$update.Controls.Add($verLabel)
$verBox=New-Object System.Windows.Forms.TextBox;$verBox.Text='3.20.0-plugin.2';$verBox.Location=New-Object System.Drawing.Point(24,242);$verBox.Size=New-Object System.Drawing.Size(230,27);$update.Controls.Add($verBox)
$pub=New-Object System.Windows.Forms.Button;$pub.Text='构建并发布这个版本';$pub.Location=New-Object System.Drawing.Point(276,238);$pub.Size=New-Object System.Drawing.Size(230,36);$pub.FlatStyle='Flat';$pub.BackColor=[System.Drawing.Color]::FromArgb(49,94,251);$pub.ForeColor=[System.Drawing.Color]::White;$pub.FlatAppearance.BorderSize=0
$pub.Add_Click({Run-Action 'build-publish-update' $verBox.Text.Trim()});$update.Controls.Add($pub)

$plugin=New-Page '插件与维护'
Add-ActionButton $plugin '重新生成插件索引' '扫描 src/plugins 并生成内置插件入口。' 'plugin-index' 24 24
Add-ActionButton $plugin '验证所有插件' '检查 manifest、ID、入口和 API。' 'plugin-validate' 276 24
Add-ActionButton $plugin '完整工程检查' '推荐交付前执行。' 'check' 528 24
Add-ActionButton $plugin '打开插件示例' '打开 examples/external-plugins。' 'open-examples' 24 112

$foot=New-Object System.Windows.Forms.Label
$foot.Text='所有按钮最终调用 tools/windows/grs-tools.ps1；根目录只保留 GRS.cmd 与 GRS_GUI.cmd 两个入口。'
$foot.Dock='Bottom';$foot.Height=28;$foot.Padding=New-Object System.Windows.Forms.Padding(12,5,0,0);$foot.ForeColor=[System.Drawing.Color]::FromArgb(120,130,148);$form.Controls.Add($foot);$foot.BringToFront()

[void]$form.ShowDialog()
