Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Runner = Join-Path $PSScriptRoot 'dkds-tools.ps1'
$Package = Join-Path $Root 'package.json'
$Version = try { (Get-Content $Package -Raw | ConvertFrom-Json).version } catch { '?' }
$Branch = try { (& git -C $Root branch --show-current 2>$null).Trim() } catch { '?' }
if (-not $Branch) { $Branch = '?' }

$ColorWindow = [System.Drawing.Color]::FromArgb(245,247,251)
$ColorSurface = [System.Drawing.Color]::White
$ColorPage = [System.Drawing.Color]::FromArgb(249,250,252)
$ColorBorder = [System.Drawing.Color]::FromArgb(214,220,231)
$ColorText = [System.Drawing.Color]::FromArgb(32,38,50)
$ColorMuted = [System.Drawing.Color]::FromArgb(102,112,130)
$ColorAccent = [System.Drawing.Color]::FromArgb(49,94,251)
$ColorAccentHover = [System.Drawing.Color]::FromArgb(39,79,220)

$form = New-Object System.Windows.Forms.Form
$form.Text = 'DK Data Studio · Developer Toolbox'
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.ClientSize = [System.Drawing.Size]::new(980,650)
$form.MinimumSize = [System.Drawing.Size]::new(760,560)
$form.Font = [System.Drawing.Font]::new('Segoe UI',9)
$form.BackColor = $ColorWindow
$form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::Dpi
$toolboxIcon = Join-Path $Root 'assets\dkds-icon.ico'
if (Test-Path $toolboxIcon) { try { $form.Icon = [System.Drawing.Icon]::new($toolboxIcon) } catch {} }

$rootLayout = New-Object System.Windows.Forms.TableLayoutPanel
$rootLayout.Dock = [System.Windows.Forms.DockStyle]::Fill
$rootLayout.ColumnCount = 1
$rootLayout.RowCount = 3
[void]$rootLayout.ColumnStyles.Add([System.Windows.Forms.ColumnStyle]::new([System.Windows.Forms.SizeType]::Percent,100))
[void]$rootLayout.RowStyles.Add([System.Windows.Forms.RowStyle]::new([System.Windows.Forms.SizeType]::Absolute,72))
[void]$rootLayout.RowStyles.Add([System.Windows.Forms.RowStyle]::new([System.Windows.Forms.SizeType]::Percent,100))
[void]$rootLayout.RowStyles.Add([System.Windows.Forms.RowStyle]::new([System.Windows.Forms.SizeType]::Absolute,30))
$form.Controls.Add($rootLayout)

$head = New-Object System.Windows.Forms.TableLayoutPanel
$head.Dock = [System.Windows.Forms.DockStyle]::Fill
$head.ColumnCount = 1
$head.RowCount = 2
$head.BackColor = $ColorSurface
$head.Padding = [System.Windows.Forms.Padding]::new(20,9,20,7)
[void]$head.ColumnStyles.Add([System.Windows.Forms.ColumnStyle]::new([System.Windows.Forms.SizeType]::Percent,100))
[void]$head.RowStyles.Add([System.Windows.Forms.RowStyle]::new([System.Windows.Forms.SizeType]::Absolute,31))
[void]$head.RowStyles.Add([System.Windows.Forms.RowStyle]::new([System.Windows.Forms.SizeType]::Percent,100))
$rootLayout.Controls.Add($head,0,0)

$title = New-Object System.Windows.Forms.Label
$title.Text = 'DK Data Studio · Developer Toolbox'
$title.Font = [System.Drawing.Font]::new('Segoe UI',13,[System.Drawing.FontStyle]::Bold)
$title.ForeColor = $ColorText
$title.Dock = [System.Windows.Forms.DockStyle]::Fill
$title.TextAlign = [System.Drawing.ContentAlignment]::MiddleLeft
$head.Controls.Add($title,0,0)

$meta = New-Object System.Windows.Forms.Label
$meta.Text = "Version $Version    Branch $Branch"
$meta.ForeColor = $ColorMuted
$meta.Dock = [System.Windows.Forms.DockStyle]::Fill
$meta.TextAlign = [System.Drawing.ContentAlignment]::MiddleLeft
$head.Controls.Add($meta,0,1)

$tabs = New-Object System.Windows.Forms.TabControl
$tabs.Dock = [System.Windows.Forms.DockStyle]::Fill
$tabs.Padding = [System.Drawing.Point]::new(16,7)
$tabs.Font = [System.Drawing.Font]::new('Segoe UI',9)
$rootLayout.Controls.Add($tabs,0,1)

