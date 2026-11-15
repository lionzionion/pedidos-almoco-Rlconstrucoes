const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app/app.js'),'utf8');
const sql=fs.readFileSync(path.join(root,'supabase/reset-sync.sql'),'utf8');
test('restaurante recebe aviso de limpeza e apaga pedidos antigos da memória',()=>{
 assert.match(app,/client\.channel\('rl-system-reset'\)/);
 assert.match(app,/table:'rl_system_state'/);
 assert.match(app,/function refreshAfterReset\(\)/);
 assert.match(app,/state\.orders=\[\]/);
 assert.match(app,/state\.chatRows=\[\]/);
 assert.match(app,/renderRestaurant\(\)/);
});
test('aplicativo móvel consulta dados ao receber foco e ao voltar da pausa',()=>{
 assert.match(app,/visibilitychange/);
 assert.match(app,/addEventListener\('focus'/);
 assert.match(app,/15000/);
});
test('ADM confere zero antes de declarar limpeza concluída',()=>{
 assert.match(app,/const remaining=await previewReset\(\)/);
 assert.match(app,/\(remaining\.orders\|\|0\)/);
 assert.match(app,/Limpeza confirmada no Supabase/);
});
test('sinal de reset não concede exclusão diretamente aos colaboradores',()=>{
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/GRANT SELECT ON public\.rl_system_state TO authenticated/);
 assert.doesNotMatch(sql,/GRANT (?:UPDATE|DELETE|INSERT) ON public\.rl_system_state TO authenticated/);
 assert.match(sql,/reset_generation=reset_generation\+1/);
});
