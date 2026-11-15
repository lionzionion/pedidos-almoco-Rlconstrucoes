const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const backend=read('supabase/functions/manage-users/index.ts');
const app=read('app/app.js');

test('ADM renova convite somente de usuário pendente com token de 32 bytes',()=>{
 assert.match(backend,/if \(action === 'renew_invite'\)/);
 assert.match(backend,/existing\.redeemed_at/);
 assert.match(backend,/if\(alreadyRegistered\)/);
 assert.match(backend,/crypto\.getRandomValues\(new Uint8Array\(32\)\)/);
 assert.match(backend,/\.is\('redeemed_at',null\)/);
 assert.match(backend,/crypto\.subtle\.digest\('SHA-256',bytes\)/);
 assert.match(backend,/action:'renew_invite'/);
 assert.match(backend,/const link='https:\/\/lionzionion\.github\.io\/pedidos-almoco-Rlconstrucoes\/convite\/#convite='/);
});

test('cada convidado possui botão de link e recebe o mesmo fluxo de WhatsApp',()=>{
 assert.match(app,/data-invite-username/);
 assert.match(app,/async function renewInvitation\(/);
 assert.match(app,/userApi\('renew_invite',\{username:invitation\.username\}\)/);
 assert.match(app,/displayNewInvite\(result\)/);
 assert.match(app,/shareInviteWhatsApp/);
 assert.match(app,/generatedInviteLink/);
});

test('convites ativados não permitem criar link novo e antigo é substituído',()=>{
 assert.match(app,/if\(!isManager\(\)\|\|invitation\.redeemed_at\)return;/);
 assert.match(app,/link anterior desta pessoa deixará de funcionar/);
 assert.match(backend,/\.update\(\{token_hash,expires_at\}\)/);
 assert.match(app,/Acesso ativado\. Para senha/);
});

test('liberação de horários não altera cálculo do frete de remessa',()=>{
 const M=read('app/menu.js');
 assert.match(M,/function fee\(_type, _date\) \{ return 8;/);
 assert.match(M,/function closed\(/);
 assert.match(M,/companyBreakdown\(/);
 assert.doesNotMatch(app,/if\(M\.closed\(meal\(\),today\)\)/);
});
