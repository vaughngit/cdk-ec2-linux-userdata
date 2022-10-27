const script = `
<powershell>
  Start-Transcript -OutputDirectory C:/
  Write-Output HelloWorld
  Stop-Transcript
</powershell>
<persist>true</persist>
`;

const ssmaUserData = UserData.custom(script)