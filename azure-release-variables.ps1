$buildInfoFile = Get-content $Env:SYSTEM_DEFAULTWORKINGDIRECTORY/buildArtifact/buildInfo/buildInfo.json | out-string | ConvertFrom-Json

$buildTime = $buildInfoFile.buildTime;
$buildDate = $buildInfoFile.buildDate;
$buildNumberOfDate = $buildInfoFile.buildNumberOfDate;
$sourceBranch = $buildInfoFile.sourceBranch;
$softwareVersion = $buildInfoFile.softwareVersion;

Write-Host "##vso[task.setvariable variable=buildDate;]$buildDate"
Write-Host "##vso[task.setvariable variable=buildTime;]$buildTime"
Write-Host "##vso[task.setvariable variable=buildNumberOfDate;]$buildNumberOfDate"
Write-Host "##vso[task.setvariable variable=sourceBranch;]$sourceBranch"
Write-Host "##vso[task.setvariable variable=softwareVersion;]$softwareVersion"