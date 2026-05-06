'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { BRL } from '@/lib/pulse'

const CATS_EXP=[{id:'food',icon:'🍔',name:'Alimentação'},{id:'housing',icon:'🏠',name:'Moradia'},{id:'transport',icon:'🚗',name:'Transporte'},{id:'health',icon:'💊',name:'Saúde'},{id:'leisure',icon:'🎮',name:'Lazer'},{id:'education',icon:'📚',name:'Educação'},{id:'subscription',icon:'📱',name:'Assinatura'},{id:'other_ex',icon:'🛒',name:'Outros'}]
const CATS_INC=[{id:'salary',icon:'💼',name:'Salário'},{id:'freelance',icon:'💻',name:'Freelance'},{id:'investment',icon:'📈',name:'Investimento'},{id:'other_in',icon:'💰',name:'Outros'}]
const ALL_CATS: Record<string,{icon:string;name:string}>={...Object.fromEntries(CATS_EXP.map(c=>[c.id,c])),...Object.fromEntries(CATS_INC.map(c=>[c.id,c]))}

// Auto-classify category by description keywords
function guessCategory(name: string): string {
  const n = name.toLowerCase()
  if (/uber|99|táxi|taxi|posto|gasolina|combustível|ônibus|metro|metrô|transporte/.test(n)) return 'transport'
  if (/mercado|supermercado|ifood|rappi|delivery|restaurante|lanche|almoço|jantar|padaria|açougue/.test(n)) return 'food'
  if (/aluguel|condomínio|iptu|luz|energia|água|gás|internet|telefone/.test(n)) return 'housing'
  if (/farmácia|médico|plano de saúde|hospital|dentista|consulta/.test(n)) return 'health'
  if (/netflix|spotify|amazon|disney|youtube|prime|assinatura|mensalidade/.test(n)) return 'subscription'
  if (/escola|faculdade|curso|livro|educação/.test(n)) return 'education'
  if (/cinema|show|viagem|hotel|lazer|clube/.test(n)) return 'leisure'
  return 'other_ex'
}

function parseAmount(raw: string): number {
  // Handle "1.234,56" (pt-BR) and "1,234.56" (en-US) and "1234.56"
  const s = raw.trim().replace(/[R$\s]/g, '')
  if (s.includes(',') && s.includes('.')) {
    // Has both — check which is decimal separator
    const lastComma = s.lastIndexOf(',')
    const lastDot   = s.lastIndexOf('.')
    if (lastComma > lastDot) return parseFloat(s.replace(/\./g, '').replace(',', '.'))
    return parseFloat(s.replace(/,/g, ''))
  }
  if (s.includes(',')) return parseFloat(s.replace(',', '.'))
  return parseFloat(s) || 0
}

function parseDate(raw: string): string {
  const s = raw.trim()
  // dd/mm/yyyy
  const ptBR = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (ptBR) return `${ptBR[3]}-${ptBR[2]}-${ptBR[1]}`
  // yyyy-mm-dd already
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // mm/dd/yyyy
  const enUS = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (enUS) return `${enUS[3]}-${enUS[1]}-${enUS[2]}`
  return new Date().toISOString().slice(0, 10)
}

interface CsvRow { name: string; amount: number; date: string; type: string; category: string }

