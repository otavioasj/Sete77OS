<#
  Conecta as skills deste projeto aos agentes (Windows).
  No macOS e Linux, use scripts/conectar.sh.

  As skills moram em skills\. Este script cria os atalhos que cada agente
  espera, pra que os dois leiam e escrevam nos MESMOS arquivos:
    .claude\skills        -> skills\        (Claude Code)
    ~\.codex\skills\<x>   -> skills\<x>     (Codex)

  Usa JUNCTION, que no Windows nao exige Modo Desenvolvedor nem admin.
  Cada atalho e verificado depois de criado: se nao funcionar, o script
  para e avisa, em vez de reportar sucesso falso.

    .\scripts\conectar.ps1              cria os atalhos
    .\scripts\conectar.ps1 -Copiar      copia em vez de atalhar
    .\scripts\conectar.ps1 -Desligar    remove os atalhos deste projeto
#>
param([switch]$Copiar, [switch]$Desligar)
$ErrorActionPreference = 'Stop'

Set-Location (Join-Path $PSScriptRoot '..')
$Raiz = (Get-Location).Path
$CodexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }
$Codex = Join-Path $CodexHome 'skills'

if (-not (Test-Path 'skills')) { Write-Error 'rode da raiz do projeto (nao achei skills\)'; exit 1 }

function Get-Alvo($p) {
  $i = Get-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue
  if ($i -and $i.LinkType) { return ($i.Target | Select-Object -First 1) }
  return $null
}
function Aponta-Para($link, $origem) {
  $t = Get-Alvo $link
  if (-not $t) { return $false }
  return ($t.TrimEnd('\','/') -eq $origem.TrimEnd('\','/'))
}
# Cria um atalho e CONFIRMA que funcionou. Junction primeiro (nao pede admin),
# symlink como reserva. Se nenhum dos dois vingar, aborta.
function New-Atalho($link, $origem, $prova) {
  foreach ($tipo in @('Junction','SymbolicLink')) {
    try { New-Item -ItemType $tipo -Path $link -Target $origem -ErrorAction Stop | Out-Null } catch { continue }
    if (Test-Path (Join-Path $link $prova)) { return $tipo }
    if (Test-Path $link) { Remove-Item -LiteralPath $link -Force -Recurse -ErrorAction SilentlyContinue }
  }
  Write-Error @"
nao consegui criar um atalho funcional em:
  $link  ->  $origem
Isso costuma ser sistema de arquivos sem suporte a link (rede, pendrive, WSL
cruzando com Windows). Rode com -Copiar pra usar copia no lugar:
  .\scripts\conectar.ps1 -Copiar
Nesse modo os arquivos ficam duplicados: rode o script de novo depois de
editar uma skill, pra atualizar as copias.
"@
  exit 1
}

if ($Desligar) {
  $cs = Join-Path $Raiz '.claude\skills'
  if (Get-Alvo $cs) { Remove-Item -LiteralPath $cs -Force -Recurse; Write-Host '  .claude\skills removido' }
  $n = 0
  if (Test-Path $Codex) {
    Get-ChildItem -LiteralPath $Codex -Force | ForEach-Object {
      $t = Get-Alvo $_.FullName
      if ($t -and $t.StartsWith((Join-Path $Raiz 'skills'), [StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $_.FullName -Force -Recurse; $script:n++
      }
    }
  }
  Write-Host "  $n atalhos removidos de $Codex"
  Write-Host 'Desligado. As skills continuam em skills\ — nada foi perdido.'
  exit 0
}

# uma skill qualquer serve de prova de que o atalho resolve
$Prova = (Get-ChildItem -Directory 'skills' | Select-Object -First 1).Name

# --- Claude Code ---
New-Item -ItemType Directory -Force -Path '.claude' | Out-Null
$cs = Join-Path $Raiz '.claude\skills'
if (Get-Alvo $cs) { Remove-Item -LiteralPath $cs -Force -Recurse }
elseif (Test-Path $cs) {
  if ($Copiar) { Remove-Item -LiteralPath $cs -Force -Recurse }   # refaz a copia
  else { Write-Error '.claude\skills e uma pasta de verdade - mova o conteudo pra skills\ e rode de novo'; exit 1 }
}
if ($Copiar) { Copy-Item -Recurse 'skills' $cs; Write-Host '  Claude Code: .claude\skills copiado' }
else { $t = New-Atalho $cs (Join-Path $Raiz 'skills') $Prova; Write-Host "  Claude Code: .claude\skills pronto ($t)" }

# --- Codex ---
New-Item -ItemType Directory -Force -Path $Codex | Out-Null
$n = 0; $pulou = 0; $tipo = $null
Get-ChildItem -Directory 'skills' | ForEach-Object {
  $s = $_.Name
  $origem = Join-Path $Raiz "skills\$s"
  $alvo = Join-Path $Codex $s
  if (Aponta-Para $alvo $origem) { return }
  if (Test-Path $alvo) {
    if ($Copiar -and -not (Get-Alvo $alvo)) { Remove-Item -LiteralPath $alvo -Force -Recurse }
    else {
      Write-Host "  ! '$s' ja existe em $Codex apontando pra outro lugar - pulando"
      $script:pulou++; return
    }
  }
  if ($Copiar) { Copy-Item -Recurse $origem $alvo }
  else { $script:tipo = New-Atalho $alvo $origem 'SKILL.md' }
  $script:n++
}
$suf = if ($Copiar) { 'copiadas' } elseif ($tipo) { "conectadas ($tipo)" } else { 'ja conectadas' }
Write-Host "  Codex: $n skills $suf em $Codex"
if ($pulou -gt 0) { Write-Host "  ($pulou puladas por conflito de nome - resolva a mao)" }
if ($Copiar) { Write-Host '  ATENCAO: modo copia. Editar num lado nao reflete no outro - rode o script de novo apos editar.' }
Write-Host 'Pronto. No Codex, ficam disponiveis no proximo turno.'
