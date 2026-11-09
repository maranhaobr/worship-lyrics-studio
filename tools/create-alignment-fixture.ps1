$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'pt-BR' } | Select-Object -First 1
  if (-not $voice) { throw 'Instale uma voz pt-BR do Windows para gerar o áudio de teste.' }
  $synth.SelectVoice($voice.VoiceInfo.Name)
  $synth.Rate = -2
  $directory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../out'))
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
  $path = Join-Path $directory 'alignment-reference.wav'
  $synth.SetOutputToWaveFile($path)
  $synth.SpeakSsml('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="pt-BR"><break time="2000ms"/>Santo para sempre.<break time="1500ms"/>Toda honra e toda gl&#243;ria ao Senhor.<break time="1000ms"/></speak>')
  $synth.SetOutputToNull()
  Write-Output "Audio sintetico criado em $path"
} finally { $synth.Dispose() }
