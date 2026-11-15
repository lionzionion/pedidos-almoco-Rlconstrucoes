const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const schema = fs.readFileSync(path.join(__dirname,'../supabase/schema.sql'),'utf8');
const migration = fs.readFileSync(path.join(__dirname,'../supabase/fix-order-profile-role.sql'),'utf8');

test('trigger usa variável própria para o perfil e não CURRENT_ROLE do PostgreSQL',()=>{
 const start=schema.indexOf('create or replace function rl_private.guard_order()');
 const end=schema.indexOf('revoke all on function rl_private.guard_order()',start);
 assert.ok(start>=0&&end>start,'Trigger guard_order deve existir');
 const body=schema.slice(start,end);
 assert.match(body,/v_actor_profile_role text;/);
 assert.match(body,/select role,display_name into v_actor_profile_role,v_actor_profile_name/);
 assert.match(body,/if v_actor_profile_role not in \('colaborador','admin'\)/);
 assert.doesNotMatch(body,/\bcurrent_role\b/i);
 assert.match(body,/elsif v_actor_profile_role='restaurante'/);
 assert.match(body,/elsif v_actor_profile_role='colaborador'/);
});

test('migração aplicada preserva validação de papel e corrige apenas a colisão',()=>{
 assert.match(migration,/pg_get_functiondef\('rl_private\.guard_order\(\)'::regprocedure\)/);
 assert.match(migration,/replace\(original, 'current_role', 'v_actor_profile_role'\)/);
 assert.match(migration,/replace\(original, 'current_name', 'v_actor_profile_name'\)/);
 assert.doesNotMatch(migration,/drop table|delete from public\.orders/i);
});
