const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
const backend=fs.readFileSync(path.join(root,'supabase/functions/manage-users/index.ts'),'utf8');
const begin=app.indexOf('function normalizeLogin(input){');
const end=app.indexOf('let loginEdited=false;',begin);
assert.ok(begin>=0&&end>begin,'Função normalizeLogin não encontrada');
const normalizeLogin=new Function(app.slice(begin,end)+';return normalizeLogin;')();

test('nome escrito normalmente gera login minúsculo sem acentos',()=>{
 assert.equal(normalizeLogin('Usuário Teste'),'usuario.teste');
 assert.equal(normalizeLogin('Restaurante Teste'),'restaurante.teste');
 assert.equal(normalizeLogin('João Campos'),'joao.campos');
 assert.equal(normalizeLogin(' MARIA  DA  SILVA '),'maria.da.silva');
});
test('login nunca ultrapassa 30 caracteres',()=>{
 assert.ok(normalizeLogin('Colaborador com nome muito grande e completo').length<=30);
});
test('botões de teste existem e formulários exigem senha individual',()=>{
 assert.match(html,/id="fillUserTest"/);
 assert.match(html,/id="fillRestaurantTest"/);
 assert.match(html,/id="newPassword" type="password" minlength="8"/);
 assert.match(app,/setTestTemplate\('colaborador'\)/);
 assert.match(app,/setTestTemplate\('restaurante'\)/);
 assert.match(app,/\$\('newPassword'\)\.value=''/);
});
test('servidor também normaliza logins e protege a criação pelo ADM',()=>{
 assert.match(backend,/const normalizedUsername =/);
 assert.match(backend,/normalizedUsername\(body.username \|\| body.display_name\)/);
 assert.match(backend,/profile.role !== 'admin'/);
 assert.match(backend,/createUser\(/);
});
