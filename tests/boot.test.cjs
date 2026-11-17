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
 assert.match(html,/<script src="\.\/loader\.js\?v=16"><\/script>/);
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


test('ambas rotas têm todos os botões vinculados na inicialização do aplicativo',()=>{
 const app=read('app/index.html');
 const access=read('acesso/index.html');
 const script=read('app/app.js');
 const required=[...script.matchAll(/\$\(['"]([^'"]+)['"]\)(?:\?\.|\.)addEventListener\(/g)].map(m=>m[1]);
 for(const id of new Set(required)){
   assert.ok(app.includes('id="'+id+'"'), 'Falta em /app/: '+id);
   assert.ok(access.includes('id="'+id+'"'), 'Falta em /acesso/: '+id);
 }
 for(const id of ['copyInviteMessage','inviteWhatsDirect','shareInviteWhatsApp']){
   assert.ok(app.includes('id="'+id+'"'), 'WhatsApp ausente em /app/: '+id);
   assert.ok(access.includes('id="'+id+'"'), 'WhatsApp ausente em /acesso/: '+id);
 }
});
