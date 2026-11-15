const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=filename=>fs.readFileSync(path.join(root,filename),'utf8');

test('tela de login é visível por padrão, sem depender de serviço externo',()=>{
 const html=read('app/index.html');
 assert.match(html,/<section id="login" class="card auth-card">/);
 assert.doesNotMatch(html,/<section id="login" class="card auth-card" hidden>/);
 assert.match(html,/id="bootStatus"/);
 assert.match(html,/id="loginBtn" class="primary" disabled/);
});
test('nenhuma biblioteca remota bloqueia o carregamento inicial do HTML',()=>{
 const html=read('app/index.html');
 assert.doesNotMatch(html,/<script\s+src="https?:\/\//i);
 assert.match(html,/<script src="\.\/loader\.js\?v=5"><\/script>/);
});
test('loader possui tentativa alternativa e mensagem de erro',()=>{
 const js=read('app/loader.js');
 assert.match(js,/cdn\.jsdelivr\.net/);
 assert.match(js,/unpkg\.com/);
 assert.match(js,/login\.hidden=false/);
 assert.match(js,/Conectando com segurança/);
 assert.match(js,/Falha na conexão do aplicativo/);
});
test('aplicação libera login e marca início após montar a interface',()=>{
 const js=read('app/app.js');
 assert.match(js,/window\.RL_APP_BOOTED=true/);
 assert.match(js,/\$\('loginBtn'\)\.disabled=false/);
 assert.match(js,/client\.auth\.getUser/);
});
test('PDF é carregado apenas quando solicitado',()=>{
 const js=read('app/reports.js');
 assert.match(js,/async function ensurePDF/);
 assert.match(js,/await ensurePDF\(\)/);
});
