const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const schema=fs.readFileSync(path.join(root,'supabase/chat-and-reset.sql'),'utf8');
const edge=fs.readFileSync(path.join(root,'supabase/functions/manage-users/index.ts'),'utf8');
test('zerar testes não executa DELETE sem WHERE (safeupdate Supabase)',()=>{
 for(const table of ['order_audit','orders','chat_messages']){
   assert.match(schema,new RegExp('DELETE FROM public\\.'+table+' WHERE id IS NOT NULL;'));
   assert.doesNotMatch(schema,new RegExp('DELETE FROM public\\.'+table+';'));
 }
});
test('reset continua transacional, limitado a dados operacionais, com autenticação ADM',()=>{
 assert.match(schema,/p_confirm <> 'ZERAR TESTES'/);
 assert.match(schema,/role='admin'/);
 assert.match(schema,/INSERT INTO public\.account_audit/);
 assert.match(edge,/if \(action === 'reset_test_data'\)/);
 assert.match(edge,/admin\.rpc\('rl_reset_test_records'/);
 assert.doesNotMatch(schema,/DELETE FROM public\.profiles/);
 assert.doesNotMatch(schema,/DELETE FROM auth\.users/);
});
