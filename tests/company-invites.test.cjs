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


test('mudança retroativa de empresa redistribui refeições e frete, sem mudar custo geral',()=>{
 const targetId='colaborador-migrado';
 const data=[
   {...make('RL',1,'cafe',17)[0],id:'hist-cafe',owner:targetId,order_day:'2026-11-15'},
   {...make('RL',1,'almoco')[0],id:'hist-almoco',owner:targetId,order_day:'2026-11-16'},
   {...make('RL',1,'almoco')[0],id:'canc',owner:targetId,order_day:'2026-11-16',status:'cancelado'},
   {...make('RL',1,'almoco')[0],id:'arquiv',owner:targetId,order_day:'2026-11-16',archived:true},
   {...make('RL',1,'almoco')[0],id:'outro',owner:'outra-pessoa',order_day:'2026-11-16'},
   {...make('SOLUTIO',1,'almoco')[0],id:'sol',owner:'sol',order_day:'2026-11-16'}
 ];
 const after=new Date('2026-11-17T18:00:00Z');
 const dailyTotal=(orders,day)=>{
   const b=M.companyBreakdown(orders,day,after);
   return Math.round((b.RL.total+b.SOLUTIO.total)*100);
 };
 const before15=dailyTotal(data,'2026-11-15'),before16=dailyTotal(data,'2026-11-16');
 const reclassified=data.map(o=>o.owner===targetId?{...o,company:'SOLUTIO'}:o);
 assert.equal(reclassified.filter(o=>o.owner===targetId&&o.company==='RL').length,0);
 assert.equal(dailyTotal(reclassified,'2026-11-15'),before15);
 assert.equal(dailyTotal(reclassified,'2026-11-16'),before16);
 const day15=M.companyBreakdown(reclassified,'2026-11-15',after);
 const day16=M.companyBreakdown(reclassified,'2026-11-16',after);
 assert.equal(day15.RL.total,0);
 assert.equal(day15.SOLUTIO.delivery,8);
 assert.equal(day16.RL.coffee+day16.RL.lunch,1);
 assert.equal(day16.SOLUTIO.coffee+day16.SOLUTIO.lunch,2);
 assert.equal(day16.RL.delivery+day16.SOLUTIO.delivery,8);
 assert.equal(day16.RL.subtotal+day16.SOLUTIO.subtotal,66);
});

test('alterar empresa no Supabase reclassifica todos os pedidos atomicamente e audita',()=>{
 const sql=read('supabase/migrations/20261117_rl_company_reallocate_all_orders.sql');
 const edge=read('supabase/functions/manage-users/index.ts');
 const app=read('app/app.js');
 assert.match(sql,/AFTER UPDATE OF company ON public\.profiles/);
 assert.match(sql,/UPDATE public\.orders o\s+SET company=NEW\.company/i);
 assert.match(sql,/o\.owner=NEW\.id/);
 assert.match(sql,/rl\.company_move_owner/);
 assert.match(sql,/pg_trigger_depth\(\) >= 2/);
 assert.match(sql,/to_jsonb\(NEW\)-'company'/);
 assert.match(edge,/reallocated_orders:toMove\|\|0/);
 assert.match(edge,/remaining_mismatches:0/);
 assert.match(edge,/\.neq\('company',nextCompany\)/);
 assert.match(app,/if\(action==='set_company'\)\{\s*await reload\(\)/);
 assert.match(app,/PDFs\/CSVs já baixados precisam ser emitidos novamente/);
});
