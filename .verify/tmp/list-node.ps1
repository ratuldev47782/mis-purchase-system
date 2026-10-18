# .verify/tmp/list-node.ps1

Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ForEach-Object {
  $cmd = if ($_.CommandLine) { $_.CommandLine.Substring(0, [Math]::Min(170, $_.CommandLine.Length)) } else { '<none>' }
  "PID=$($_.ProcessId) PPID=$($_.ParentProcessId) $cmd"
}
