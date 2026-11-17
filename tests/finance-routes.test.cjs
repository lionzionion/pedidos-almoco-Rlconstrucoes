const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

for(const route of ['acesso/index.html','app/index.html']){
  test('A aba Financeiro existe na rota '+route,()=>{
    const html=read(route);
    assert.match(html,/<button[^>]+data-tab="finance"[^>]*>💰 Financeiro<\/button>/);
    assert.match(html,/<section id="finance" class="pane" hidden>/);
    for(const id of ['financeApply','financeStats','financeClosureRows','financePaymentBtn','financeCloseBtn'])
      assert.ok(html.includes('id="'+id+'"'),id+' ausente em '+route);
    const reportScript=html.indexOf('reports.js?v=6');
    const financeScript=html.indexOf('finance.js?v=');
    const loaderScript=html.indexOf('loader.js?v=');
    assert.ok(reportScript>=0&&financeScript>reportScript&&loaderScript>financeScript,
      'Os scripts precisam ser carregados antes do loader na rota '+route);
  });
}
test('Financeiro protegido pelo perfil administrador',()=>{
  const code=read('app/app.js');
  assert.match(code,/if\(tab === 'finance' && !isManager\(\)\) return;/);
  assert.match(code,/\['admin','users','finance'\]\.includes\(t\) && !isManager\(\)/);
  assert.match(code,/window\.RL_FINANCE\?\.init/);
});
