$packageJsonFile = Get-content $Env:BUILD_SOURCESDIRECTORY/package.json | out-string | ConvertFrom-Json
$version = $packageJsonFile.version;

$newBuildNumber = "$version-$Env:PIPEDATE-$Env:BUILDNUMBEROFDATE-$Env:BUILD_SOURCEBRANCHNAME";

Write-Host "##vso[build.updatebuildnumber]$newBuildNumber"
Write-Host $newBuildNumber

$buildInfo = @{
    softwareVersion   = $version;
    buildDate         = $Env:PIPEDATE;
    buildTime         = $Env:PIPETIME ;
    buildNumberOfDate = $Env:BUILDNUMBEROFDATE;
    sourceBranch      = $Env:BUILD_SOURCEBRANCHNAME;
}

$buildInfo | ConvertTo-Json | Out-File "$Env:BUILD_ARTIFACTSTAGINGDIRECTORY/buildInfo.json"