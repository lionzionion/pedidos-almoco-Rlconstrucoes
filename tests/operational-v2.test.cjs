const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('app/index.html'), access=read('acesso/index.html');
const app=read('app/app.js'), backend=read('supabase/functions/manage-users/index.ts');

test('chat completo aparece nas duas rotas do aplicativo',()=>{
 for(const h of [html,access]){
  assert.match(h,/id="chatMessages"/);assert.match(h,/id="chatThread"/);
  assert.match(h,/id="chatInput"/);assert.match(h,/id="chatSend"/);
  assert.match(h,/data-tab="chat"/);
 }
 assert.match(app,/from\('chat_messages'\)/);
 assert.match(app,/function sendChat\(/);
 assert.match(app,/function loadChat\(/);
 assert.match(app,/rl-chat-updates/);
});

test('contas permitem gerar, mostrar e copiar senha provisória única',()=>{
 for(const h of [html,access]){
  for(const id of ['generatePassword','toggleNewPassword','oneTimePassword','copyCredentials','closeCredentials','changeOwnPassword'])
    assert.ok(h.includes('id="'+id+'"'),'Botão ausente: '+id);
 }
 assert.match(app,/crypto\?\.getRandomValues/);
 assert.match(app,/showOneTime\(/);
 assert.match(app,/client\.auth\.updateUser\(\{password:next\}\)/);
 assert.match(backend,/randomPassword\(\)/);
 assert.match(backend,/autoPassword/);
 assert.ok(!/select\([^\n]*password/.test(backend),'Não é permitido ler senhas antigas');
});

test('limpeza admin exige duas confirmações e apaga apenas registros operacionais',()=>{
 assert.match(app,/id='reset_test_data'|reset_test_data/);
 assert.match(app,/phrase!=='ZERAR TESTES'/);
 assert.match(backend,/if \(action === 'reset_preview'\)/);
 assert.match(backend,/if \(action === 'reset_test_data'\)/);
 assert.match(backend,/admin\.rpc\('rl_reset_test_records'/);
 for(const h of [html,access])assert.match(h,/id="resetDataBtn"/);
});

test('UI apresenta taxa coletiva e horário de fechamento',()=>{
 assert.match(app,/M\.closed\(type,today\)/);
 assert.match(app,/Prazo de pedidos encerrado/);
 assert.match(html,/fechamento às 08h/);
 assert.match(html,/fechamento às 13h/);
});

test('rotas preservam bibliotecas locais e atualização de cache',()=>{
 assert.match(html,/loader\.js\?v=9/);
 assert.match(access,/loader\.js\?v=9/);
 assert.match(read('app/loader.js'),/app\.js\?v=10/);
});
