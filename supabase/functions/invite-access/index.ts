import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')||'';
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const origin='https://lionzionion.github.io';
const cors={
  'Access-Control-Allow-Origin':origin,
  'Access-Control-Allow-Headers':'content-type,authorization,apikey,x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Cache-Control':'no-store',
  'Vary':'Origin'
};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}
});
const admin=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const appEmailDomain='@acesso.rl-pedidos.invalid';

function bytesFromHex(hex:string):Uint8Array{
  const out=new Uint8Array(hex.length/2);
  for(let i=0;i<out.length;i++)out[i]=parseInt(hex.slice(i*2,i*2+2),16);
  return out;
}
async function digestToken(token:string):Promise<string>{
  const digest=await crypto.subtle.digest('SHA-256',bytesFromHex(token));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return reply({error:'Método não permitido'},405);
  const source=req.headers.get('origin');
  if(source && source!==origin)return reply({error:'Origem não autorizada'},403);
  if(!SUPABASE_URL||!SERVICE_KEY)return reply({error:'Serviço indisponível'},503);
  let body:Record<string,unknown>;
  try{body=await req.json();}catch{return reply({error:'Dados inválidos'},400);}
  const action=String(body.action||'');
  const token=String(body.token||'').toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(token))return reply({error:'Convite inválido. Solicite outro ao ADM.'},400);
  const tokenHash=await digestToken(token);
  try{
    const {data:invitation,error:lookupError}=await admin.from('staff_invitations')
      .select('username,display_name,company,job_title,role,expires_at,redeemed_at')
      .eq('token_hash',tokenHash).maybeSingle();
    if(lookupError)throw lookupError;
    if(!invitation||invitation.redeemed_at||Date.parse(invitation.expires_at)<=Date.now())
      return reply({error:'Convite utilizado ou expirado. Solicite outro ao ADM.'},410);
    if(action==='inspect'){
      return reply({username:invitation.username,display_name:invitation.display_name,
        company:invitation.company,job_title:invitation.job_title,role:invitation.role});
    }
    if(action!=='redeem')return reply({error:'Ação desconhecida'},400);
    const password=String(body.password||'');
    if(password.length<10||password.length>72)
      return reply({error:'A senha precisa ter de 10 a 72 caracteres.'},400);
    const {data:existing,error:existsError}=await admin.from('profiles')
      .select('id').eq('username',invitation.username).maybeSingle();
    if(existsError)throw existsError;
    if(existing)return reply({error:'Este usuário já está cadastrado. Entre com login e senha.'},409);

    // Reservar o uso único antes de criar o acesso evita duas ativações simultâneas.
    const stamp=new Date().toISOString();
    const {data:claimed,error:claimError}=await admin.from('staff_invitations')
      .update({redeemed_at:stamp}).eq('token_hash',tokenHash)
      .is('redeemed_at',null).gt('expires_at',stamp)
      .select('username').maybeSingle();
    if(claimError)throw claimError;
    if(!claimed)return reply({error:'Este convite já foi utilizado.'},410);
    let createdId:string|null=null;
    try{
      const {data:created,error:createError}=await admin.auth.admin.createUser({
        email:invitation.username+appEmailDomain,
        password,email_confirm:true,
        user_metadata:{full_name:invitation.display_name}
      });
      if(createError||!created.user)throw createError||new Error('Não foi possível criar usuário');
      createdId=created.user.id;
      const {data:profile,error:updateError}=await admin.from('profiles')
        .update({display_name:invitation.display_name,username:invitation.username,
          company:invitation.company,job_title:invitation.job_title,role:invitation.role==='restaurante'?'restaurante':'colaborador',active:true})
        .eq('id',createdId).select('id').single();
      if(updateError||!profile)throw updateError||new Error('Não foi possível concluir cadastro');
      const {error:finishError}=await admin.from('staff_invitations')
        .update({auth_user_id:createdId}).eq('token_hash',tokenHash);
      if(finishError)throw finishError;
      return reply({username:invitation.username,
        email:invitation.username+appEmailDomain,company:invitation.company,
        message:'Acesso ativado. Entrando no sistema...'},201);
    }catch(error){
      if(createdId)await admin.auth.admin.deleteUser(createdId);
      await admin.from('staff_invitations').update({redeemed_at:null,auth_user_id:null})
        .eq('token_hash',tokenHash).eq('redeemed_at',stamp);
      console.error('invite-access redemption:',error instanceof Error?error.message:'Erro desconhecido');
      return reply({error:'Não foi possível concluir o primeiro acesso. Tente novamente ou contate o ADM.'},503);
    }
  }catch(error){
    console.error('invite-access:',error instanceof Error?error.message:'Erro desconhecido');
    return reply({error:'O servidor não conseguiu processar o convite.'},500);
  }
});