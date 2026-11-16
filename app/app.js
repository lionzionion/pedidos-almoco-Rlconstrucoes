/* AMBEV Pedidos RL — interface. A autorização real é aplicada pelo Supabase RLS. */
(() => {
  'use strict';
  const M = window.RL_MENU;
  const C = window.RL_CONFIG || {};
  const hasConfig = Boolean(C.supabaseUrl && C.supabaseAnonKey);
  const configured = hasConfig && Boolean(window.supabase);
  const client = configured ? window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey) : null;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localKey = 'rl-demo-pedidos-v1';
  const state = {role: 'colaborador', user: null, profile: null, orders: [], users: [], invitations: [], chatPeople: [], chatRows: [], chatOwner:null, dish:'', sides:[], editing:null, tab:'order', demoName:'Colaborador de teste'};
  const name = () => state.profile?.display_name || state.demoName;
  const ownId = () => state.user?.id || 'demo-user';
  const meal = () => document.querySelector('input[name="meal"]:checked')?.value || 'almoco';
  const statusLabels = {'confirmado':'Confirmado','preparo':'Em preparo','entregue':'Entregue','cancelado':'Cancelado'};
  const active = o => !o.archived && o.status !== 'cancelado';
  const isManager = () => state.role === 'admin';
  const isRestaurant = () => state.role === 'restaurante';
  const isStaff = () => state.role === 'colaborador' || isManager();
  const mealTitle = t => t === 'cafe' ? 'Café da manhã' : 'Almoço';
  function inform(text, error=false) {
    const n=$('notice'); n.hidden=false; n.textContent=text; n.style.background=error?'#ffe9e7':'#e9f8eb'; n.style.borderColor=error?'#daaaaa':'#a8d2b2'; n.style.color=error?'#9e2c24':'#205c36';
  }
  function fail(err) { inform(err?.message || String(err), true); }
  function readDemo() { try { const v=JSON.parse(localStorage.getItem(localKey) || '[]'); return Array.isArray(v)?v:[]; } catch { return []; } }
  function writeDemo() { localStorage.setItem(localKey, JSON.stringify(state.orders)); }
  function syncOrderDayChoices() {
    const select=$('orderDay'), days=M.orderableDays();
    const editingOrder=state.editing && state.orders.find(o=>o.id===state.editing);
    const wanted=editingOrder?.order_day || select.value;
    select.innerHTML=days.map((day,i)=>'<option value="'+day+'">'+
      (i===0?'Hoje':'Amanhã')+' — '+day.split('-').reverse().join('/')+'</option>').join('');
    select.value=days.includes(wanted)?wanted:days[0];
    select.disabled=Boolean(editingOrder);
    return select.value;
  }
  function initializeDay() {
    const day=M.today();
    $('todayLabel').textContent = M.days[M.weekday(day)] + ', ' + day.split('-').reverse().join('/');
    $('restaurantDate').value=day; $('adminDate').value=day;
    syncOrderDayChoices();
  }
  function begin() {
    initializeDay();
    if(hasConfig && !window.supabase) {
      $('demo').hidden=true; $('login').hidden=true; $('app').hidden=true;
      inform('Não foi possível carregar o Supabase. Verifique sua conexão e recarregue a página. Pedidos reais estão bloqueados.',true);
      return;
    }
    if(!configured) {
      $('demo').hidden=false; $('login').hidden=true; $('app').hidden=false;
      state.orders=readDemo(); state.profile={display_name:state.demoName,role:'colaborador'};
      inform('MODO DEMONSTRAÇÃO: os pedidos são salvos somente neste navegador. Configure Supabase antes de usar na obra.',true);
      renderAll();
      return;
    }
    $('demo').hidden=true;
    $('login').hidden=false;
    $('loginBtn').disabled=false;
    const boot=$('bootStatus');
    if(boot)boot.hidden=true;
    window.RL_APP_BOOTED=true;
    client.auth.getUser().then(({data,error}) => { if(error && !/Auth session missing/i.test(error.message||'')) fail(error); return setUser(data?.user || null); }).catch(fail);
    client.auth.onAuthStateChange((_event,session) => { setTimeout(()=>setUser(session?.user || null),0); });
    client.channel('rl-order-updates').on('postgres_changes', {event:'*',schema:'public',table:'orders'}, () => reload()).subscribe();
    client.channel('rl-chat-updates').on('postgres_changes', {event:'INSERT',schema:'public',table:'chat_messages'}, () => {
      if(state.user && state.tab==='chat') loadChat();
    }).subscribe();
    // O restaurante e os colaboradores também recebem o aviso de limpeza do ADM.
    client.channel('rl-system-reset').on('postgres_changes',
      {event:'UPDATE',schema:'public',table:'rl_system_state'},
      () => refreshAfterReset()
    ).subscribe();
    // Segurança adicional quando a aba retorna do segundo plano (especialmente no celular).
    document.addEventListener('visibilitychange', () => {
      if(!document.hidden && state.user) reload();
    });
    window.addEventListener('focus', () => { if(state.user) reload(); });
    setInterval(() => { if (state.user && !document.hidden) reload(); }, 15000);
  }
  async function setUser(user) {
    state.user=user;
    if(!user) {
      state.profile=null; $('login').hidden=false; $('app').hidden=true; $('who').textContent='';
      state.chatPeople=[];state.chatRows=[];hideOneTime();clearGeneratedInvite();
      return;
    }
    try {
      const {data,error}=await client.from('profiles').select('id,display_name,role,username,active,company,job_title').eq('id',user.id).single();
      if(error || !data?.active) {
        await client.auth.signOut();
        inform('Seu usuário não está ativo. Procure a administração RL para liberação.',true);
        return;
      }
      state.profile=data; state.role=data.role;
      state.tab=data.role==='admin'?'admin':data.role==='restaurante'?'restaurant':'order';
      $('login').hidden=true; $('app').hidden=false;
      await reload();
      if(data.role==='admin') await loadUsers();
    } catch(error) { fail(error); }
  }
  async function authAction() {
    const rawLogin=$('loginEmail').value.trim();
    const password=$('loginPassword').value;
    if(!rawLogin || !password) return inform('Informe seu usuário e sua senha.',true);
    // O cadastro normaliza espaços/acentos; o login deve seguir a mesma regra.
    const login=rawLogin.includes('@')?rawLogin.toLowerCase():normalizeLogin(rawLogin);
    if(!rawLogin.includes('@') && login.length<3)
      return inform('Confira o nome de usuário. Exemplo: usuario.teste.',true);
    $('loginEmail').value=login;
    const email=login.includes('@')?login:login+'@acesso.rl-pedidos.invalid';
    const button=$('loginBtn');button.disabled=true;
    try {
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error) {
        inform('Login ou senha não conferem. Verifique o usuário correto e solicite ao ADM a redefinição da senha, se necessário.',true);
        return;
      }
      if(data?.user) await setUser(data.user);
    } catch(error) {
      inform('Não foi possível conectar ao serviço de login. Confira sua conexão e tente novamente.',true);
    } finally {button.disabled=false;}
  }
  function chooseTab(tab) {
    if(tab === 'order' && !isStaff()) return;
    if(tab === 'mine' && !isStaff()) return;
    if(tab === 'restaurant' && !isRestaurant() && !isManager()) return;
    if(tab === 'admin' && !isManager()) return;
    if(tab === 'users' && !isManager()) return;
    if(tab === 'chat' && !configured) return;
    if(tab === 'security' && !configured) return;
    state.tab=tab;
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active',b.dataset.tab===tab));
    document.querySelectorAll('.pane').forEach(p => p.hidden=(p.id!==tab));
    if(tab==='chat') initChat();
  }
  function renderTabs() {
    document.querySelectorAll('[data-tab]').forEach(b => {
      const t=b.dataset.tab;
      b.hidden=(['order','mine'].includes(t) && !isStaff()) || (t==='restaurant' && !isManager() && !isRestaurant()) || (['admin','users'].includes(t) && !isManager()) || (['chat','security'].includes(t) && !configured);
    });
    $('logoutBtn').hidden=!configured;
    $('who').textContent = name() + ' • ' + ({admin:'Gestão RL',restaurante:'Restaurante',colaborador:'Colaborador'}[state.role]||'') + ((state.role==='colaborador'||state.role==='admin')?' • '+(state.profile?.company==='SOLUTIO'?'Solutio':'RL Construções'):'');
    if((['order','mine'].includes(state.tab) && !isStaff()) || (['admin','users'].includes(state.tab) && !isManager()) || (state.tab==='restaurant' && !isRestaurant() && !isManager())) {
      state.tab=isRestaurant() ? 'restaurant' : isManager() ? 'admin' : 'order';
    }
    chooseTab(state.tab);
  }
  function renderMenu() {
    const day=syncOrderDayChoices();
    const type=meal(), available=M.items(type,day);
    if(!available.includes(state.dish)) state.dish=available[0];
    $('menuDay').textContent=M.days[M.weekday(day)] + ' — ' + day.split('-').reverse().join('/');
    $('menuCards').innerHTML=available.map((dish,i) =>
      '<label class="menu-card"><input type="radio" name="dish" value="'+esc(dish)+'" '+(dish===state.dish?'checked':'')+'><span>'+esc(dish)+'<small>'+M.money(M.unitPrice(type,dish))+(type==='cafe' && dish==='Café só com pão'?' • opção simples':'')+'</small></span></label>'
    ).join('');
    $('menuCards').querySelectorAll('input').forEach(input => input.addEventListener('change',()=>{state.dish=input.value;renderPrice();}));
    $('sideSection').hidden=type==='cafe';
    if(type==='almoco') {
      $('sides').innerHTML=M.sides.map(side => '<label><input type="checkbox" value="'+esc(side)+'" '+(state.sides.includes(side)?'checked':'')+'> '+esc(side)+'</label>').join('');
      $('sides').querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{
        if(input.checked && input.value.startsWith('Feijão ')) state.sides=state.sides.filter(s=>!s.startsWith('Feijão '));
        state.sides=input.checked ? [...new Set([...state.sides,input.value])] : state.sides.filter(s=>s!==input.value);
        renderMenu();
      }));
    }
    renderPrice();
  }
  function renderPrice() {
    const type=meal();
    $('unitPrice').textContent=M.money(M.unitPrice(type,state.dish));
    $('feePreview').textContent=M.money(M.fee(type,$('orderDay').value));
    $('orderDeadlineInfo').textContent='MODO DE TESTES: pedidos liberados a qualquer hora para hoje e amanhã. Entrega: '+$('orderDay').value.split('-').reverse().join('/')+'. Frete coletivo único de R$ 8 por refeição.';
    $('orderDeadlineInfo').classList.remove('error');
    $('placeBtn').disabled=false;
  }
  function clearEdit() {
    state.editing=null; state.dish=''; state.sides=[]; $('notes').value='';
    $('placeBtn').textContent='Confirmar pedido'; $('clearEditBtn').hidden=true;
    renderMenu();
  }
  function refreshAfterReset() {
    if(!state.user)return;
    // Remove dados antigos instantaneamente antes da leitura nova da nuvem.
    state.orders=[];
    state.chatRows=[];
    renderMine();
    renderRestaurant();
    renderAdmin();
    if(state.tab==='chat')loadChat();
    reload();
  }
  async function reload() {
    try {
      if(configured) {
        if(!state.user) return;
        const {data,error}=await client.from('orders').select('*').order('created_at',{ascending:false}).limit(1000);
        if(error) throw error;
        state.orders=data || [];
      } else { state.orders=readDemo(); }
      renderAll();
    } catch(error){ fail(error); }
  }
  function renderAll() { renderTabs(); renderMenu(); renderMine(); renderRestaurant(); renderAdmin(); renderUsers(); }
  async function saveOrder() {
    if(!isStaff()) return;
    const day=$('orderDay').value;
    const type=meal(), dish=state.dish, sides=type==='almoco'?[...state.sides]:[], notes=$('notes').value.trim();
    if(!M.canOrderFor(day)) return inform('É possível pedir somente para hoje ou amanhã, no horário de Recife.',true);
    if(!M.items(type,day).includes(dish)) return inform('Escolha uma opção válida do cardápio da data selecionada.',true);
    if(state.editing && state.orders.find(o=>o.id===state.editing)?.order_day!==day)
      return inform('Não é permitido alterar a data de um pedido em edição.',true);
    const feedback=$('orderFeedback');
    $('placeBtn').disabled=true;
    try {
      if(configured) {
        let response;
        if(state.editing) response = await client.from('orders').update({meal:type,dish,accompaniments:sides,notes}).eq('id',state.editing).select().single();
        else response = await client.from('orders').insert({owner:ownId(),order_day:day,meal:type,dish,accompaniments:sides,notes}).select().single();
        if(response.error) throw response.error;
      } else {
        if(state.editing){
          const o=state.orders.find(o=>o.id===state.editing);
          if(!o || o.status!=='confirmado') throw Error('Este pedido não pode mais ser editado.');
          Object.assign(o,{meal:type,dish,accompaniments:sides,notes,price:M.unitPrice(type,dish),updated_at:new Date().toISOString()});
        } else {
          const duplicate=state.orders.some(o=>o.owner===ownId() && o.order_day===day && o.meal===type && active(o));
          if(duplicate) throw Error('Você já tem um pedido ativo deste período. Edite ou cancele o anterior.');
          state.orders.unshift({id:crypto.randomUUID(),owner:ownId(),employee_name:name(),order_day:day,meal:type,dish,accompaniments:sides,notes,price:M.unitPrice(type,dish),status:'confirmado',archived:false,created_at:new Date().toISOString()});
        }
        writeDemo();
      }
      feedback.textContent=state.editing?'Pedido atualizado com sucesso!':'Pedido confirmado e registrado com sucesso!';
      feedback.classList.remove('error');
      clearEdit(); await reload();
      chooseTab('mine');
    } catch(err) { feedback.textContent=err.message||String(err); feedback.classList.add('error'); }
    finally { $('placeBtn').disabled=false; }
  }
  async function updateOrder(id, changes) {
    try {
      const item=state.orders.find(o=>o.id===id);
      if(!item) throw Error('Pedido não encontrado.');
      if(configured) {
        const {data,error}=await client.from('orders').update(changes).eq('id',id).select().single();
        if(error) throw error;
      } else {
        Object.assign(item,changes,{updated_at:new Date().toISOString()});
        writeDemo();
      }
      await reload();
    } catch(error) { fail(error); }
  }
  function editOrder(id) {
    const o=state.orders.find(o=>o.id===id);
    if(!o || o.status!=='confirmado' || o.archived || o.owner!==ownId()) return;
    if(!M.canOrderFor(o.order_day)) return inform('Pedidos de datas anteriores não podem ser editados.',true);
    state.editing=id;
    document.querySelector('input[name="meal"][value="'+o.meal+'"]').checked=true;
    state.dish=o.dish; state.sides=[...(o.accompaniments||[])]; $('notes').value=o.notes||'';
    $('placeBtn').textContent='Salvar alterações'; $('clearEditBtn').hidden=false;
    renderMenu(); chooseTab('order'); window.scrollTo({top:0,behavior:'smooth'});
  }
  function cancelOrder(id) {
    const o=state.orders.find(o=>o.id===id);
    if(!o || o.status!=='confirmado' || o.owner!==ownId()) return;
    if(!confirm('Cancelar este pedido? Ele ficará identificado como cancelado na conferência.')) return;
    updateOrder(id,{status:'cancelado',cancel_reason:'Cancelado pelo colaborador'});
  }
  function statusBadge(o){ return '<span class="status '+(o.archived?'arquivado':esc(o.status))+'">'+(o.archived?'Arquivado':esc(statusLabels[o.status]||o.status))+'</span>'; }
  function orderCard(o, controls) {
    let buttons='';
    if(controls==='mine' && active(o) && o.status==='confirmado' && o.owner===ownId())
      buttons=(M.canOrderFor(o.order_day)?'<button class="secondary compact" data-act="edit" data-id="'+esc(o.id)+'">Editar</button>':'')+
        '<button class="danger compact" data-act="cancel" data-id="'+esc(o.id)+'">Cancelar pedido</button>';
    if(controls==='restaurant' && !o.archived && o.status==='confirmado')
      buttons='<button class="secondary compact" data-act="prepare" data-id="'+esc(o.id)+'">Iniciar preparo</button>';
    if(controls==='restaurant' && !o.archived && o.status==='preparo')
      buttons='<button class="primary compact" data-act="deliver" data-id="'+esc(o.id)+'">Marcar entregue</button>';
    const sides=(o.accompaniments||[]).join(', ');
    return '<article class="entry"><div class="entry-top"><div><strong>'+esc(o.employee_name)+'</strong><br><small>'+esc(o.order_day.split('-').reverse().join('/'))+' • '+mealTitle(o.meal)+' • '+(o.company==='SOLUTIO'?'Solutio':'RL Construções')+'</small></div>'+statusBadge(o)+'</div><p><b>'+esc(o.dish)+'</b> — '+M.money(o.price)+'</p>'+(sides?'<p class="small">Acompanhamentos: '+esc(sides)+'</p>':'')+(o.notes?'<p class="small">Observações: '+esc(o.notes)+'</p>':'')+(o.cancel_reason?'<p class="small">Motivo: '+esc(o.cancel_reason)+'</p>':'')+(buttons?'<div class="actions">'+buttons+'</div>':'')+'</article>';
  }
  function bindActions(root) {
    root.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{
      const id=b.dataset.id;
      if(b.dataset.act==='edit') editOrder(id);
      if(b.dataset.act==='cancel') cancelOrder(id);
      if(b.dataset.act==='prepare') updateOrder(id,{status:'preparo'});
      if(b.dataset.act==='deliver') updateOrder(id,{status:'entregue'});
      if(b.dataset.act==='archive') {
        if(confirm('Arquivar este pedido? O histórico será preservado.')) updateOrder(id,{archived:true});
      }
      if(b.dataset.act==='restore') {
        if(confirm('Restaurar este pedido para a lista ativa?')) updateOrder(id,{archived:false});
      }
      if(b.dataset.act==='admincancel') {
        const reason=prompt('Motivo do cancelamento administrativo:');
        if(reason && reason.trim()) updateOrder(id,{status:'cancelado',cancel_reason:reason.trim()});
      }
    }));
  }
  function renderMine(){
    const el=$('mineList');
    const mine=state.orders.filter(o=>o.owner===ownId()).sort((a,b)=>b.created_at.localeCompare(a.created_at));
    el.innerHTML=mine.length?mine.map(o=>orderCard(o,'mine')).join(''):'<div class="empty">Nenhum pedido cadastrado. Comece em Fazer pedido.</div>';
    bindActions(el);
  }
  function metric(label,value){return '<div class="metric"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>';}
  function renderRestaurant() {
    const day=$('restaurantDate').value||today, type=$('restaurantMeal').value;
    // Restaurante único: visualiza TODOS os pedidos de ambas empresas.
    const rows=state.orders.filter(o=>o.order_day===day && !o.archived && (type==='todos'||o.meal===type));
    const s=M.summary(rows,day), companies=M.companyBreakdown(rows,day);
    const rl=companies.RL.coffee+companies.RL.lunch;
    const sol=companies.SOLUTIO.coffee+companies.SOLUTIO.lunch;
    $('restaurantStats').innerHTML=metric('Pedidos RL',rl)+metric('Pedidos Solutio',sol)+
      metric('Cafés ativos',s.coffee)+metric('Almoços ativos',s.lunch)+
      metric('Total da remessa conjunta',M.money(s.total));
    const el=$('restaurantList');
    el.innerHTML=rows.length?rows.map(o=>orderCard(o,'restaurant')).join(''):'<div class="empty">Nenhum pedido para esta data e refeição.</div>';
    bindActions(el);
  }
  function filteredAdmin() {
    const day=$('adminDate').value||today, type=$('adminMeal').value, company=$('adminCompany').value;
    const allRows=state.orders.filter(o=>o.order_day===day && (type==='todos'||o.meal===type));
    const rows=company==='todos'?allRows:allRows.filter(o=>(o.company==='SOLUTIO'?'SOLUTIO':'RL')===company);
    return {day,company,rows,allRows};
  }
  function adminSummary(info){
    return info.company==='todos'?M.summary(info.allRows,info.day):
      M.companyBreakdown(info.allRows,info.day)[info.company];
  }
  function renderAdmin(){
    const info=filteredAdmin(), {rows,day,company}=info;
    const s=adminSummary(info), b=M.companyBreakdown(info.allRows,day);
    const companyTotals=company==='todos'
      ?metric('RL Construções (com frete rateado)',M.money(b.RL.total))
       +metric('Solutio (com frete rateado)',M.money(b.SOLUTIO.total))
      :'';
    $('adminStats').innerHTML=metric('Cafés',s.coffee)+metric('Almoços',s.lunch)+
      metric('Refeições',M.money(s.subtotal))+metric('Frete proporcional',M.money(s.delivery))+
      metric(company==='todos'?'TOTAL GERAL':'TOTAL '+(company==='RL'?'RL':'SOLUTIO'),M.money(s.total))
      +companyTotals;
    const body=$('adminRows'),billing=rows.filter(active);
    body.innerHTML=billing.length?billing.map(o=>'<tr><td><b>'+esc(o.employee_name)+'</b><br><small>'+(o.company==='SOLUTIO'?'Solutio':'RL Construções')+'</small></td><td>'+
      mealTitle(o.meal)+'</td><td>'+esc(o.dish)+(o.accompaniments?.length?'<br><small>'+esc(o.accompaniments.join(', '))+'</small>':'')+
      '</td><td>'+statusBadge(o)+'</td><td>'+M.money(o.price)+'</td><td>'+
      '<button class="danger compact" data-act="admincancel" data-id="'+esc(o.id)+'">Cancelar</button>'+
      '<button class="secondary compact" data-act="archive" data-id="'+esc(o.id)+'">Arquivar</button></td></tr>').join('')
      :'<tr><td colspan="6">Sem pedidos ativos para esta empresa.</td></tr>';
    bindActions(body);
    const audit=rows.filter(o=>!active(o)),el=$('adminAudit');
    el.innerHTML=audit.length?audit.map(o=>orderCard(o,'audit')+
      '<div class="actions"><button class="secondary compact" data-act="restore" data-id="'+esc(o.id)+'" '+(!o.archived?'disabled':'')+'>Restaurar arquivado</button></div>').join('')
      :'<div class="empty">Nenhum cancelamento ou arquivamento no dia.</div>';
    bindActions(el);
  }
  function downloadCsv(){
    const info=filteredAdmin(), {day,rows,company}=info, s=adminSummary(info);
    const header=['Data','Empresa','Colaborador','Refeição','Prato','Acompanhamentos','Observações','Status','Arquivado','Valor'];
    const lines=[header,...rows.map(o=>[o.order_day,o.company==='SOLUTIO'?'Solutio':'RL Construções',
      o.employee_name,mealTitle(o.meal),o.dish,(o.accompaniments||[]).join(' / '),o.notes||'',
      statusLabels[o.status]||o.status,o.archived?'Sim':'Não',Number(o.price).toFixed(2).replace('.',',')])];
    for(const [label,value] of [['Subtotal',s.subtotal],['Frete proporcional',s.delivery],['TOTAL',s.total]]){
      const row=Array(10).fill('');row[0]=label;row[9]=Number(value).toFixed(2).replace('.',',');lines.push(row);
    }
    const csv='\ufeff'+lines.map(row=>row.map(cell=>'"'+String(cell??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;
    a.download='RL_pedidos_'+(company==='todos'?'geral':company)+'_'+day+'.csv';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function sendSummary(){
    const phone=$('whatsPhone').value.replace(/\D/g,'');
    if(phone.length<12||phone.length>15)return inform('Informe o número completo do WhatsApp com 55 + DDD + número.',true);
    localStorage.setItem('rl-whats-dest',phone);
    const info=filteredAdmin(),{day,company}=info,s=adminSummary(info);
    const entries=s.active.map(o=>'• '+o.employee_name+' — '+mealTitle(o.meal)+': '+o.dish+' ('+M.money(o.price)+')');
    const companyLabel=company==='todos'?'RL + Solutio':company==='RL'?'RL Construções':'Solutio';
    const msg='*PEDIDOS RL | '+companyLabel.toUpperCase()+'*\nData: '+day.split('-').reverse().join('/')+
      '\n\n'+entries.join('\n')+'\n\nCafés: '+s.coffee+' | Almoços: '+s.lunch+
      '\nRefeições: '+M.money(s.subtotal)+'\nFrete proporcional: '+M.money(s.delivery)+
      '\n*TOTAL: '+M.money(s.total)+'*\n\nEntrega cobrada uma vez por evento, rateada por quantidade de pedidos.';
    window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
  }

  // Gestão de identidades: API Edge Function com JWT e checagem de administrador.
  async function userApi(action, params={}) {
    if(!configured || !isManager())throw Error('Acesso restrito ao administrador RL.');
    const {data,error}=await client.functions.invoke('manage-users',{body:{action,...params}});
    if(error) {
      let message=data?.error || error.message || 'Não foi possível acessar o servidor.';
      try {
        const context=error.context;
        if(context && typeof context.clone==='function'){
          const details=await context.clone().json();
          if(details?.error)message=details.error;
        }
      } catch {}
      throw Error(message);
    }
    if(data?.error)throw Error(data.error);
    return data;
  }
  async function loadUsers() {
    if(!isManager())return;
    try{
      const [result, invitationResult]=await Promise.all([userApi('list'),userApi('list_invites')]);
      state.users=result.accounts||[];
      state.invitations=invitationResult.invitations||[];
      renderUsers();
      renderInvitations();
    }catch(error){$('usersFeedback').textContent='Não foi possível carregar usuários: '+error.message; $('usersFeedback').classList.add('error');}
  }
  function renderUsers(){
    if(!isManager())return;
    $('usersCount').textContent=String(state.users.length);
    const el=$('usersList');
    el.innerHTML=state.users.length?state.users.map(u=>{
      const mine=u.id===ownId(), protectedAccount=mine||!u.username;
      const role=u.role==='admin'?'Administrador':u.role==='restaurante'?'Restaurante':'Colaborador';
      const controls=protectedAccount?'':`<div class="user-actions">
        <select data-role-for="${esc(u.id)}" aria-label="Perfil de ${esc(u.display_name)}">
          <option value="colaborador" ${u.role==='colaborador'?'selected':''}>Colaborador</option>
          <option value="restaurante" ${u.role==='restaurante'?'selected':''} ${u.role==='admin'?'disabled':''}>Restaurante</option>
          <option value="admin" ${u.role==='admin'?'selected':''} ${!u.active && u.role!=='admin'?'disabled':''}>Administrador (ADM)</option>
        </select>
        <button class="secondary compact" data-user-action="set_role" data-id="${esc(u.id)}">Salvar perfil</button>
        ${u.role==='admin'?'':`<select data-company-for="${esc(u.id)}" aria-label="Empresa de ${esc(u.display_name)}">
          <option value="RL" ${u.company!=='SOLUTIO'?'selected':''}>RL Construções</option>
          <option value="SOLUTIO" ${u.company==='SOLUTIO'?'selected':''}>Solutio</option>
        </select>
        <button class="secondary compact" data-user-action="set_company" data-id="${esc(u.id)}">Salvar empresa</button>
        <button class="secondary compact" data-user-action="reset_password" data-id="${esc(u.id)}">Redefinir senha</button>
        <button class="${u.active?'danger':'primary'} compact" data-user-action="set_active" data-id="${esc(u.id)}">${u.active?'Desativar':'Reativar'}</button>
        <button class="danger compact" data-user-action="delete_user" data-id="${esc(u.id)}" title="Exclusão definitiva somente para usuários sem pedidos">Excluir usuário</button>`}
      </div>`;
      return `<article class="entry user-account">
        <div class="entry-top"><div><strong>${esc(u.display_name)}</strong>
        <br><small>Usuário: ${esc(u.username||'e-mail do primeiro ADM')} • ${esc(role)} • ${u.company==='SOLUTIO'?'Solutio':'RL Construções'} • ${esc(u.job_title||'')}</small></div>
        <span class="status ${u.active?'entregue':'cancelado'}">${u.active?'Ativo':'Inativo'}</span></div>
        ${controls}
      </article>`;
    }).join(''):'<div class="empty">Nenhum usuário encontrado.</div>';
    el.querySelectorAll('[data-user-action]').forEach(b=>b.addEventListener('click',async()=>{
      const id=b.dataset.id, u=state.users.find(x=>x.id===id);
      const action=b.dataset.userAction;
      if(!u || u.id===ownId() || !u.username || (u.role==='admin' && action!=='set_role'))return;
      let params={id};
      if(action==='set_role'){
        const nextRole=el.querySelector('[data-role-for="'+id+'"]').value;
        if(nextRole===u.role)return inform('O perfil de '+u.display_name+' já está selecionado.');
        if(nextRole==='admin' && !confirm('Conceder acesso de ADMINISTRADOR a '+u.display_name+'? Este usuário poderá consultar pedidos, relatórios e gerenciar outros cadastros.'))return;
        if(u.role==='admin' && !confirm('Retirar o acesso de administrador de '+u.display_name+' e voltar para colaborador?'))return;
        params.role=nextRole;
      }
      if(action==='set_company')params.company=el.querySelector('[data-company-for="'+id+'"]').value;
      if(action==='set_active'){
        if(!confirm((u.active?'Desativar':'Reativar')+' acesso de '+u.display_name+'?'))return;
        params.active=!u.active;
      }
      if(action==='delete_user'){
        if(!confirm('Excluir definitivamente o usuário "'+u.display_name+'"? Esta ação não pode ser desfeita. Usuários com pedidos registrados não podem ser excluídos; devem ser desativados.'))return;
        const confirmation=prompt('Para confirmar a exclusão de '+u.display_name+', digite EXCLUIR:');
        if(confirmation!=='EXCLUIR')return;
      }
      if(action==='reset_password'){
        if(confirm('Gerar automaticamente uma senha forte para '+u.display_name+'?\nOK = gerar automaticamente; Cancelar = informar uma senha manual.')){
          params.password='AUTO';
        }else{
          const password=prompt('Digite a NOVA senha (8 a 72 caracteres):');
          if(password===null)return;
          if(password.length<8 || password.length>72)return inform('Senha precisa ter entre 8 e 72 caracteres.',true);
          params.password=password;
        }
      }
      b.disabled=true;
      try{
        const result=await userApi(action,params);
        inform(result.message||'Alteração concluída.');
        if(action==='reset_password')showOneTime(u.username,result.password||(params.password==='AUTO'?'':params.password),'Senha redefinida para '+u.display_name);
        await loadUsers();
      }catch(error){fail(error);}finally{b.disabled=false;}
    }));
  }
  function displayNewInvite(result){
    generatedInvite={link:result.link,name:result.display_name,username:result.username,role:result.role};
    $('generatedInviteLink').value=result.link;
    $('generatedInviteInfo').textContent=result.display_name+' • '+result.username+
      ' • '+(result.role==='restaurante'?'Restaurante':'Colaborador')+
      '. Válido até '+new Date(result.expires_at).toLocaleDateString('pt-BR',{timeZone:'America/Recife'})+'.';
    $('generatedInviteBox').hidden=false;
    $('usersFeedback').classList.remove('error');
    $('usersFeedback').textContent='Convite pronto. Copie ou envie individualmente pelo WhatsApp.';
    $('generatedInviteBox').scrollIntoView({behavior:'smooth',block:'center'});
  }
  async function renewInvitation(invitation,button){
    if(!isManager()||invitation.redeemed_at)return;
    if(!confirm('Gerar link individual para '+invitation.display_name+
      '? O link anterior desta pessoa deixará de funcionar. Continuar?'))return;
    button.disabled=true;
    clearGeneratedInvite();
    try{
      const result=await userApi('renew_invite',{username:invitation.username});
      displayNewInvite(result);
      await loadUsers();
      inform('Link individual gerado para '+invitation.display_name+'. Copie ou envie pelo WhatsApp.');
    }catch(error){fail(error);}
    finally{button.disabled=false;}
  }
  function renderInvitations(){
    if(!isManager())return;
    const invitations=state.invitations||[];
    $('invitesCount').textContent=String(invitations.length);
    const list=$('invitesList');
    list.innerHTML=invitations.length?invitations.map(i=>{
      const used=Boolean(i.redeemed_at);
      const expired=!used && Date.parse(i.expires_at)<=Date.now();
      const status=used?'Ativado':expired?'Expirado':'Aguardando ativação';
      return '<article class="entry user-account"><div class="entry-top"><div><strong>'+
        esc(i.display_name)+'</strong><br><small>'+esc(i.username)+' • '+
        (i.company==='SOLUTIO'?'Solutio':'RL Construções')+' • '+esc(i.job_title||'')+
        '</small></div><span class="status '+(used?'entregue':expired?'cancelado':'confirmado')+'">'+status+'</span></div>'+
        (!used?'<div class="actions"><button type="button" class="secondary compact" data-invite-username="'+esc(i.username)+'">'+
          '🔗 Gerar link para WhatsApp</button><small class="muted">'+
          (expired?'Convite expirado: gere outro.':'Será gerado um novo link de uso único.')+
          '</small></div>':'<p class="small muted">Acesso ativado. Para senha, use o cadastro do usuário.</p>')+
        '</article>';
    }).join(''):'<div class="empty">Nenhum convite preparado.</div>';
    list.querySelectorAll('[data-invite-username]').forEach(button=>{
      button.addEventListener('click',()=>{
        const item=state.invitations.find(i=>i.username===button.dataset.inviteUsername);
        if(item)renewInvitation(item,button);
      });
    });
  }
  // Converte um nome de exibição em login fácil, ex.: João Campos → joao.campos.
  function normalizeLogin(input){
    const value=String(input||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'')
      .replace(/\.{2,}/g,'.');
    return value.slice(0,30).replace(/\.+$/g,'');
  }
  let loginEdited=false;
  function setTestTemplate(type) {
    const restaurant=type==='restaurante';
    $('newFullName').value=restaurant?'Restaurante Teste':'Usuário Teste';
    $('newUsername').value=restaurant?'restaurante.teste':'usuario.teste';
    $('newRole').value=restaurant?'restaurante':'colaborador';
    $('newPassword').value='';
    $('usersFeedback').textContent='Exemplo preenchido. Crie uma senha individual com 8 caracteres ou mais e clique em Cadastrar na nuvem.';
    $('usersFeedback').classList.remove('error');
    loginEdited=false;
    $('newPassword').focus();
  }
  $('newFullName').addEventListener('input',()=>{
    if(!loginEdited)$('newUsername').value=normalizeLogin($('newFullName').value);
  });
  $('newUsername').addEventListener('input',()=>{
    loginEdited=true;
    $('usernameHelp').textContent='O login será salvo como: '+(normalizeLogin($('newUsername').value)||'informe pelo menos 3 letras');
  });
  $('fillUserTest').addEventListener('click',()=>setTestTemplate('colaborador'));
  $('fillRestaurantTest').addEventListener('click',()=>setTestTemplate('restaurante'));

  async function createUser(){
    if(!isManager())return;
    const display_name=$('newFullName').value.trim();
    const username=normalizeLogin($('newUsername').value||$('newFullName').value);
    $('newUsername').value=username;
    let password=$('newPassword').value;
    if(!password){
      try {password=makePassword();$('newPassword').value=password;}
      catch(e){return fail(e);}
    }
    const role=$('newRole').value;
    const company=$('newCompany').value, job_title=$('newJobTitle').value.trim();
    if(display_name.length<3)return inform('Informe o nome completo.',true);
    if(!/^[a-z][a-z0-9._-]{2,29}$/.test(username)) {
      $('usersFeedback').textContent='Digite um nome de pelo menos 3 letras. Exemplos: usuario.teste ou restaurante.teste.';
      $('usersFeedback').classList.add('error');
      return;
    }
    if(password.length<8)return inform('Use senha provisória com pelo menos 8 caracteres.',true);
    const btn=$('createUserBtn');btn.disabled=true;
    try{
      const result=await userApi('create',{display_name,username,password,role,company,job_title});
      $('newFullName').value='';$('newUsername').value='';$('newPassword').value='';$('newJobTitle').value='';loginEdited=false;
      $('usersFeedback').classList.remove('error');
      $('usersFeedback').textContent='Conta de '+display_name+' cadastrada. Copie as credenciais abaixo e entregue-as por mensagem privada.';
      showOneTime(username,result.password||password,'Conta criada: '+display_name);
      inform(result.message||'Conta cadastrada na nuvem.');
      await loadUsers();
    }catch(error){
      $('usersFeedback').textContent=error.message;
      $('usersFeedback').classList.add('error');
    }finally{btn.disabled=false;}
  }

  let generatedInvite=null;
  function clearGeneratedInvite(){
    generatedInvite=null;
    $('generatedInviteLink').value='';
    $('generatedInviteInfo').textContent='';
    $('generatedInviteBox').hidden=true;
  }
  async function createInvite(){
    if(!isManager())return;
    const display_name=$('newFullName').value.trim();
    const username=normalizeLogin($('newUsername').value||display_name);
    const role=$('newRole').value;
    const company=$('newCompany').value,job_title=$('newJobTitle').value.trim();
    $('newUsername').value=username;
    if(display_name.length<3 || !/^[a-z][a-z0-9._-]{2,29}$/.test(username))
      return inform('Informe o nome e o login válido para gerar o convite.',true);
    clearGeneratedInvite();
    const button=$('createInviteBtn');button.disabled=true;
    try{
      const result=await userApi('create_invite',{display_name,username,role,company,job_title});
      displayNewInvite(result);
      await loadUsers();
    }catch(error){
      $('usersFeedback').textContent=error.message;
      $('usersFeedback').classList.add('error');
      fail(error);
    }finally{button.disabled=false;}
  }
  $('createInviteBtn').addEventListener('click',createInvite);
  $('copyInviteLink').addEventListener('click',async()=>{
    if(!generatedInvite)return;
    try{await navigator.clipboard.writeText(generatedInvite.link);inform('Link privado copiado. Envie somente ao colaborador ou restaurante.');}
    catch{ $('generatedInviteLink').select();inform('Selecione o link e copie manualmente.',true); }
  });
  $('shareInviteWhatsApp').addEventListener('click',()=>{
    if(!generatedInvite)return;
    const person=generatedInvite.role==='restaurante'?'equipe do restaurante':generatedInvite.name;
    const text='*RL CONSTRUÇÕES | PRIMEIRO ACESSO*\n\nOlá, '+person+
      '! Este é seu convite individual para o aplicativo de refeições da obra AMBEV Itapissuma.'+
      '\n\n*Login:* '+generatedInvite.username+
      '\n*Ative seu acesso e crie sua senha pelo link:*\n'+generatedInvite.link+
      '\n\nO convite é individual, funciona uma vez e expira em 7 dias. Não encaminhe.';
    window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');
  });
  $('hideGeneratedInvite').addEventListener('click',clearGeneratedInvite);

  // Senhas: geração criptográfica, nunca armazenamento persistente ou leitura de hashes.
  const passwordAlphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  function makePassword() {
    if(!window.crypto?.getRandomValues)throw Error('Navegador sem gerador de senha criptográfico.');
    const chars=new Uint32Array(16);window.crypto.getRandomValues(chars);
    const out=Array.from(chars,n=>passwordAlphabet[n%passwordAlphabet.length]);
    // Garantir diversidade para a senha provisória.
    out[0]='ABCDEFGHJKLMNPQRSTUVWXYZ'[chars[0]%24];
    out[1]='abcdefghijkmnopqrstuvwxyz'[chars[1]%25];
    out[2]='23456789'[chars[2]%8];
    out[3]='!@#$%&*'[chars[3]%7];
    return out.join('');
  }
  let oneTimeValue='';
  function showOneTime(username,password,title) {
    if(!password)return;
    oneTimeValue='Usuário: '+username+'\nSenha provisória: '+password;
    $('oneTimeTitle').textContent=title;
    $('oneTimeCredentials').textContent=oneTimeValue;
    $('oneTimePassword').hidden=false;
    $('oneTimePassword').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function hideOneTime() {
    oneTimeValue='';
    $('oneTimeCredentials').textContent='';
    $('oneTimePassword').hidden=true;
  }
  $('generatePassword').addEventListener('click',()=>{
    try {$('newPassword').value=makePassword();$('newPassword').type='text';}
    catch(e){fail(e);}
  });
  $('toggleNewPassword').addEventListener('click',()=>{
    $('newPassword').type=$('newPassword').type==='password'?'text':'password';
  });
  $('copyCredentials').addEventListener('click',async()=>{
    if(!oneTimeValue)return;
    try {
      await navigator.clipboard.writeText(oneTimeValue);
      inform('Credenciais copiadas. Compartilhe por canal privado.');
    }catch{inform('Não foi possível copiar automaticamente. Selecione as credenciais exibidas.',true);}
  });
  $('closeCredentials').addEventListener('click',hideOneTime);

  // Chat privado: um canal por colaborador e outro reservado à gestão/restaurante.
  let chatLoading=false;
  async function initChat(){
    if(!configured || !state.user || chatLoading)return;
    chatLoading=true;
    const selection=$('chatThread');
    try{
      if(state.role==='colaborador'){
        selection.innerHTML='<option value="'+esc(ownId())+'">Minha conversa com o restaurante</option>';
        selection.value=ownId();selection.disabled=true;
      }else{
        selection.disabled=false;
        const {data,error}=await client.from('profiles')
          .select('id,display_name,role,active').eq('role','colaborador').order('display_name',{ascending:true}).limit(500);
        if(error)throw error;
        state.chatPeople=data||[];
        const before=selection.value;
        selection.innerHTML='<option value="management">Conversa RL ↔ Restaurante</option>'
          +state.chatPeople.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.display_name)+(p.active?'':' (inativo)')+'</option>').join('');
        selection.value=[...selection.options].some(o=>o.value===before)?before:'management';
      }
      await loadChat();
    }catch(e){$('chatStatus').textContent='Falha ao carregar as conversas: '+e.message;}
    finally{chatLoading=false;}
  }
  async function loadChat(){
    if(!configured || !state.user)return;
    const target=state.role==='colaborador'?ownId():$('chatThread').value;
    if(!target)return;
    state.chatOwner=target==='management'?null:target;
    try{
      const query=client.from('chat_messages').select('id,thread_owner,sender_id,sender_name,body,created_at')
        .order('created_at',{ascending:false}).limit(200);
      const {data,error}=await (state.chatOwner===null ? query.is('thread_owner',null) : query.eq('thread_owner',state.chatOwner));
      if(error)throw error;
      state.chatRows=(data||[]).reverse();
      const el=$('chatMessages');
      el.innerHTML=state.chatRows.length?state.chatRows.map(m=>{
        const own=m.sender_id===ownId();
        const dt=new Date(m.created_at).toLocaleString('pt-BR',{timeZone:'America/Recife',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
        return '<article class="chat-bubble '+(own?'chat-own':'')+'"><div class="chat-meta">'+esc(m.sender_name)+(own?' (você)':'')+' · '+esc(dt)+'</div><p>'+esc(m.body)+'</p></article>';
      }).join(''):'<p class="empty">Nenhuma mensagem ainda. Envie a primeira mensagem para o restaurante.</p>';
      el.scrollTop=el.scrollHeight;
      $('chatStatus').textContent='Conversa atualizada.';
    }catch(e){$('chatStatus').textContent='Não foi possível atualizar mensagens: '+e.message;}
  }
  async function sendChat(){
    if(!configured || !state.user)return;
    const body=$('chatInput').value.trim();
    if(!body)return;
    if(body.length>1000)return inform('A mensagem deve ter até 1000 caracteres.',true);
    const thread_owner=state.role==='colaborador'?ownId():($('chatThread').value==='management'?null:$('chatThread').value);
    if(state.role!=='colaborador' && !thread_owner && $('chatThread').value!=='management')
      return inform('Selecione uma conversa.',true);
    const button=$('chatSend');button.disabled=true;
    try{
      const {error}=await client.from('chat_messages').insert({thread_owner,sender_id:ownId(),body});
      if(error)throw error;
      $('chatInput').value='';await loadChat();
      $('chatStatus').textContent='Mensagem enviada.';
    }catch(e){$('chatStatus').textContent='Mensagem não enviada: '+e.message;}
    finally{button.disabled=false;}
  }
  $('chatRefresh').addEventListener('click',initChat);
  $('chatThread').addEventListener('change',loadChat);
  $('chatSend').addEventListener('click',sendChat);

  // Exclusão de dados de TESTE exige duplo consentimento e é atômica no Postgres.
  async function previewReset(){
    const result=await userApi('reset_preview');
    const n=result.counts||{};
    $('resetPreview').textContent='Dados operacionais: '+(n.orders||0)+' pedidos, '+(n.order_audit||0)+
      ' registros de histórico de pedidos e '+(n.chat_messages||0)+' mensagens. Os cadastros permanecerão.';
    return n;
  }
  async function resetTestData(){
    if(!isManager())return;
    try{
      const n=await previewReset();
      const count=(n.orders||0)+(n.chat_messages||0)+(n.order_audit||0);
      if(!count)return inform('Não há pedidos nem mensagens de teste para zerar.');
      if(!confirm('ATENÇÃO: esta operação apaga permanentemente '+count+' registros operacionais, inclusive pedidos entregues. Os usuários permanecerão. Continuar?'))return;
      const phrase=prompt('Para confirmar a exclusão DEFINITIVA dos dados de teste, digite exatamente ZERAR TESTES:');
      if(phrase!=='ZERAR TESTES')return inform('Limpeza cancelada. Nenhum dado foi excluído.',true);
      const result=await userApi('reset_test_data',{confirm:phrase});
      refreshAfterReset();
      await reload();
      const remaining=await previewReset();
      if((remaining.orders||0)+(remaining.chat_messages||0)+(remaining.order_audit||0)>0)
        throw Error('A conferência encontrou registros remanescentes; tente atualizar a página e procure a gestão técnica.');
      inform('Limpeza confirmada no Supabase: 0 pedidos, 0 mensagens e 0 alterações de pedidos. Todos os aparelhos serão atualizados.');
      if(state.tab==='chat')await initChat();
    }catch(e){fail(e);}
  }
  $('resetPreviewBtn').addEventListener('click',()=>previewReset().catch(fail));
  $('resetDataBtn').addEventListener('click',resetTestData);

  async function changeMyPassword(){
    if(!configured||!state.user)return;
    const current=$('currentPassword').value;
    const next=$('ownNewPassword').value;
    if(next.length<8||next.length>72)return inform('Nova senha deve ter 8 a 72 caracteres.',true);
    if(next!==$('confirmOwnPassword').value)return inform('A confirmação da nova senha não confere.',true);
    const button=$('changeOwnPassword');button.disabled=true;
    try{
      const {error:loginError}=await client.auth.signInWithPassword({email:state.user.email,password:current});
      if(loginError)throw Error('Senha atual incorreta.');
      const {error}=await client.auth.updateUser({password:next});
      if(error)throw error;
      $('currentPassword').value='';$('ownNewPassword').value='';$('confirmOwnPassword').value='';
      inform('Sua senha foi atualizada com sucesso.');
    }catch(e){fail(e);}finally{button.disabled=false;}
  }
  $('changeOwnPassword').addEventListener('click',changeMyPassword);

  // Imprimir ou salvar PDF: consulta todos os pedidos do DIA, não apenas o histórico carregado.
  async function reportAction(kind,format){
    const canRead=kind==='admin'?isManager():(isManager()||isRestaurant());
    if(!canRead)return inform('Sem permissão para emitir este relatório.',true);
    const day=(kind==='admin'?$('adminDate'):$('restaurantDate')).value;
    const filter=(kind==='admin'?$('adminMeal'):$('restaurantMeal')).value;
    if(!day)return inform('Selecione o dia do relatório.',true);
    let popup=null;
    if(format==='print'){
      popup=window.open('','_blank');
      if(!popup)return inform('Permita pop-ups para impressão.',true);
      popup.document.body.textContent='Preparando relatório de impressão...';
    }
    try{
      let orders=state.orders.filter(o=>o.order_day===day);
      if(configured){
        const {data,error}=await client.from('orders').select('*').eq('order_day',day)
          .order('created_at',{ascending:true}).limit(1000);
        if(error)throw error;
        if(data.length>=1000)throw Error('O período ultrapassa 999 pedidos. Solicite a exportação completa para evitar valores incompletos.');
        orders=data;
      }
      const payload={date:day,meal:filter,company:kind==='admin'?$('adminCompany').value:'todos',kind:kind==='admin'?'admin':'restaurante',orders};
      if(format==='print')window.RL_REPORTS.print(payload,popup);
      else await window.RL_REPORTS.download(payload);
    }catch(error){
      if(popup&&!popup.closed)popup.close();
      fail(error);
    }
  }

  document.addEventListener('click', e => {
    const b=e.target.closest('[data-tab]'); if(b) chooseTab(b.dataset.tab);
    const d=e.target.closest('[data-demo-role]');
    if(d && !configured){state.role=d.dataset.demoRole;state.profile={display_name:state.role==='colaborador'?state.demoName:state.role==='admin'?'Gestão RL (prévia)':'Restaurante (prévia)',role:state.role};state.tab=state.role==='colaborador'?'order':state.role==='admin'?'admin':'restaurant';renderAll();}
  });
  document.querySelectorAll('input[name="meal"]').forEach(input => input.addEventListener('change',()=>{state.dish='';state.sides=[];renderMenu();}));
  $('orderDay').addEventListener('change',()=>{state.dish='';state.sides=[];renderMenu();});
  $('demoName').addEventListener('input',e=>{state.demoName=e.target.value.trim()||'Colaborador de teste';if(state.role==='colaborador'){state.profile.display_name=state.demoName;renderTabs();}});
  $('placeBtn').addEventListener('click',saveOrder);
  $('clearEditBtn').addEventListener('click',clearEdit);
  $('loginBtn').addEventListener('click',authAction);
  $('logoutBtn').addEventListener('click',()=>client?.auth.signOut());
  $('mineRefresh').addEventListener('click',reload);
  $('restaurantRefresh').addEventListener('click',reload);
  $('adminRefresh').addEventListener('click',reload);
  $('usersRefresh').addEventListener('click',loadUsers);
  $('createUserBtn').addEventListener('click',createUser);
  $('pdfBtn').addEventListener('click',()=>reportAction('admin','pdf'));
  $('printBtn').addEventListener('click',()=>reportAction('admin','print'));
  $('restaurantPdfBtn').addEventListener('click',()=>reportAction('restaurante','pdf'));
  $('restaurantPrintBtn').addEventListener('click',()=>reportAction('restaurante','print'));
  ['restaurantDate','restaurantMeal'].forEach(id => $(id).addEventListener('change',renderRestaurant));
  ['adminDate','adminMeal','adminCompany'].forEach(id => $(id).addEventListener('change',renderAdmin));
  $('csvBtn').addEventListener('click',downloadCsv);
  $('whatsBtn').addEventListener('click',sendSummary);
  try { $('whatsPhone').value=localStorage.getItem('rl-whats-dest')||''; }
  catch { $('whatsPhone').value=''; }
  begin();
})();