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
test('entrega de almoço de semana R$8; fim de semana e café R$12',()=>{
  assert.equal(M.fee('almoco','2026-11-16'),8);
  assert.equal(M.fee('almoco','2026-11-15'),12);
  assert.equal(M.fee('cafe','2026-11-16'),12);
});
test('taxa é somada uma vez por refeição, nunca por pessoa',()=>{
  const rows=[
    {order_day:'2026-11-15',meal:'cafe',price:17,status:'confirmado',archived:false},
    {order_day:'2026-11-15',meal:'cafe',price:10,status:'confirmado',archived:false},
    {order_day:'2026-11-15',meal:'almoco',price:22,status:'entregue',archived:false},
    {order_day:'2026-11-15',meal:'almoco',price:22,status:'confirmado',archived:false}
  ];
  const s=M.summary(rows,'2026-11-15');
  assert.equal(s.subtotal,71);
  assert.equal(s.delivery,24);
  assert.equal(s.total,95);
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
