const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const app=read('app/app.js'),edge=read('supabase/functions/manage-users/index.ts');

test('painel permite promoção de colaborador ativo, protege conta principal e ADM delegado',()=>{
 const start=app.indexOf('function renderUsers(){');
 const end=app.indexOf('function displayNewInvite(',start);
 assert.ok(start>=0&&end>start);
 const el={innerHTML:'',querySelectorAll:()=>[]};
 const state={users:[
 {id:'p1',username:'colaborador.teste',display_name:'Colaborador Ativo',role:'colaborador',active:true,company:'RL'},
 {id:'p2',username:'colaborador.inativo',display_name:'Colaborador Inativo',role:'colaborador',active:false,company:'RL'},
 {id:'p3',username:'adm.delegado',display_name:'ADM Delegado',role:'admin',active:true,company:'RL'},
 {id:'p4',username:null,display_name:'ADM Principal',role:'admin',active:true,company:'RL'}
 ]};
 const render=new Function('state','isManager','$','ownId','esc',app.slice(start,end)+';return renderUsers;')(
 state,()=>true,id=>id==='usersList'?el:{textContent:''},()=> 'minha-conta',x=>String(x));
 render();
 const entries=el.innerHTML.match(/<article class="entry user-account">[\s\S]*?<\/article>/g)||[];
 const pick=name=>entries.find(entry=>entry.includes(name));
 assert.match(pick('Colaborador Ativo'),/value="admin"/);
 assert.match(pick('Colaborador Inativo'),/value="admin"[^>]*disabled/);
 assert.match(pick('ADM Delegado'),/data-user-action="set_role"/);
 assert.doesNotMatch(pick('ADM Delegado'),/data-user-action="delete_user"/);
 assert.doesNotMatch(pick('ADM Principal'),/data-user-action="set_role"/);
});

test('servidor valida promoção e só o ADM ativo pode gerir funções',()=>{
 assert.match(edge,/profile\.role !== 'admin'/);
 assert.match(edge,/if \(!managedRole\(nextRole\) && nextRole !== 'admin'\)/);
 assert.match(edge,/nextRole === 'admin' && target\.role !== 'colaborador'/);
 assert.match(edge,/nextRole === 'admin' && !target\.active/);
 assert.match(edge,/target\.role === 'admin' && nextRole !== 'colaborador'/);
 assert.match(edge,/target\.id === caller/);
 assert.match(edge,/if \(!target\.username\)/);
 assert.match(edge,/\.eq\('role',target\.role\)\.select\('id'\)/);
 assert.match(edge,/action:'change_role',details:\{from:target\.role,to:nextRole\}/);
 assert.match(edge,/const managedRole = \(r: unknown\) => r === 'colaborador' \|\| r === 'restaurante'/);
 assert.match(app,/nextRole==='admin' && !confirm\(/);
 assert.match(app,/u\.role==='admin' && !confirm\(/);
});

test('ambas rotas usam scripts atualizados e explicam promoção',()=>{
 for(const p of ['acesso/index.html','app/index.html']){
 const html=read(p);
 assert.match(html,/Administrador \(ADM\)/);
 assert.match(html,/loader\.js\?v=14/);
 assert.doesNotMatch(html,/<option value="admin">Administrador<\/option>/);
 }
 assert.match(read('app/loader.js'),/app\.js\?v=15/);
});