$status = New-Object System.Windows.Forms.Label
$status.Text = '就绪'
$status.Dock = [System.Windows.Forms.DockStyle]::Fill
$status.Padding = [System.Windows.Forms.Padding]::new(14,6,8,0)
$status.ForeColor = $ColorMuted
$status.BackColor = $ColorSurface
$rootLayout.Controls.Add($status,0,2)

$script:PageFlows = New-Object System.Collections.ArrayList

function Get-Columns([int]$Width) {
  if ($Width -ge 900) { return 3 }
  if ($Width -ge 610) { return 2 }
  return 1
}

function Resize-ActionCards([System.Windows.Forms.FlowLayoutPanel]$Flow) {
  if (-not $Flow -or $Flow.IsDisposed) { return }
  $width = $Flow.ClientSize.Width
  if ($width -le 0) { return }
  $columns = Get-Columns $width
  $outer = 20
  $cardMargin = 16
  $scrollbarReserve = if ($Flow.VerticalScroll.Visible) { [System.Windows.Forms.SystemInformation]::VerticalScrollBarWidth } else { 0 }
  $usable = [Math]::Max(260, $width - $outer - $scrollbarReserve - ($columns * $cardMargin))
  $cardWidth = [Math]::Max(250, [int][Math]::Floor($usable / $columns))
  foreach ($control in $Flow.Controls) {
    if ($control -is [System.Windows.Forms.Panel] -and $control.Tag -eq 'action-card') {
      $control.Width = $cardWidth
    }
  }
}

function New-Page([string]$Name) {
  $page = New-Object System.Windows.Forms.TabPage
  $page.Text = $Name
  $page.BackColor = $ColorPage
  $page.Padding = [System.Windows.Forms.Padding]::new(0)

  $flow = New-Object System.Windows.Forms.FlowLayoutPanel
  $flow.Dock = [System.Windows.Forms.DockStyle]::Fill
  $flow.AutoScroll = $true
  $flow.WrapContents = $true
  $flow.FlowDirection = [System.Windows.Forms.FlowDirection]::LeftToRight
  $flow.Padding = [System.Windows.Forms.Padding]::new(10,12,10,12)
  $flow.BackColor = $ColorPage
  $page.Controls.Add($flow)
  [void]$tabs.TabPages.Add($page)
  [void]$script:PageFlows.Add($flow)

  $flow.Add_SizeChanged({ Resize-ActionCards $flow }.GetNewClosure())
  return $flow
}