export default function TransactionsClient({ userId, fixed, transactions }: { userId:string; fixed:any[]; transactions:any[] }) {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({ name:'', type:'expense', category:'food', recurrence:'variable', amount:'', date:new Date().toISOString().slice(0,10) })
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string|null>(null)
  const [success,  setSuccess]  = useState(false)
  const [tab,      setTab]      = useState<'add'|'list'|'fixed'|'import'>('add')

  // CSV import state
  const [csvRows,    setCsvRows]    = useState<CsvRow[]>([])
  const [csvParsed,  setCsvParsed]  = useState(false)
  const [importing,  setImporting]  = useState(false)
  const [importDone, setImportDone] = useState(false)
  const [importErr,  setImportErr]  = useState<string|null>(null)

  const cats = form.type==='income' ? CATS_INC : CATS_EXP

  const save = async () => {
    if(!form.name||!form.amount) return
    setSaving(true); setError(null); setSuccess(false)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Sessão expirada.'); setSaving(false); return }
    const result = form.recurrence==='fixed'
      ? await supabase.from('fixed_budgets').insert({ user_id:userId, type:form.type, name:form.name, category:form.category, amount:parseFloat(form.amount) })
      : await supabase.from('transactions').insert({ user_id:userId, type:form.type, category:form.category, name:form.name, amount:parseFloat(form.amount), date:form.date })
    if(result.error) { setError(`Erro: ${result.error.message}`); setSaving(false); return }
    setSaving(false); setSuccess(true)
    setForm(f=>({...f,name:'',amount:''}))
    setTimeout(()=>setSuccess(false), 3000)
    router.refresh()
  }

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportErr(null); setImportDone(false)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) { setImportErr('Arquivo vazio ou inválido.'); return }

      // Detect separator
      const sep = lines[0].includes(';') ? ';' : ','
      const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/["']/g, ''))

      // Map columns by common header names
      const iName   = headers.findIndex(h => /nome|descri|title|merchant|loja/.test(h))
      const iAmt    = headers.findIndex(h => /valor|amount|value|montant/.test(h))
      const iDate   = headers.findIndex(h => /data|date/.test(h))
      const iType   = headers.findIndex(h => /tipo|type|nature/.test(h))

      if (iAmt === -1) { setImportErr('Coluna de valor não encontrada. Renomeie para "valor" ou "amount".'); return }

      const rows: CsvRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''))
        const rawAmt = cols[iAmt] ?? ''
        const amt    = parseAmount(rawAmt)
        if (!amt) continue
        const rawName = iName >= 0 ? (cols[iName] ?? '') : `Importado linha ${i}`
        const rawDate = iDate >= 0 ? (cols[iDate] ?? '') : new Date().toISOString().slice(0, 10)
        const rawType = iType >= 0 ? (cols[iType] ?? '') : ''
        const isIncome = /receita|entrada|credit|income|salario|salary/.test(rawType.toLowerCase()) || amt < 0
        rows.push({
          name:     rawName || `Item ${i}`,
          amount:   Math.abs(amt),
          date:     parseDate(rawDate),
          type:     isIncome ? 'income' : 'expense',
          category: isIncome ? 'other_in' : guessCategory(rawName),
        })
      }

      if (rows.length === 0) { setImportErr('Nenhuma transação válida encontrada no arquivo.'); return }
      setCsvRows(rows); setCsvParsed(true)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const confirmImport = async () => {
    if (!csvRows.length) return
    setImporting(true); setImportErr(null)
    const { error } = await supabase.from('transactions').insert(
      csvRows.map(r => ({ user_id: userId, name: r.name, type: r.type, category: r.category, amount: r.amount, date: r.date }))
    )
    setImporting(false)
    if (error) { setImportErr(`Erro ao importar: ${error.message}`); return }
    setImportDone(true); setCsvRows([]); setCsvParsed(false)
    if (fileRef.current) fileRef.current.value = ''
    router.refresh()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-3xl font-black text-ink tracking-tight mb-5">Lançar</div>

      {/* Tabs */}
      <div className="flex bg-fill rounded-xl p-1 mb-5 overflow-x-auto">
        {([{k:'add',l:'Novo'},{k:'list',l:'Variáveis'},{k:'fixed',l:'Fixos'},{k:'import',l:'📥 Importar'}] as const).map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            className={`flex-1 py-2 px-3 rounded-[10px] text-sm font-semibold transition-all whitespace-nowrap ${tab===t.k?'bg-white text-ink shadow-sm':'text-muted hover:text-ink'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── ADD ── */}
      {tab==='add'&&(
        <>
          <div className="text-center mb-5">
            <div className="text-5xl font-black text-ink tracking-tight">
              {form.amount?BRL(parseFloat(form.amount)||0):'R$ 0,00'}
            </div>
          </div>
          <div className="card mb-4">
            {[
              { label:'Descrição', el:<input className="flex-1 outline-none text-right text-sm text-ink bg-transparent" placeholder="Nome da transação" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/> },
              { label:'Valor',     el:<input type="number" className="flex-1 outline-none text-right text-sm text-ink bg-transparent" placeholder="0,00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/> },
              { label:'Tipo',      el:<select className="flex-1 outline-none text-right text-sm text-brand bg-transparent" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value,category:e.target.value==='income'?'salary':'food'}))}><option value="expense">Gasto</option><option value="income">Receita</option></select> },
              { label:'Categoria', el:<select className="flex-1 outline-none text-right text-sm text-brand bg-transparent" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{cats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select> },
              { label:'Natureza',  el:<select className="flex-1 outline-none text-right text-sm text-brand bg-transparent" value={form.recurrence} onChange={e=>setForm(f=>({...f,recurrence:e.target.value}))}><option value="variable">⚡ Variável</option><option value="fixed">🔒 Fixo mensal</option></select> },
              { label:'Data',      el:<input type="date" className="flex-1 outline-none text-right text-sm text-ink bg-transparent" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/> },
            ].map(({label,el})=>(
              <div key={label} className="flex items-center px-5 py-3.5 border-b border-gray-50 last:border-0 gap-3">
                <span className="text-sm font-medium text-ink w-24 flex-shrink-0">{label}</span>
                {el}
              </div>
            ))}
          </div>
          <div className={`px-4 py-3 rounded-xl text-sm font-medium mb-4 ${form.recurrence==='fixed'?'bg-gray-100 text-muted':'bg-brand/8 text-brand'}`}>
            {form.recurrence==='fixed'?'🔒 Diluído no ticker por minuto. Zera dia 1°.':'⚡ Distribuído nos minutos restantes do mês.'}
          </div>
          {error&&<div className="mb-3 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">⚠️ {error}</div>}
          {success&&<div className="mb-3 px-4 py-3 rounded-xl bg-green-50 text-green-600 text-sm font-medium">✅ Lançamento salvo!</div>}
          <button onClick={save} disabled={saving||!form.name||!form.amount}
            className="w-full bg-brand text-white font-bold py-4 rounded-2xl text-base hover:opacity-90 disabled:opacity-40 transition-opacity">
            {saving?'Salvando...':'Registrar lançamento'}
          </button>
        </>
      )}

      {/* ── LIST ── */}
      {tab==='list'&&(
        <div className="card">
          {transactions.length===0&&<div className="p-8 text-center text-muted text-sm">Nenhuma transação ainda</div>}
          {transactions.map((t:any)=>{
            const c=ALL_CATS[t.category]||{icon:'•',name:t.category}
            return(
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-surface">{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{t.name}</div>
                  <div className="text-xs text-muted mt-0.5">{c.name} · {new Date(t.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</div>
                </div>
                <div className={`text-sm font-bold flex-shrink-0 ${t.type==='income'?'text-green':'text-ink'}`}>
                  {t.type==='income'?'+':'−'}{BRL(Number(t.amount))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── FIXED ── */}
      {tab==='fixed'&&(
        <div className="card">
          {fixed.length===0&&<div className="p-8 text-center text-muted text-sm">Nenhum item fixo</div>}
          {fixed.map((f:any)=>{
            const c=ALL_CATS[f.category]||{icon:'•',name:f.category}
            return(
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-surface">{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink">{f.name}</div>
                  <div className="text-xs text-muted mt-0.5">{c.name} · diluído no ticker</div>
                </div>
                <div className={`text-sm font-bold flex-shrink-0 ${f.type==='income'?'text-green':'text-ink'}`}>
                  {f.type==='income'?'+':'−'}{BRL(Number(f.amount))}/mês
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── IMPORT CSV ── */}
      {tab==='import'&&(
        <div className="space-y-4">
          {/* Instructions */}
          <div className="card p-5">
            <div className="text-sm font-bold text-ink mb-3">📥 Importar extrato CSV</div>
            <div className="text-xs text-muted leading-relaxed mb-4">
              Importe extratos do seu banco em formato CSV. O arquivo deve ter colunas como{' '}
              <code className="bg-gray-100 px-1 rounded">data</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">nome</code> (ou <code className="bg-gray-100 px-1 rounded">descricao</code>) e{' '}
              <code className="bg-gray-100 px-1 rounded">valor</code>.
              As categorias são detectadas automaticamente pelo nome.
            </div>

            <label className="block">
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand/40 transition-colors">
                <div className="text-2xl mb-2">📄</div>
                <div className="text-sm font-semibold text-ink">Clique para selecionar o arquivo CSV</div>
                <div className="text-xs text-muted mt-1">Nubank, Inter, Itaú, Bradesco, BB, C6, XP…</div>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvFile} />
            </label>

            {importErr && (
              <div className="mt-3 px-4 py-3 bg-red-50 rounded-xl text-sm text-red-600">⚠️ {importErr}</div>
            )}
            {importDone && (
              <div className="mt-3 px-4 py-3 bg-green-50 rounded-xl text-sm text-green-600">
                ✅ {csvRows.length || 'Todas as'} transações importadas com sucesso!
              </div>
            )}
          </div>

          {/* Preview */}
          {csvParsed && csvRows.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-ink">{csvRows.length} transações encontradas</div>
                <button
                  onClick={() => { setCsvRows([]); setCsvParsed(false); if (fileRef.current) fileRef.current.value = '' }}
                  className="text-xs text-muted hover:text-ink"
                >
                  Cancelar
                </button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-green-50 rounded-xl p-3">
                  <div className="text-xs text-muted mb-0.5">Receitas</div>
                  <div className="text-sm font-black text-green-600">
                    {BRL(csvRows.filter(r => r.type==='income').reduce((s,r) => s+r.amount, 0))}
                  </div>
                  <div className="text-xs text-muted">{csvRows.filter(r=>r.type==='income').length} itens</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <div className="text-xs text-muted mb-0.5">Gastos</div>
                  <div className="text-sm font-black text-red-600">
                    {BRL(csvRows.filter(r => r.type==='expense').reduce((s,r) => s+r.amount, 0))}
                  </div>
                  <div className="text-xs text-muted">{csvRows.filter(r=>r.type==='expense').length} itens</div>
                </div>
              </div>

              {/* Row list (first 10) */}
              <div className="space-y-1 mb-4 max-h-64 overflow-y-auto">
                {csvRows.slice(0, 50).map((r, i) => {
                  const cat = ALL_CATS[r.category] || { icon: '•', name: r.category }
                  return (
                    <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                      <span className="text-base w-7 text-center flex-shrink-0">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-ink truncate">{r.name}</div>
                        <div className="text-[10px] text-muted">{cat.name} · {r.date}</div>
                      </div>
                      <div className={`text-xs font-bold flex-shrink-0 ${r.type==='income'?'text-green-600':'text-ink'}`}>
                        {r.type==='income'?'+':'−'}{BRL(r.amount)}
                      </div>
                    </div>
                  )
                })}
                {csvRows.length > 50 && (
                  <div className="text-xs text-muted text-center py-2">+ {csvRows.length - 50} mais…</div>
                )}
              </div>

              <button
                onClick={confirmImport}
                disabled={importing}
                className="w-full bg-brand text-white font-bold py-4 rounded-2xl text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {importing ? 'Importando…' : `Importar ${csvRows.length} transações`}
              </button>
            </div>
          )}

          {/* Format help */}
          <div className="card p-5">
            <div className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Formato esperado</div>
            <div className="bg-gray-50 rounded-xl p-3 font-mono text-xs text-muted overflow-x-auto">
              data;nome;valor<br/>
              01/05/2025;Supermercado Extra;-250,00<br/>
              05/05/2025;Salário;5000,00<br/>
              10/05/2025;Netflix;55,90
            </div>
            <div className="text-xs text-muted mt-3">
              Valores negativos são interpretados como gastos. Separadores <code className="bg-gray-100 px-1 rounded">;</code> ou <code className="bg-gray-100 px-1 rounded">,</code> são detectados automaticamente.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
