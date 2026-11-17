const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/menu.js'),'utf8'),ctx);
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/reports.js'),'utf8'),ctx);
const M=ctx.window.RL_MENU,R=ctx.window.RL_REPORTS;
const day='2026-11-16';
const afterClose=new Date('2026-11-16T17:00:00Z');
const data=[
  {order_day:day,employee_name:'Colaborador A',meal:'cafe',dish:'Cuscuz com frango e vinagrete',price:17,status:'confirmado',archived:false,accompaniments:[],notes:''},
  {order_day:day,employee_name:'Colaborador B',meal:'almoco',dish:'Filé de frango',price:22,status:'entregue',archived:false,accompaniments:['Arroz','Feijão macassar'],notes:'Sem cebola'},
  {order_day:day,employee_name:'Colaborador C',meal:'almoco',dish:'Parmegiana de frango',price:22,status:'cancelado',archived:false,accompaniments:[],notes:''},
  {order_day:day,employee_name:'Colaborador D',meal:'cafe',dish:'Café só com pão',price:10,status:'confirmado',archived:true,accompaniments:[],notes:''}
];
test('relatório diário totaliza sem cancelados/arquivados',()=>{
  const r=R.build({date:day,orders:data,kind:'admin',now:afterClose});
  assert.equal(r.rows.length,4);
  assert.equal(r.summary.coffee,1);
  assert.equal(r.summary.lunch,1);
  assert.equal(r.summary.subtotal,39);
  assert.equal(r.summary.delivery,20);
  assert.equal(r.summary.total,59);
});
test('relatório de restaurante tem nomes e não apresenta coluna valor',()=>{
  const r=R.build({date:day,orders:data,kind:'restaurante',now:afterClose});
  assert.ok(r.columns.includes('Colaborador'));
  assert.ok(!r.columns.includes('Valor'));
  assert.ok(r.values.some(row=>row[0]==='Colaborador B'));
  assert.ok(r.values.some(row=>row.some(s=>String(s).includes('Sem cebola'))));
});
test('filtro de café só cobra taxa de café',()=>{
  const r=R.build({date:day,meal:'cafe',orders:data,kind:'admin',now:afterClose});
  assert.equal(r.summary.coffee,1);
  assert.equal(r.summary.lunch,0);
  assert.equal(r.summary.delivery,8);
  assert.equal(r.summary.total,25);
});
test('arquivados e cancelados são identificados no relatório, mas excluídos do total',()=>{
  const r=R.build({date:day,orders:data,kind:'admin',now:afterClose});
  assert.ok(r.values.some(row=>row.includes('Cancelado')));
  assert.ok(r.values.some(row=>row.includes('ARQUIVADO')));
  assert.equal(r.summary.total,59);
});
