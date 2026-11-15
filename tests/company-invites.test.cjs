const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const context={window:{}};
vm.runInNewContext(read('app/menu.js'),context);
vm.runInNewContext(read('app/reports.js'),context);
const M=context.window.RL_MENU,R=context.window.RL_REPORTS;
const date='2026-11-16';
const afterClose=new Date('2026-11-16T17:00:00Z');
function make(company,n,meal='almoco',price=22){
 return Array.from({length:n},(_,i)=>({id:company+'-'+i,owner:company+'-u-'+i,
  employee_name:'Funcionário '+i,company,order_day:date,meal,price,
  dish:'Filé de frango',accompaniments:[],notes:'',status:'confirmado',archived:false}));
}

test('rateio 10 RL + 7 Solutio de uma única entrega R$8',()=>{
 const orders=[...make('RL',10),...make('SOLUTIO',7)];
 const b=M.companyBreakdown(orders,date,afterClose);
 assert.equal(b.RL.subtotal,220);
 assert.equal(b.SOLUTIO.subtotal,154);
 assert.equal(b.RL.delivery,4.71);
 assert.equal(b.SOLUTIO.delivery,3.29);
 assert.equal(b.RL.total,224.71);
 assert.equal(b.SOLUTIO.total,157.29);
 assert.equal(b.RL.total+b.SOLUTIO.total,382);
 assert.equal(M.summary(orders,date,afterClose).total,382);
});
test('uma única empresa paga somente R$8 pela sua entrega',()=>{
 const b=M.companyBreakdown(make('SOLUTIO',3),date,afterClose);
 assert.equal(b.RL.delivery,0);
 assert.equal(b.SOLUTIO.delivery,8);
});
test('antes das 13h frete de almoço é zero para ambas',()=>{
 const rows=[...make('RL',2),...make('SOLUTIO',2)];
 const b=M.companyBreakdown(rows,date,new Date('2026-11-16T15:00:00Z'));
 assert.equal(b.RL.delivery,0);assert.equal(b.SOLUTIO.delivery,0);
});
test('relatório filtrado por empresa mantém rateio calculado no conjunto',()=>{
 const orders=[...make('RL',10),...make('SOLUTIO',7)];
 const r=R.build({date,orders,company:'RL',now:afterClose,kind:'admin'});
 assert.equal(r.rows.length,10);
 assert.equal(r.summary.delivery,4.71);
 assert.equal(r.summary.total,224.71);
 assert.ok(r.columns.includes('Empresa'));
 assert.ok(r.filename.includes('_RL_'));
 const sol=R.build({date,orders,company:'SOLUTIO',now:afterClose,kind:'admin'});
 assert.equal(sol.summary.delivery,3.29);
});
test('relatório do restaurante permanece conjunto com ambas empresas',()=>{
 const r=R.build({date,orders:[...make('RL',2),...make('SOLUTIO',3)],company:'RL',now:afterClose,kind:'restaurante'});
 assert.equal(r.rows.length,5);
 assert.ok(r.columns.includes('Empresa'));
 assert.ok(!r.columns.includes('Valor'));
});
test('login de convite não coloca senha na URL e apaga token depois do uso',()=>{
 const html=read('convite/index.html');
 assert.ok(html.includes("params.get('convite')"));
 assert.ok(html.includes("action:'redeem'"));
 assert.ok(html.includes("client.auth.signInWithPassword"));
 assert.ok(html.includes("history.replaceState"));
 assert.ok(html.includes('autocomplete="new-password"'));
});
test('backend de convite só cria usuário após validar token aleatório',()=>{
 const edge=read('supabase/functions/invite-access/index.ts');
 assert.ok(edge.includes('SHA-256'));
 assert.ok(edge.includes("is('redeemed_at',null)"));
 assert.ok(edge.includes("auth.admin.createUser"));
 assert.ok(edge.includes("profile"));
 assert.ok(!edge.includes("service_role','"));
});
test('gestor seleciona empresa e registra cargo no cadastro',()=>{
 for(const html of [read('app/index.html'),read('acesso/index.html')]){
  assert.ok(html.includes('id="adminCompany"'));
  assert.ok(html.includes('id="newCompany"'));
  assert.ok(html.includes('id="newJobTitle"'));
 }
 const app=read('app/app.js');
 assert.ok(app.includes("M.companyBreakdown"));
 assert.ok(app.includes("set_company"));
 assert.ok(app.includes("company:kind==='admin'"));
});
