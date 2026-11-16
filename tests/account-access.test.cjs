const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const app = read('app/app.js');
const edge = read('supabase/functions/manage-users/index.ts');

const normStart = app.indexOf('function normalizeLogin(input){');
const normEnd = app.indexOf('let loginEdited=false;',normStart);
assert.ok(normStart >= 0 && normEnd > normStart);
const normalizeLogin = new Function(app.slice(normStart,normEnd)+';return normalizeLogin;')();

const authStart = app.indexOf('async function authAction() {');
const authEnd = app.indexOf('function chooseTab(tab)', authStart);
assert.ok(authStart >= 0 && authEnd > authStart);
const authBody = app.slice(authStart,authEnd);
const loadAuth = new Function('$','client','normalizeLogin','inform','setUser',authBody+';return authAction;');

test('login aceita nome com espaços, letras maiúsculas e acentos', async()=>{
 const usernames = [
   ['USUÁRIO TESTE','usuario.teste@acesso.rl-pedidos.invalid'],
   ['usuario teste restaurante','usuario.teste.restaurante@acesso.rl-pedidos.invalid'],
   ['usuario.teste','usuario.teste@acesso.rl-pedidos.invalid']
 ];
 for(const [typed,expectedEmail] of usernames){
  const elements={loginEmail:{value:typed},loginPassword:{value:'senha-exemplo'},loginBtn:{disabled:false}};
  const captured=[];
  const client={auth:{signInWithPassword:async input=>{captured.push(input);return {data:{user:null},error:null};}}};
  const fn=loadAuth(id=>elements[id],client,normalizeLogin,()=>{},async()=>{});
  await fn();
  assert.equal(captured[0].email,expectedEmail);
  assert.equal(captured[0].password,'senha-exemplo');
  assert.equal(elements.loginEmail.value,typed.includes('.') ? typed.toLowerCase():normalizeLogin(typed));
  assert.equal(elements.loginBtn.disabled,false);
 }
});

test('login com senha incorreta orienta redefinição via ADM sem expor detalhes',async()=>{
 const elements={loginEmail:{value:'usuario.teste'},loginPassword:{value:'senha-nao-confirmada'},loginBtn:{disabled:false}};
 const messages=[];
 const client={auth:{signInWithPassword:async()=>({data:{},error:{code:'invalid_credentials',message:'Invalid login credentials'}})}};
 const fn=loadAuth(id=>elements[id],client,normalizeLogin,text=>messages.push(text),async()=>{});
 await fn();
 assert.equal(elements.loginBtn.disabled,false);
 assert.ok(messages.some(s=>s.includes('redefinição da senha')));
});

test('gestor possui botão de excluir e dupla confirmação',()=>{
 assert.match(app,/data-user-action="delete_user"/);
 assert.match(app,/confirmation!==\x27EXCLUIR\x27/);
 assert.match(app,/action===\x27delete_user\x27/);
 assert.match(app,/u\.role===\x27admin\x27/);
});

test('servidor só exclui conta administrada, sem pedidos, preservando auditoria',()=>{
 assert.match(edge,/profile\.role !== 'admin'/);
 assert.match(edge,/target\.id === caller \|\| \(target\.role === 'admin' && action !== 'set_role'\)/);
 assert.match(edge,/if \(action === 'delete_user'\)/);
 assert.match(edge,/\.eq\('owner', id\)/);
 assert.match(edge,/\(count \?\? 0\) > 0/);
 assert.match(edge,/admin\.auth\.admin\.deleteUser\(id\)/);
 assert.match(edge,/action: 'delete_user'/);
});

test('migração preserva auditoria após exclusão da conta sem pedidos',()=>{
 const sql=read('supabase/allow-delete-no-orders.sql');
 assert.match(sql,/ON DELETE SET NULL/);
 assert.match(sql,/account_audit_target_fkey/);
 assert.match(sql,/account_audit_actor_fkey/);
});
