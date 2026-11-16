const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const schema=read('supabase/chat-and-reset.sql');
const patch=read('supabase/fix-delete-users-with-chat.sql');
const edge=read('supabase/functions/manage-users/index.ts');

test('restaurante com mensagens pode ser excluído preservando remetente e corpo',()=>{
  assert.match(schema,/sender_id uuid REFERENCES public\.profiles\(id\) ON DELETE SET NULL/);
  assert.match(schema,/sender_name text NOT NULL/);
  assert.match(patch,/ALTER COLUMN sender_id DROP NOT NULL/);
  assert.match(patch,/chat_messages_sender_id_fkey/);
  assert.match(patch,/ON DELETE SET NULL/);
});

test('exclusão de colaborador elimina apenas sua conversa particular',()=>{
  assert.match(schema,/thread_owner uuid REFERENCES public\.profiles\(id\) ON DELETE CASCADE/);
  assert.match(patch,/chat_messages_thread_owner_fkey/);
  assert.match(patch,/ON DELETE CASCADE/);
});

test('servidor protege histórico financeiro e conta ADM na exclusão',()=>{
  assert.match(edge,/target\.id === caller \|\| \(target\.role === 'admin' && action !== 'set_role'\)/);
  assert.match(edge,/if \(action === 'delete_user'\)/);
  assert.match(edge,/\.eq\('owner', id\)/);
  assert.match(edge,/\(count \?\? 0\) > 0/);
  assert.match(edge,/admin\.auth\.admin\.deleteUser\(id\)/);
});

test('exclusão bem-sucedida limpa convite ativado sem apagar auditoria administrativa',()=>{
  assert.match(edge,/\.delete\(\)\.eq\('username',target\.username\)/);
  assert.match(edge,/action: 'delete_user'/);
  assert.match(edge,/removed_user_id: id/);
});
