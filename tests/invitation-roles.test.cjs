const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const admin=read('supabase/functions/manage-users/index.ts');
const activate=read('supabase/functions/invite-access/index.ts');
const invite=read('convite/index.html');
const app=read('app/app.js');
test('administrador gera convite de uso único, hash e expiração no backend',()=>{
  assert.match(admin,/if \(action === 'create_invite'\)/);
  assert.match(admin,/const bytes=crypto\.getRandomValues\(new Uint8Array\(32\)\)/);
  assert.match(admin,/crypto\.subtle\.digest\('SHA-256',bytes\)/);
  assert.match(admin,/upsert\(/);
  assert.match(admin,/Date\.now\(\)\+7\*86400000/);
  assert.match(admin,/profile\.role !== 'admin'/);
});
test('convite respeita perfil de colaborador ou restaurante',()=>{
  assert.match(activate,/role:invitation\.role==='restaurante'\?'restaurante':'colaborador'/);
  assert.match(activate,/role:invitation\.role/);
  assert.match(activate,/auth\.admin\.createUser/);
  assert.match(activate,/\.is\('redeemed_at',null\)/);
});
test('convite não inclui senha na URL',()=>{
  assert.match(admin,/\/convite\/#convite='/);
  assert.doesNotMatch(admin,/\/convite\/\?password=/);
  assert.match(invite,/location\.hash\.slice\(1\)/);
  assert.match(invite,/history\.replaceState/);
});
test('ADM possui botão de criar convite e enviar WhatsApp nas duas rotas',()=>{
  for(const h of [read('app/index.html'),read('acesso/index.html')]){
    for(const id of ['createInviteBtn','generatedInviteBox','generatedInviteLink','shareInviteWhatsApp','copyInviteLink']){
      assert.ok(h.includes('id="'+id+'"'), 'Elemento ausente '+id);
    }
  }
  assert.match(app,/userApi\('create_invite'/);
  assert.match(app,/wa\.me\/\?text=/);
});
test('convite tem fallback de CDN para uso no celular',()=>{
  assert.match(invite,/cdn\.jsdelivr\.net/);
  assert.match(invite,/unpkg\.com/);
});
