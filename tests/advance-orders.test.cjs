const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const app=read('app/app.js'),schema=read('supabase/schema.sql'),migration=read('supabase/allow-next-day-orders.sql');

test('ambas as páginas mostram data de entrega e carregam versões atualizadas',()=>{
 for(const p of ['app/index.html','acesso/index.html']){
  const html=read(p);
  assert.match(html,/id="orderDay"/);
  assert.match(html,/menu\.js\?v=7/);
  assert.match(html,/loader\.js\?v=19/);
 }
});
test('pedido passa a data selecionada para a base e para o modo demonstração',()=>{
 assert.match(app,/syncOrderDayChoices\(\)/);
 assert.match(app,/M\.items\(type,day\)/);
 assert.match(app,/order_day:day,meal:type/);
 assert.match(app,/M\.canSchedule\(type,day\)/);
 assert.match(app,/\$\('orderDay'\)\.addEventListener\('change'/);
});
test('banco limita pedidos novos a hoje ou amanhã, com data imutável na edição',()=>{
 assert.match(schema,/new\.order_day:=coalesce\(new\.order_day/);
 assert.match(schema,/new\.order_day not between/);
 assert.match(schema,/Identificação e data não podem ser alteradas/);
 assert.match(migration,/pg_get_functiondef/);
 assert.match(migration,/Só é permitido fazer pedidos para hoje ou amanhã/);
});

test('banco aplica política especial para café e almoço do dia seguinte',()=>{
 const migration=read('supabase/breakfast-delivery-next-day.sql');
 assert.match(migration,/new.meal='cafe'/);
 assert.match(migration,/time '12:00'/);
 assert.match(migration,/pg_get_functiondef/);
 assert.match(app,/M\.deliveryDays\(meal\(\)\)/);
 assert.match(app,/M\.canSchedule\(type,day\)/);
 assert.match(schema,/new.meal='cafe'/);
});
