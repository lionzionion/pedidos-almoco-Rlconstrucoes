// Testes de regressão para o cardápio informado pelo restaurante em 15/11/2026.
const { test } = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../app/menu.js');
const M = global.window.RL_MENU;
const week = ['2026-11-15','2026-11-16','2026-11-17','2026-11-18','2026-11-19','2026-11-20','2026-11-21'];
test('todos os 7 dias possuem 3 opções de café (incluindo pão simples) e 3 almoços',()=>{
  for(const d of week) {
    assert.equal(M.items('cafe',d).length,3);
    assert.equal(M.items('almoco',d).length,3);
  }
});
test('cardápios de domingo e quarta estão corretos',()=>{
  assert.deepEqual(M.items('cafe','2026-11-15'),['Cuscuz com frango e vinagrete','Cachorro-quente','Café só com pão']);
  assert.deepEqual(M.items('almoco','2026-11-18'),['Bife à milanesa','Parmegiana de carne','Arrumadinho de frango e calabresa']);
});
test('café do rodízio R$17, pão simples R$10, almoço R$22',()=>{
  assert.equal(M.unitPrice('cafe','Café só com pão'),10);
  assert.equal(M.unitPrice('cafe','Cuscuz com salsichinha'),17);
  assert.equal(M.unitPrice('almoco','Parmegiana de carne'),22);
});
test('frete coletivo único de R$8 tanto no café quanto no almoço, inclusive finais de semana',()=>{
  assert.equal(M.fee('almoco','2026-11-16'),8);
  assert.equal(M.fee('almoco','2026-11-15'),8);
  assert.equal(M.fee('cafe','2026-11-16'),8);
});
test('fechamento começa exatamente às 08h e 13h, hora de Recife',()=>{
  const d='2026-11-16';
  assert.equal(M.closed('cafe',d,new Date('2026-11-16T10:59:00Z')),false);
  assert.equal(M.closed('cafe',d,new Date('2026-11-16T11:00:00Z')),true);
  assert.equal(M.closed('almoco',d,new Date('2026-11-16T15:59:00Z')),false);
  assert.equal(M.closed('almoco',d,new Date('2026-11-16T16:00:00Z')),true);
});
test('taxa é somada uma vez por refeição, nunca por pessoa',()=>{
  const rows=[
    {order_day:'2026-11-15',meal:'cafe',price:17,status:'confirmado',archived:false},
    {order_day:'2026-11-15',meal:'cafe',price:10,status:'confirmado',archived:false},
    {order_day:'2026-11-15',meal:'almoco',price:22,status:'entregue',archived:false},
    {order_day:'2026-11-15',meal:'almoco',price:22,status:'confirmado',archived:false}
  ];
  const s=M.summary(rows,'2026-11-15',new Date('2026-11-15T17:00:00Z'));
  assert.equal(s.subtotal,71);
  assert.equal(s.delivery,16);
  assert.equal(s.total,87);
  assert.equal(s.coffee,2);
  assert.equal(s.lunch,2);
});
test('cancelados e arquivados não entram no fechamento',()=>{
  const s=M.summary([
    {order_day:'2026-11-15',meal:'almoco',price:22,status:'cancelado',archived:false},
    {order_day:'2026-11-15',meal:'cafe',price:17,status:'confirmado',archived:true}
  ],'2026-11-15');
  assert.equal(s.total,0);
  assert.equal(s.delivery,0);
});

test('pode pedir hoje e amanhã, mas não ontem nem depois de amanhã (fuso Recife)',()=>{
  const now=new Date('2026-11-16T22:00:00Z');
  assert.deepEqual(M.orderableDays(now),['2026-11-16','2026-11-17']);
  assert.equal(M.canOrderFor('2026-11-16',now),true);
  assert.equal(M.canOrderFor('2026-11-17',now),true);
  assert.equal(M.canOrderFor('2026-11-15',now),false);
  assert.equal(M.canOrderFor('2026-11-18',now),false);
  assert.deepEqual(M.orderableDays(new Date('2026-11-17T03:05:00Z')),['2026-11-17','2026-11-18']);
});
test('cardápio escolhido para terça é diferente do de segunda',()=>{
  assert.notDeepEqual(M.items('almoco','2026-11-16'),M.items('almoco','2026-11-17'));
});

test('café sempre para amanhã: pedidos da manhã e da tarde',()=>{
  for(const now of [new Date('2026-11-16T13:00:00Z'),new Date('2026-11-16T19:50:00Z')]){
    assert.deepEqual(M.deliveryDays('cafe',now),['2026-11-17']);
    assert.equal(M.canSchedule('cafe','2026-11-16',now),false);
    assert.equal(M.canSchedule('cafe','2026-11-17',now),true);
  }
});
test('almoço de hoje encerra exatamente às 12h no horário de Recife',()=>{
  const before=new Date('2026-11-16T14:59:59Z');
  const atNoon=new Date('2026-11-16T15:00:00Z');
  assert.deepEqual(M.deliveryDays('almoco',before),['2026-11-16','2026-11-17']);
  assert.deepEqual(M.deliveryDays('almoco',atNoon),['2026-11-17']);
  assert.equal(M.canSchedule('almoco','2026-11-16',atNoon),false);
});
