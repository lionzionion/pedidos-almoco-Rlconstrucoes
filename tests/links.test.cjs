const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('página inicial é portal RL e aponta ao acesso único',()=>{
  const html=read('index.html');
  assert.match(html,/RL Engenharia/i);
  assert.match(html,/href="\.\/acesso\//);
  assert.match(html,/id="copyShareLink"/);
  assert.match(html,/id="sendWhatsapp"/);
});
test('rota amigável usa o mesmo app autenticado, sem duplicar regras',()=>{
  const html=read('acesso/index.html');
  for(const file of ['config.js','menu.js','reports.js','loader.js'])
    assert.ok(html.includes('../app/'+file), 'Rota de acesso não importa '+file);
  assert.ok(!html.includes('app/legacy'));
  assert.match(html,/rel="canonical"/);
});
test('loader resolve o aplicativo em relação a seu próprio arquivo',()=>{
  const loader=read('app/loader.js');
  assert.match(loader,/document\.currentScript\?\.src/);
  assert.match(loader,/new URL\('app\.js\?v=15', new URL\('\.', loaderURL\)\)/);
});
test('páginas publicadas referenciam arquivos internos existentes',()=>{
  for(const page of ['index.html','produto/index.html','acesso/index.html','app/index.html','demo/index.html','legado/index.html']){
    const html=read(page);
    const refs=[...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(x=>x[1]);
    for(const ref of refs){
      if(!ref.startsWith('./') && !ref.startsWith('../'))continue;
      const pathname=ref.split(/[?#]/)[0];
      const p=path.resolve(root,path.dirname(page),pathname);
      assert.ok(fs.existsSync(p),page+' faz referência a arquivo inexistente: '+ref);
    }
  }
});
test('limpa parâmetro de campanha sem remover outras informações da URL',()=>{
 const calls=[];
 const window={location:{href:'https://exemplo.com/acesso/?utm_source=origem&v=4#login'}};
 const history={state:{},replaceState:(_s,_t,url)=>calls.push(url)};
 vm.runInNewContext(read('assets/clean-links.js'),{window,history,URL});
 assert.equal(calls.length,1);
 assert.equal(calls[0],'/acesso/?v=4#login');
});