function Run-Action([string]$Action,[string]$VersionArg='') {
  try {
    $runnerQuoted = '"' + $Runner + '"'
    $commandLine = "-NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File $runnerQuoted -Action $Action"
    if ($VersionArg) {
      if ($VersionArg -notmatch '^[0-9A-Za-z.+-]+$') {
        [System.Windows.Forms.MessageBox]::Show('版本号只能包含字母、数字、点、加号和连字符。','DKDS',[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Warning) | Out-Null
        return
      }
      $commandLine += " -Version $VersionArg"
    }
    Start-Process -FilePath 'powershell.exe' -WorkingDirectory $Root -ArgumentList $commandLine
    $status.Text = "已启动：$Action"
  } catch {
    $status.Text = '启动失败'
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'DKDS',[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
  }
}

function Add-ActionCard {
  param(
    [Parameter(Mandatory=$true)][System.Windows.Forms.FlowLayoutPanel]$Flow,
    [Parameter(Mandatory=$true)][string]$Text,
    [Parameter(Mandatory=$true)][string]$Description,
    [Parameter(Mandatory=$true)][string]$Action,
    [switch]$Accent
  )

  $card = New-Object System.Windows.Forms.Panel
  $card.Tag = 'action-card'
  $card.Height = 96
  $card.Width = 280
  $card.Margin = [System.Windows.Forms.Padding]::new(8)
  $card.Padding = [System.Windows.Forms.Padding]::new(1)
  $card.BackColor = $ColorBorder

  $inner = New-Object System.Windows.Forms.TableLayoutPanel
  $inner.Dock = [System.Windows.Forms.DockStyle]::Fill
  $inner.ColumnCount = 1
  $inner.RowCount = 2
  $inner.Padding = [System.Windows.Forms.Padding]::new(10,9,10,8)
  $inner.BackColor = $ColorSurface
  [void]$inner.ColumnStyles.Add([System.Windows.Forms.ColumnStyle]::new([System.Windows.Forms.SizeType]::Percent,100))
  [void]$inner.RowStyles.Add([System.Windows.Forms.RowStyle]::new([System.Windows.Forms.SizeType]::Absolute,39))
  [void]$inner.RowStyles.Add([System.Windows.Forms.RowStyle]::new([System.Windows.Forms.SizeType]::Percent,100))
  $card.Controls.Add($inner)

  $button = New-Object System.Windows.Forms.Button
  $button.Text = $Text
  $button.Dock = [System.Windows.Forms.DockStyle]::Fill
  $button.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $button.TextAlign = [System.Drawing.ContentAlignment]::MiddleLeft
  $button.Padding = [System.Windows.Forms.Padding]::new(10,0,8,0)
  $button.Cursor = [System.Windows.Forms.Cursors]::Hand
  if ($Accent) {
    $button.BackColor = $ColorAccent
    $button.ForeColor = [System.Drawing.Color]::White
    $button.FlatAppearance.BorderSize = 0
    $button.FlatAppearance.MouseOverBackColor = $ColorAccentHover
  } else {
    $button.BackColor = $ColorSurface
    $button.ForeColor = $ColorText
    $button.FlatAppearance.BorderColor = $ColorBorder
    $button.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(244,247,253)
  }
  $button.Add_Click({ Run-Action $Action }.GetNewClosure())
  $button.Margin = [System.Windows.Forms.Padding]::new(0,0,0,3)
  $inner.Controls.Add($button,0,0)

  $desc = New-Object System.Windows.Forms.Label
  $desc.Text = $Description
  $desc.Dock = [System.Windows.Forms.DockStyle]::Fill
  $desc.ForeColor = $ColorMuted
  $desc.AutoEllipsis = $true
  $desc.Margin = [System.Windows.Forms.Padding]::new(2,3,2,0)
  $inner.Controls.Add($desc,0,1)

  [void]$Flow.Controls.Add($card)
  Resize-ActionCards $Flow
}


function Get-ToolboxConfigPath {
  if ($env:DKDS_TOOLBOX_CONFIG) { return [IO.Path]::GetFullPath($env:DKDS_TOOLBOX_CONFIG) }
  if ($env:LOCALAPPDATA) { return (Join-Path $env:LOCALAPPDATA 'DKDataStudio\developer-toolbox.json') }
  if ($env:USERPROFILE) { return (Join-Path $env:USERPROFILE '.dkds-developer-toolbox.json') }
  return (Join-Path $Root '.dkds-developer-toolbox.json')
}

function Read-ToolboxConfig {
  $configPath = Get-ToolboxConfigPath
  if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) { return $null }
  try { return (Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json) }
  catch { return $null }
}

function Get-ToolboxConfigText($Config,[string]$Name,[string]$Fallback='') {
  if ($Config) {
    $property = $Config.PSObject.Properties[$Name]
    if ($property -and -not [string]::IsNullOrWhiteSpace([string]$property.Value)) {
      return [string]$property.Value
    }
  }
  return $Fallback
}

function Select-ToolboxFolder([System.Windows.Forms.TextBox]$Target) {
  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
  $dialog.Description = '选择共享工具 / 缓存目录'
  $dialog.ShowNewFolderButton = $true
  if ($Target.Text -and (Test-Path -LiteralPath $Target.Text)) { $dialog.SelectedPath = $Target.Text }
  if ($dialog.ShowDialog($form) -eq [System.Windows.Forms.DialogResult]::OK) {
    $Target.Text = $dialog.SelectedPath
  }
  $dialog.Dispose()
}

function New-PathSettingsPage {
  $config = Read-ToolboxConfig
  $toolFallback = if ($env:DK_TOOL_ROOT) { $env:DK_TOOL_ROOT } elseif (Test-Path 'D:\Code') { 'D:\Code' } else { '' }
  $toolValue = Get-ToolboxConfigText $config 'toolRoot' $toolFallback
  $cacheFallback = if ($env:DK_CACHE_ROOT) { $env:DK_CACHE_ROOT } elseif ($toolValue) { Join-Path $toolValue 'BuildCache' } else { '' }
  $cacheValue = Get-ToolboxConfigText $config 'cacheRoot' $cacheFallback
  $cacheMode = (Get-ToolboxConfigText $config 'cachePathMode' 'derived').ToLowerInvariant()
  $followRoot = $cacheMode -ne 'custom'

  function Get-CacheFieldValue([string]$Name,[string]$Leaf) {
    if ($followRoot -and $cacheValue) { return (Join-Path $cacheValue $Leaf) }
    $fallback = if ($cacheValue) { Join-Path $cacheValue $Leaf } else { '' }
    return (Get-ToolboxConfigText $config $Name $fallback)
  }

  $page = New-Object System.Windows.Forms.TabPage
  $page.Text = '路径与缓存'
  $page.BackColor = $ColorPage
  $page.Padding = [System.Windows.Forms.Padding]::new(16,16,16,14)

  $layout = New-Object System.Windows.Forms.TableLayoutPanel
  $layout.Dock = [System.Windows.Forms.DockStyle]::Fill
  $layout.ColumnCount = 3
  $layout.RowCount = 11
  $layout.BackColor = $ColorPage
  [void]$layout.ColumnStyles.Add([System.Windows.Forms.ColumnStyle]::new([System.Windows.Forms.SizeType]::Absolute,165))
  [void]$layout.ColumnStyles.Add([System.Windows.Forms.ColumnStyle]::new([System.Windows.Forms.SizeType]::Percent,100))
  [void]$layout.ColumnStyles.Add([System.Windows.Forms.ColumnStyle]::new([System.Windows.Forms.SizeType]::Absolute,76))
  for ($rowIndex = 0; $rowIndex -lt 8; $rowIndex++) {
    [void]$layout.RowStyles.Add([System.Windows.Forms.RowStyle]::new([System.Windows.Forms.SizeType]::Absolute,44))
  }
  [void]$layout.RowStyles.Add([System.Windows.Forms.RowStyle]::new([System.Windows.Forms.SizeType]::Absolute,38))
  [void]$layout.RowStyles.Add([System.Windows.Forms.RowStyle]::new([System.Windows.Forms.SizeType]::Percent,100))
  [void]$layout.RowStyles.Add([System.Windows.Forms.RowStyle]::new([System.Windows.Forms.SizeType]::Absolute,46))
  $page.Controls.Add($layout)

  $fields = [ordered]@{
    toolRoot = @{ Label='共享工具根目录'; Value=$toolValue; Hint='Node / JDK / Android SDK 等可复用工具的根目录'; Leaf='' }
    cacheRoot = @{ Label='共享缓存根目录'; Value=$cacheValue; Hint='所有下载缓存的父目录；默认情况下下方缓存自动跟随'; Leaf='' }
    npmCache = @{ Label='npm 下载缓存'; Value=(Get-CacheFieldValue 'npmCache' 'npm'); Hint='npm --cache / npm_config_cache'; Leaf='npm' }
    pnpmStore = @{ Label='pnpm Store'; Value=(Get-CacheFieldValue 'pnpmStore' 'pnpm-store'); Hint='pnpm store-dir'; Leaf='pnpm-store' }
    electronCache = @{ Label='Electron 下载缓存'; Value=(Get-CacheFieldValue 'electronCache' 'electron'); Hint='electron_config_cache + ELECTRON_CACHE'; Leaf='electron' }
    electronBuilderCache = @{ Label='electron-builder 缓存'; Value=(Get-CacheFieldValue 'electronBuilderCache' 'electron-builder'); Hint='ELECTRON_BUILDER_CACHE'; Leaf='electron-builder' }
    gradleCache = @{ Label='Gradle 缓存'; Value=(Get-CacheFieldValue 'gradleCache' 'gradle'); Hint='GRADLE_USER_HOME'; Leaf='gradle' }
    nodeModulesRoot = @{ Label='共享 node_modules'; Value=(Get-CacheFieldValue 'nodeModulesRoot' 'node_modules'); Hint='desktop / mobile Junction 的父目录'; Leaf='node_modules' }
  }

  $boxes = @{}
  $browseButtons = @{}
  $row = 0
  foreach ($key in $fields.Keys) {
    $spec = $fields[$key]
    $label = New-Object System.Windows.Forms.Label
    $label.Text = $spec.Label
    $label.Dock = [System.Windows.Forms.DockStyle]::Fill
    $label.TextAlign = [System.Drawing.ContentAlignment]::MiddleLeft
    $label.ForeColor = $ColorText
    $layout.Controls.Add($label,0,$row)

    $box = New-Object System.Windows.Forms.TextBox
    $box.Text = [string]$spec.Value
    $box.Dock = [System.Windows.Forms.DockStyle]::Fill
    $box.Margin = [System.Windows.Forms.Padding]::new(0,7,8,6)
    $box.Tag = $spec.Hint
    $layout.Controls.Add($box,1,$row)
    $boxes[$key] = $box

    $browse = New-Object System.Windows.Forms.Button
    $browse.Text = '浏览…'
    $browse.Dock = [System.Windows.Forms.DockStyle]::Fill
    $browse.Margin = [System.Windows.Forms.Padding]::new(0,6,0,6)
    $browse.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $browse.BackColor = $ColorSurface
    $browse.FlatAppearance.BorderColor = $ColorBorder
    $browse.Add_Click({ Select-ToolboxFolder $box }.GetNewClosure())
    $layout.Controls.Add($browse,2,$row)
    $browseButtons[$key] = $browse
    $row++
  }

  $follow = New-Object System.Windows.Forms.CheckBox
  $follow.Text = '子缓存自动跟随“共享缓存根目录”（推荐）'
  $follow.Checked = $followRoot
  $follow.Dock = [System.Windows.Forms.DockStyle]::Fill
  $follow.ForeColor = $ColorText
  $follow.Padding = [System.Windows.Forms.Padding]::new(0,4,0,0)
  $layout.SetColumnSpan($follow,3)
  $layout.Controls.Add($follow,0,8)

  $childKeys = @('npmCache','pnpmStore','electronCache','electronBuilderCache','gradleCache','nodeModulesRoot')
  $leafMap = @{
    npmCache='npm'; pnpmStore='pnpm-store'; electronCache='electron'; electronBuilderCache='electron-builder'; gradleCache='gradle'; nodeModulesRoot='node_modules'
  }

  $updateDerived = {
    if (-not $follow.Checked) { return }
    $rootText = $boxes['cacheRoot'].Text.Trim()
    foreach ($childKey in $childKeys) {
      $boxes[$childKey].Text = if ($rootText) { Join-Path $rootText $leafMap[$childKey] } else { '' }
    }
  }
  $updateChildMode = {
    $custom = -not $follow.Checked
    foreach ($childKey in $childKeys) {
      $boxes[$childKey].Enabled = $custom
      $browseButtons[$childKey].Enabled = $custom
    }
    if (-not $custom) { & $updateDerived }
  }
  $follow.Add_CheckedChanged($updateChildMode)
  $boxes['cacheRoot'].Add_TextChanged($updateDerived)
  & $updateChildMode

  $note = New-Object System.Windows.Forms.Label
  $note.Text = "设置保存在：$(Get-ToolboxConfigPath)`r`n`r`n构建启动时会把 npm、pnpm、Electron、electron-builder 与 Gradle 的实际环境变量都绑定到这里，并在日志开头显示最终路径。修改共享缓存根目录后，已有的 node_modules Junction 也会自动检查并重新绑定，不会继续偷偷指向旧目录。"
  $note.Dock = [System.Windows.Forms.DockStyle]::Fill
  $note.ForeColor = $ColorMuted
  $note.Padding = [System.Windows.Forms.Padding]::new(0,8,0,0)
  $layout.SetColumnSpan($note,3)
  $layout.Controls.Add($note,0,9)

  $actions = New-Object System.Windows.Forms.FlowLayoutPanel
  $actions.Dock = [System.Windows.Forms.DockStyle]::Fill
  $actions.FlowDirection = [System.Windows.Forms.FlowDirection]::RightToLeft
  $actions.WrapContents = $false
  $actions.Padding = [System.Windows.Forms.Padding]::new(0,5,0,0)
  $layout.SetColumnSpan($actions,3)
  $layout.Controls.Add($actions,0,10)

  $save = New-Object System.Windows.Forms.Button
  $save.Text = '保存路径设置'
  $save.Width = 130
  $save.Height = 31
  $save.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $save.BackColor = $ColorAccent
  $save.ForeColor = [System.Drawing.Color]::White
  $save.FlatAppearance.BorderSize = 0
  $save.Add_Click({
    try {
      if ($follow.Checked) { & $updateDerived }
      $cachePathModeValue = if ($follow.Checked) { 'derived' } else { 'custom' }
      $payload = [ordered]@{ schema=2; cachePathMode=$cachePathModeValue }
      foreach ($fieldName in $boxes.Keys) { $payload[$fieldName] = $boxes[$fieldName].Text.Trim() }
      $configPath = Get-ToolboxConfigPath
      $configDir = Split-Path -Parent $configPath
      if ($configDir) { New-Item -ItemType Directory -Force -Path $configDir | Out-Null }
      [IO.File]::WriteAllText($configPath,($payload | ConvertTo-Json -Depth 3),[Text.UTF8Encoding]::new($false))
      $status.Text = '路径设置已保存；新启动的构建/开发任务会验证并使用这些缓存。'
    } catch {
      [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'DKDS',[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
    }
  }.GetNewClosure())
  [void]$actions.Controls.Add($save)

  $inspect = New-Object System.Windows.Forms.Button
  $inspect.Text = '查看当前工具链'
  $inspect.Width = 130
  $inspect.Height = 31
  $inspect.Add_Click({ Run-Action 'toolchain' })
  [void]$actions.Controls.Add($inspect)

  [void]$tabs.TabPages.Add($page)
}

function Add-VersionCard([System.Windows.Forms.FlowLayoutPanel]$Flow) {
  $card = New-Object System.Windows.Forms.Panel
  $card.Tag = 'action-card'
  $card.Height = 132
  $card.Width = 280
  $card.Margin = [System.Windows.Forms.Padding]::new(8)
  $card.Padding = [System.Windows.Forms.Padding]::new(1)
  $card.BackColor = $ColorBorder

  $inner = New-Object System.Windows.Forms.TableLayoutPanel
  $inner.Dock = [System.Windows.Forms.DockStyle]::Fill
  $inner.ColumnCount = 1
  $inner.RowCount = 3
  $inner.Padding = [System.Windows.Forms.Padding]::new(12,9,12,10)
  $inner.BackColor = $ColorSurface
  [void]$inner.ColumnStyles.Add([System.Windows.Forms.ColumnStyle]::new([System.Windows.Forms.SizeType]::Percent,100))
  [void]$inner.RowStyles.Add([System.Windows.Forms.RowStyle]::new([System.Windows.Forms.SizeType]::Absolute,27))
  [void]$inner.RowStyles.Add([System.Windows.Forms.RowStyle]::new([System.Windows.Forms.SizeType]::Absolute,34))
  [void]$inner.RowStyles.Add([System.Windows.Forms.RowStyle]::new([System.Windows.Forms.SizeType]::Percent,100))
  $card.Controls.Add($inner)

  $label = New-Object System.Windows.Forms.Label
  $label.Text = '构建并发布新版本'
  $label.Dock = [System.Windows.Forms.DockStyle]::Fill
  $label.Font = [System.Drawing.Font]::new('Segoe UI',9,[System.Drawing.FontStyle]::Bold)
  $label.ForeColor = $ColorText
  $label.TextAlign = [System.Drawing.ContentAlignment]::MiddleLeft
  $inner.Controls.Add($label,0,0)

  $versionBox = New-Object System.Windows.Forms.TextBox
  $versionBox.Text = '3.22.0'
  $versionBox.Dock = [System.Windows.Forms.DockStyle]::Fill
  $versionBox.Margin = [System.Windows.Forms.Padding]::new(0,2,0,4)
  $inner.Controls.Add($versionBox,0,1)

  $button = New-Object System.Windows.Forms.Button
  $button.Text = '构建并发布'
  $button.Dock = [System.Windows.Forms.DockStyle]::Fill
  $button.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $button.BackColor = $ColorAccent
  $button.ForeColor = [System.Drawing.Color]::White
  $button.FlatAppearance.BorderSize = 0
  $button.Cursor = [System.Windows.Forms.Cursors]::Hand
  $button.Add_Click({ Run-Action 'build-publish-update' $versionBox.Text.Trim() }.GetNewClosure())
  $button.Margin = [System.Windows.Forms.Padding]::new(0,3,0,0)
  $inner.Controls.Add($button,0,2)

  [void]$Flow.Controls.Add($card)
  Resize-ActionCards $Flow
}

$common = New-Page '常用'
Add-ActionCard -Flow $common -Text '启动桌面开发版' -Description '自动检查依赖后启动 Electron。' -Action 'dev' -Accent
Add-ActionCard -Flow $common -Text '安装 / 修复依赖' -Description '明确执行 npm install，可用于首次运行或依赖损坏。' -Action 'install-deps'
Add-ActionCard -Flow $common -Text '工具环境诊断' -Description '检查 Node、npm、Git、项目路径和依赖状态。' -Action 'doctor'
Add-ActionCard -Flow $common -Text '共享工具链' -Description '显示 DK_TOOL_ROOT、公共缓存、JDK、Android SDK 与 Electron/Gradle 缓存位置。' -Action 'toolchain'
Add-ActionCard -Flow $common -Text '完整工程检查' -Description '插件、结构、科学引擎 parity 与边界检查。' -Action 'check'
Add-ActionCard -Flow $common -Text '全部回归测试' -Description '运行历史功能和当前框架测试。' -Action 'test'
Add-ActionCard -Flow $common -Text '构建 Windows' -Description '生成 Setup 与 Portable。' -Action 'build-windows'
Add-ActionCard -Flow $common -Text '打开项目目录' -Description '在资源管理器中打开工程根目录。' -Action 'open-root'
Add-ActionCard -Flow $common -Text '打开开发文档' -Description '打开 docs/；新会话优先阅读 HANDOFF。' -Action 'open-docs'
Add-ActionCard -Flow $common -Text '打开 Windows 输出' -Description '打开 dist/ 构建输出目录。' -Action 'open-dist'
Add-ActionCard -Flow $common -Text '查看 Git 状态' -Description '检查当前分支与未提交修改。' -Action 'git-status'

New-PathSettingsPage

$android = New-Page 'Android'
Add-ActionCard -Flow $android -Text '检查 Android 环境' -Description '检查 Node、adb、ANDROID_HOME 与 API 36；缺少 JDK 时自动准备并共享 Temurin 21。' -Action 'android-check' -Accent
Add-ActionCard -Flow $android -Text '构建 APK' -Description '自动准备所需 JDK，随后同步 Web 资源、Prebuild，并生成独立签名的 release APK。' -Action 'android-build'
Add-ActionCard -Flow $android -Text '连接设备运行' -Description '使用 release variant 编译并安装到已连接设备。' -Action 'android-run'
Add-ActionCard -Flow $android -Text '安装已有 APK' -Description '安装 mobile-dist 中已生成的 release APK。' -Action 'android-install'
Add-ActionCard -Flow $android -Text '打开 APK 输出' -Description '打开 mobile-dist/。' -Action 'open-mobile-dist'

$update = New-Page '局域网更新'
Add-ActionCard -Flow $update -Text '启动更新服务器' -Description '运行可信局域网更新服务。' -Action 'update-server' -Accent
Add-ActionCard -Flow $update -Text '发布已有构建' -Description '发布 dist/latest.yml 对应的构建。' -Action 'publish-update'
Add-ActionCard -Flow $update -Text '推送单个插件' -Description '只打包并推送选定插件，不重发整个软件；客户端接收后重启生效。' -Action 'plugin-publish-lan' -Accent
Add-ActionCard -Flow $update -Text '安装服务器自启动' -Description '创建登录时启动的 Windows 计划任务。' -Action 'update-autostart-install'
Add-ActionCard -Flow $update -Text '移除服务器自启动' -Description '删除 DKDS LAN Update Server 计划任务。' -Action 'update-autostart-remove'
Add-VersionCard -Flow $update

$plugin = New-Page '插件与维护'
Add-ActionCard -Flow $plugin -Text '重新生成插件索引' -Description '扫描 src/plugins 并生成内置插件入口。' -Action 'plugin-index'
Add-ActionCard -Flow $plugin -Text '验证所有插件' -Description '检查 manifest、ID、入口和 API。' -Action 'plugin-validate' -Accent
Add-ActionCard -Flow $plugin -Text '局域网推送插件' -Description '选择内置插件或 .dkplugin，仅发布插件更新包。' -Action 'plugin-publish-lan'
Add-ActionCard -Flow $plugin -Text '完整工程检查' -Description '推荐交付前执行。' -Action 'check'
Add-ActionCard -Flow $plugin -Text '打开插件示例' -Description '打开 examples/external-plugins。' -Action 'open-examples'

$form.Add_Shown({
  foreach ($flow in $script:PageFlows) { Resize-ActionCards $flow }
})
$form.Add_Resize({
  foreach ($flow in $script:PageFlows) { Resize-ActionCards $flow }
})

[void]$form.ShowDialog()
