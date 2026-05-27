import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import XLSX from 'xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const xlsxPath = 'c:/Users/Italo/OneDrive - GRUPO CGB/Área de Trabalho/VEICULOS ATUALIZADOS.xlsx'
const genPath = join(__dirname, '../src/data/totalVehiclesFleet.gen.ts')
const outCsv = join(__dirname, '../../placas_remover_catalogo.csv')
const outTxt = join(__dirname, '../../placas_remover_catalogo.txt')

function normPlaca(s) {
  return String(s || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
}

const wb = XLSX.readFile(xlsxPath)
const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
const excelSet = new Set(raw.map((r) => normPlaca(r['PLACA '] ?? r.PLACA)).filter(Boolean))

const gen = JSON.parse(readFileSync(genPath, 'utf8').match(/=\s*(\[[\s\S]*\])/)[1])
const onlyGen = gen
  .filter((r) => !excelSet.has(normPlaca(r.placa)))
  .map((r) => ({
    placa: normPlaca(r.placa),
    setor: (r.setor || '').toUpperCase(),
    responsavel: r.responsavel || '',
    gerencia: r.gerencia || '',
    base: r.base || '',
    prefixo: r.prefixo || '',
    tipo: r.tipo || '',
    modelo: r.modelo || '',
  }))
  .sort((a, b) => a.setor.localeCompare(b.setor) || a.placa.localeCompare(b.placa))

const esc = (s) => `"${String(s).replace(/"/g, '""')}"`
const csvLines = ['PLACA;SETOR;RESPONSAVEL;GERENCIA;BASE;PREFIXO;TIPO;MODELO']
for (const r of onlyGen) {
  csvLines.push([r.placa, r.setor, r.responsavel, r.gerencia, r.base, r.prefixo, r.tipo, r.modelo].map(esc).join(';'))
}
writeFileSync(outCsv, '\uFEFF' + csvLines.join('\r\n'), 'utf8')

const txtLines = ['78 placas para remover do catalogo (existem no gen.ts, nao estao no Excel novo)', '']
let curSetor = ''
for (const r of onlyGen) {
  if (r.setor !== curSetor) {
    curSetor = r.setor
    txtLines.push('', `=== ${curSetor} ===`)
  }
  txtLines.push(r.placa)
}
txtLines.push('', 'Lista simples (copiar):', onlyGen.map((r) => r.placa).join(', '))
writeFileSync(outTxt, txtLines.join('\r\n'), 'utf8')

console.log(`CSV: ${outCsv}`)
console.log(`TXT: ${outTxt}`)
console.log(`Total: ${onlyGen.length} placas`)
