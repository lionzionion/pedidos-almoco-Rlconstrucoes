import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

const URL = Deno.env.get('SUPABASE_URL') || '';
const ADMIN_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const allowedOrigin = 'https://lionzionion.github.io';
const appEmailDomain = '@acesso.rl-pedidos.invalid';
const cors = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const admin = createClient(URL, ADMIN_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const authClient = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const cleanName = (s: unknown) => typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '';
// "Usuário Teste", "JOÃO CAMPOS" e "restaurante teste" viram logins consistentes.
// O servidor normaliza novamente: ninguém depende apenas do JavaScript do navegador.
const normalizedUsername = (input: unknown) => {
  const name = cleanName(input).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const value = name.replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').replace(/\.{2,}/g, '.');
  return value.length > 30 ? value.slice(0, 30).replace(/\.+$/g, '') : value;
};
const validUsername = (u: string) => /^[a-z][a-z0-9._-]{2,29}$/.test(u);
const validPassword = (p: unknown) => typeof p === 'string' && p.length >= 8 && p.length <= 72;
const managedRole = (r: unknown) => r === 'colaborador' || r === 'restaurante';
// Gerador criptográfico sem persistir senhas recuperáveis no banco.
const randomPassword = () => {
  const groups=['ABCDEFGHJKLMNPQRSTUVWXYZ','abcdefghijkmnopqrstuvwxyz','23456789','!@#$%&*'];
  const all=groups.join('');
  const pick=(chars:string) => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
  const chars=[...groups.map(pick), ...Array.from({length:12},()=>pick(all))];
  for(let i=chars.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[chars[i],chars[j]]=[chars[j],chars[i]];}
  return chars.join('');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405);
  const origin = req.headers.get('origin');
  if (origin && origin !== allowedOrigin) return reply({ error: 'Origem não autorizada.' }, 403);
  if (!URL || !ADMIN_KEY || !ANON_KEY) return reply({ error: 'Configuração do servidor indisponível.' }, 503);
  const bearer = req.headers.get('authorization') || '';
  const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
  if (!token || token.split('.').length !== 3) return reply({ error: 'Faça login novamente.' }, 401);

  // JWT sempre validado no servidor, nunca confiar no papel informado pelo cliente.
  const { data: who, error: authError } = await authClient.auth.getUser(token);
  if (authError || !who.user) return reply({ error: 'Sessão inválida.' }, 401);
  const caller = who.user.id;
  const { data: profile, error: profileError } = await admin.from('profiles').select('role,active').eq('id', caller).single();
  if (profileError || !profile || !profile.active || profile.role !== 'admin') {
    return reply({ error: 'Somente a administração da RL pode gerenciar acessos.' }, 403);
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply({ error: 'Dados inválidos.' }, 400); }
  const action = String(body.action || '');
  try {
    if (action === 'list') {
      const { data, error } = await admin.from('profiles')
        .select('id,username,display_name,role,active,created_at')
        .order('display_name', { ascending: true }).limit(500);
      if (error) throw error;
      return reply({ accounts: data || [] });
    }

    if (action === 'reset_preview') {
      const tables=['orders','order_audit','chat_messages'];
      const counts:Record<string,number>={};
      for(const table of tables) {
        const {count,error}=await admin.from(table).select('*',{count:'exact',head:true});
        if(error) throw error;
        counts[table]=count??0;
      }
      return reply({counts});
    }
    if (action === 'reset_test_data') {
      if(body.confirm !== 'ZERAR TESTES')return reply({error:'Confirmação inválida. Digite ZERAR TESTES.'},400);
      const {data,error}=await admin.rpc('rl_reset_test_records',{
        p_actor:caller,p_confirm:body.confirm
      });
      if(error)throw error;
      return reply({message:'Pedidos, auditoria de pedidos e conversas de teste apagados. Usuários e trilha administrativa preservados.',counts:data});
    }

    if (action === 'create') {
      const username = normalizedUsername(body.username || body.display_name);
      const displayName = cleanName(body.display_name);
      const autoPassword=body.password==='AUTO' || body.password===undefined;
      const password = autoPassword ? randomPassword() : body.password;
      const role = body.role;
      if (!validUsername(username)) return reply({ error: 'Informe um nome de usuário com pelo menos 3 caracteres, por exemplo usuario.teste ou restaurante.teste.' }, 400);
      if (displayName.length < 3 || displayName.length > 80) return reply({ error: 'Informe nome completo com 3–80 caracteres.' }, 400);
      if (!validPassword(password)) return reply({ error: 'A senha deve ter entre 8 e 72 caracteres.' }, 400);
      if (!managedRole(role)) return reply({ error: 'Perfil deve ser colaborador ou restaurante.' }, 400);
      const { data: exists, error: findError } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
      if (findError) throw findError;
      if (exists) return reply({ error: 'Este nome de usuário já está cadastrado.' }, 409);

      // E-mail técnico interno: colaborador faz login com usuário; não exige e-mail pessoal.
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: username + appEmailDomain,
        password: password as string,
        email_confirm: true,
        user_metadata: { full_name: displayName },
      });
      if (createError || !created.user) return reply({ error: createError?.message || 'Não foi possível cadastrar.' }, 400);
      const target = created.user.id;
      const { data: updated, error: updateError } = await admin.from('profiles')
        .update({ display_name: displayName, username, role, active: true })
        .eq('id', target)
        .select('id,username,display_name,role,active,created_at')
        .single();
      if (updateError || !updated) {
        // Compensa criação parcial; usuário recém-criado ainda não recebeu acesso.
        await admin.auth.admin.deleteUser(target);
        return reply({ error: 'Cadastro incompleto. Revise usuário e tente novamente.' }, 409);
      }
      await admin.from('account_audit').insert({ actor: caller, target, action: 'create', details: { username, role } });
      return reply({ account: updated, password: autoPassword ? password : undefined, message: 'Usuário cadastrado na nuvem.' }, 201);
    }

    const id = cleanName(body.id);
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) return reply({ error: 'ID inválido.' }, 400);
    const { data: target, error: targetError } = await admin.from('profiles')
      .select('id,username,display_name,role,active').eq('id',id).single();
    if (targetError || !target) return reply({ error: 'Usuário não encontrado.' }, 404);
    if (target.id === caller || target.role === 'admin') return reply({ error: 'Esta conta administrativa está protegida.' }, 403);
    if (!target.username) return reply({ error: 'Conta de e-mail não gerenciada por este painel.' }, 403);

    if (action === 'delete_user') {
      // Administrador e demais contas com role admin são protegidos acima.
      // Excluir conta com pedidos violaria a integridade das medições/relatórios.
      const { count, error: countError } = await admin.from('orders')
        .select('id', { count: 'exact', head: true }).eq('owner', id);
      if (countError) throw countError;
      if ((count ?? 0) > 0) {
        return reply({ error: 'Este usuário já possui pedidos registrados. Para preservar a conferência financeira, desative o acesso em vez de excluir.' }, 409);
      }
      const { error: deleteError } = await admin.auth.admin.deleteUser(id);
      if (deleteError) {
        console.error('manage-users delete_user:', deleteError.message);
        return reply({ error: 'Não foi possível excluir este usuário. Confira se há registros vinculados e tente novamente.' }, 409);
      }
      // target=null intencional: a FK de auditoria é SET NULL após a remoção.
      // Guardar identificador e nome histórico evita perder a identificação da exclusão.
      const { error: auditError } = await admin.from('account_audit').insert({
        actor: caller, target: null, action: 'delete_user',
        details: { removed_user_id: id, username: target.username, display_name: target.display_name, role: target.role }
      });
      if (auditError) console.error('manage-users audit:', auditError.message);
      return reply({ message: 'Usuário excluído definitivamente do acesso e da autenticação. Histórico administrativo preservado.' });
    }
    if (action === 'set_active') {
      if (typeof body.active !== 'boolean') return reply({ error: 'Estado inválido.' }, 400);
      const { error } = await admin.from('profiles').update({ active: body.active }).eq('id',id);
      if (error) throw error;
      await admin.from('account_audit').insert({actor:caller,target:id,action:body.active?'activate':'deactivate'});
      return reply({ message: body.active ? 'Conta reativada.' : 'Conta desativada. Acesso aos pedidos bloqueado.' });
    }
    if (action === 'set_role') {
      if (!managedRole(body.role)) return reply({ error: 'Perfil inválido.' },400);
      const { error } = await admin.from('profiles').update({ role: body.role }).eq('id',id);
      if (error) throw error;
      await admin.from('account_audit').insert({actor:caller,target:id,action:'change_role',details:{from:target.role,to:body.role}});
      return reply({ message: 'Permissão atualizada.' });
    }
    if (action === 'reset_password') {
      const generated=body.password==='AUTO';
      const nextPassword=generated?randomPassword():body.password;
      if (!validPassword(nextPassword)) return reply({ error:'Nova senha exige 8 a 72 caracteres.' },400);
      const { error } = await admin.auth.admin.updateUserById(id,{password:nextPassword as string});
      if (error) throw error;
      await admin.from('account_audit').insert({actor:caller,target:id,action:'reset_password'});
      return reply({ password: generated?nextPassword:undefined, message: 'Senha redefinida. Entregue-a diretamente ao usuário.' });
    }
    return reply({ error:'Ação não reconhecida.' },400);
  } catch (error) {
    console.error('manage-users:', error instanceof Error ? error.message : 'erro');
    return reply({ error:'O servidor não concluiu a operação. Tente novamente.' },500);
  }
});
