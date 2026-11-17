const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/menu.js'),'utf8'),ctx);
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/finance.js'),'utf8'),ctx);
const F=ctx.window.RL_FINANCE;
const d1='2026-11-16',d2='2026-11-17';
const row=(day,company,meal,price,status='entregue',archived=false,name='Funcionário')=>({
  id:company+meal+day+name,order_day:day,company,meal,price,status,archived,
  employee_name:name,dish:'Prato',accompaniments:[],notes:''
});
const sample=[
  row(d1,'RL','cafe',17),
  row(d1,'RL','almoco',22),
  row(d1,'SOLUTIO','almoco',22),
  row(d1,'SOLUTIO','almoco',22,'confirmado',false,'Pendente'),
  row(d1,'RL','almoco',22,'cancelado',false,'Cancelado'),
  row(d2,'RL','almoco',22),
  row(d2,'SOLUTIO','cafe',17,'entregue',true,'Arquivado')
];
test('financeiro distribui frete por dia sem duplicidade RL+Solutio',()=>{
  const r=F.calculate(sample,d1,d2);
  assert.equal(r.totals.RL.totalCents,8500);
  assert.equal(r.totals.SOLUTIO.totalCents,5200);
  assert.equal(r.selected.totalCents,13700);
  assert.equal(r.selected.pendingCount,1);
  assert.equal(r.selected.deliveredTotalCents,11500);
  assert.equal(r.daily.filter(x=>x.totalCents>0).length,3);
});
test('filtro RL preserva rateio conjunto e não soma frete duas vezes',()=>{
  const all=F.calculate(sample,d1,d2), rl=F.calculate(sample,d1,d2,'todos','RL');
  assert.equal(rl.selected.totalCents,8500);
  assert.equal(rl.nominal.every(o=>o.company==='RL'),true);
  assert.equal(rl.totals.RL.totalCents,all.totals.RL.totalCents);
});
test('apenas café na data não cobra frete de almoço',()=>{
  const r=F.calculate(sample,d1,d1,'cafe');
  assert.equal(r.selected.coffee,1);
  assert.equal(r.selected.lunch,0);
  assert.equal(r.selected.totalCents,2500);
});
test('cancelados e arquivados constam na auditoria mas não no total',()=>{
  const r=F.calculate(sample,d1,d2);
  assert.equal(r.nominal.length,sample.length);
  assert.equal(r.selected.coffee,1);
  assert.equal(r.selected.lunch,4);
});
test('pagamentos e saldos distinguem pendente parcial e quitado',()=>{
  const closure={total_cents:5200,rl_meal_payments:[]};
  assert.equal(F.closureStatus(closure),'Pendente');
  closure.rl_meal_payments=[{amount_cents:2000}];
  assert.equal(F.paymentTotal(closure),2000);
  assert.equal(F.closureStatus(closure),'Parcial');
  closure.rl_meal_payments.push({amount_cents:3200});
  assert.equal(F.closureStatus(closure),'Quitado');
});
test('CSV inclui exportação separada, BOM e neutraliza fórmula de célula',()=>{
  const data=[row(d1,'RL','almoco',22,'entregue',false,'=HYPERLINK("x")')];
  const csv=F.toCSV(F.calculate(data,d1,d1),[]);
  assert.ok(csv.startsWith('\ufeff'));
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('FECHAMENTOS REGISTRADOS'));
});
test('rejeita intervalo inválido',()=>{
  assert.throws(()=>F.calculate(sample,d2,d1),/inválido/);
});