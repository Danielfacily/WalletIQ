export interface FixedItem { type:'income'|'expense'; amount:number }
export interface VarTx    { type:'income'|'expense'; amount:number; date:string }

export interface PulseData {
  perMinute:   { income:number; expense:number; net:number }
  perHour:     { income:number; expense:number }
  perDay:      { income:number; expense:number }
  breakdown:   { fixedIM:number; fixedEM:number; varIM:number; varEM:number }
  projected:   { income:number; expense:number; savings:number; savingsPct:number }
  accrued:     { income:number; expense:number }
  accumulated: { day:Acc; week:Acc; month:Acc; year:Acc }
  resets:      { dayMs:number; weekMs:number; monthMs:number }
  meta:        { pct:number; dayNum:number; daysTotal:number; minsTotal:number; minsPassed:number; minsLeft:number }
}
interface Acc { income:number; expense:number; net:number }

function daysInMonth(y:number,m:number){ return new Date(y,m+1,0).getDate() }

function weekStart(now:Date):Date {
  const d=new Date(now)
  const dow=d.getDay()
  d.setDate(d.getDate()-(dow===0?6:dow-1))
  d.setHours(0,0,0,0)
  return d
}

export function calcPulse(fixed:FixedItem[], vars:VarTx[], now=new Date()):PulseData {
  const y=now.getFullYear(), m=now.getMonth()
  const totalMins = daysInMonth(y,m)*24*60
  const passed    = (now.getDate()-1)*24*60+now.getHours()*60+now.getMinutes()
  const left      = Math.max(1, totalMins-passed)
  const pct       = passed/totalMins

  const fixedInc  = fixed.filter(f=>f.type==='income').reduce((s,f)=>s+f.amount,0)
  const fixedExp  = fixed.filter(f=>f.type==='expense').reduce((s,f)=>s+f.amount,0)

  const monthStart=new Date(y,m,1)
  const ws=weekStart(now)
  const todayStart=new Date(y,m,now.getDate())

  // Variable txs per window
  const inWindow=(tx:VarTx,from:Date)=>new Date(tx.date+'T12:00:00')>=from
  const varMonth = vars.filter(v=>inWindow(v,monthStart))
  const varWeek  = vars.filter(v=>inWindow(v,ws))
  const varDay   = vars.filter(v=>inWindow(v,todayStart))

  const sum=(arr:VarTx[],t:'income'|'expense')=>arr.filter(v=>v.type===t).reduce((s,v)=>s+v.amount,0)

  const varInc=sum(varMonth,'income'), varExp=sum(varMonth,'expense')

  // Per-minute rates
  const fixedIM=fixedInc/totalMins, fixedEM=fixedExp/totalMins
  const varIM=varInc/left,           varEM=varExp/left
  const totIM=fixedIM+varIM,          totEM=fixedEM+varEM

  // Accumulation windows (fixed diluted proportionally + variable sum)
  const minsWeekPassed=(now.getTime()-ws.getTime())/60000
  const minsTodayPassed=now.getHours()*60+now.getMinutes()
  const fullMonths=m

  const accDay:Acc={
    income:  +(fixedInc*(minsTodayPassed/totalMins)+sum(varDay,'income')).toFixed(2),
    expense: +(fixedExp*(minsTodayPassed/totalMins)+sum(varDay,'expense')).toFixed(2),
    net:0
  }
  accDay.net=+(accDay.income-accDay.expense).toFixed(2)

  const accWeek:Acc={
    income:  +(fixedInc*(minsWeekPassed/totalMins)+sum(varWeek,'income')).toFixed(2),
    expense: +(fixedExp*(minsWeekPassed/totalMins)+sum(varWeek,'expense')).toFixed(2),
    net:0
  }
  accWeek.net=+(accWeek.income-accWeek.expense).toFixed(2)

  const accMonth:Acc={
    income:  +(fixedInc*pct+varInc).toFixed(2),
    expense: +(fixedExp*pct+varExp).toFixed(2),
    net:0
  }
  accMonth.net=+(accMonth.income-accMonth.expense).toFixed(2)

  const accYear:Acc={
    income:  +(fixedInc*(fullMonths+pct)+varInc).toFixed(2),
    expense: +(fixedExp*(fullMonths+pct)+varExp).toFixed(2),
    net:0
  }
  accYear.net=+(accYear.income-accYear.expense).toFixed(2)

  // Resets
  const nextMidnight=new Date(y,m,now.getDate()+1).getTime()
  const nextMonday=new Date(ws.getTime()+7*86400000).getTime()
  const nextMonth1=new Date(y,m+1,1).getTime()
  const t=now.getTime()

  const projInc=fixedInc+varInc, projExp=fixedExp+varExp

  return {
    perMinute: { income:+totIM.toFixed(6), expense:+totEM.toFixed(6), net:+(totIM-totEM).toFixed(6) },
    perHour:   { income:+(totIM*60).toFixed(2), expense:+(totEM*60).toFixed(2) },
    perDay:    { income:+(totIM*1440).toFixed(2), expense:+(totEM*1440).toFixed(2) },
    breakdown: { fixedIM:+fixedIM.toFixed(6), fixedEM:+fixedEM.toFixed(6), varIM:+varIM.toFixed(6), varEM:+varEM.toFixed(6) },
    projected: { income:projInc, expense:projExp, savings:projInc-projExp, savingsPct:projInc>0?+((projInc-projExp)/projInc*100).toFixed(1):0 },
    accrued:   { income:+(fixedInc*pct+varInc).toFixed(2), expense:+(fixedExp*pct+varExp).toFixed(2) },
    accumulated:{ day:accDay, week:accWeek, month:accMonth, year:accYear },
    resets:    { dayMs:nextMidnight-t, weekMs:nextMonday-t, monthMs:nextMonth1-t },
    meta:      { pct:+pct.toFixed(4), dayNum:now.getDate(), daysTotal:daysInMonth(y,m), minsTotal:totalMins, minsPassed:passed, minsLeft:left },
  }
}

// Format helpers
export const BRL=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
export const BRLK=(v:number)=>v>=1000?`R$\u202F${(v/1000).toFixed(1)}k`:BRL(v)
export const MONO4=(v:number)=>v.toLocaleString('pt-BR',{minimumFractionDigits:4,maximumFractionDigits:4})

export function fmtCountdown(ms:number):string {
  if(ms<=0) return '0m'
  const h=Math.floor(ms/3600000), min=Math.floor((ms%3600000)/60000), d=Math.floor(ms/86400000)
  if(ms>86400000) return `${d}d`
  return `${h}h ${min}m`
}
