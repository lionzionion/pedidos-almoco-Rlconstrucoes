/* AMBEV Pedidos RL — interface. A autorização real é aplicada pelo Supabase RLS. */
(() => {
  'use strict';
  const M = window.RL_MENU;
  const C = window.RL_CONFIG || {};
  const configured = !!(C.supabaseUrl && C.supabaseAnonKey && window.supabase);
  const client = configured ? window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey) : null;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localKey = 'rl-demo-pedidos-v1';
  const today = M.today();
  const state = {role: 'colaborador', user: null, profile: null, orders: [], dish:'', sides:[], editing:null, tab:'order', demoName:'Colaborador de teste'};
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
  function initializeDay() {
    $('todayLabel').textContent = M.days[M.weekday(today)] + ', ' + today.split('-').reverse().join('/');
    $('restaurantDate').value=today; $('adminDate').value=today;
  }
  function begin() {
    initializeDay();
    if(!configured) {
      $('demo').hidden=false; $('login').hidden=true; $('app').hidden=false;
      state.orders=readDemo(); state.profile={display_name:state.demoName,role:'colaborador'};
      inform('MODO DEMONSTRAÇÃO: os pedidos são salvos somente neste navegador. Configure Supabase antes de usar na obra.',true);
      renderAll();
      return;
    }
    $('demo').hidden=true;
    client.auth.getUser().then(({data,error})=>error ? fail(error) : setUser(data.user)).catch(fail);
    client.auth.onAuthStateChange((_event,session) => { setTimeout(()=>setUser(session?.user || null),0); });
    client.channel('rl-order-updates').on('postgres_changes', {event:'*',schema:'public',table:'orders'}, () => reload()).subscribe();
    setInterval(() => { if (state.user) reload(); }, 45000);
  }
  async function setUser(user) {
    state.user=user;
    if(!user) {
      state.profile=null; $('login').hidden=false; $('app').hidden=true; $('who').textContent='';
      return;
    }
    try {
      const {data,error}=await client.from('profiles').select('id,display_name,role').eq('id',user.id).single();
      if(error) throw error;
      state.profile=data; state.role=data.role;
      $('login').hidden=true; $('app').hidden=false;
      await reload();
    } catch(error) { fail(error); }
  }
  async function authAction(signup) {
    const email=$('loginEmail').value.trim(), password=$('loginPassword').value, fullName=$('loginName').value.trim();
    if(!email || password.length<6) return inform('Informe e-mail e senha com pelo menos 6 caracteres.',true);
    if(signup && fullName.length<3) return inform('Informe seu nome completo para criar o cadastro.',true);
    const {data,error} = signup
      ? await client.auth.signUp({email,password,options:{data:{full_name:fullName}}})
      : await client.auth.signInWithPassword({email,password});
    if(error) return fail(error);
    if(signup && !data.session) inform('Cadastro criado. Confirme o e-mail recebido antes de entrar.');
    else if(data.user) await setUser(data.user);
  }
  function chooseTab(tab) {
    if(tab === 'order' && !isStaff()) return;
    if(tab === 'mine' && !isStaff()) return;
    if(tab === 'restaurant' && !isRestaurant() && !isManager()) return;
    if(tab === 'admin' && !isManager()) return;
    state.tab=tab;
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active',b.dataset.tab===tab));
    document.querySelectorAll('.pane').forEach(p => p.hidden=(p.id!==tab));
  }
  function renderTabs() {
    document.querySelectorAll('[data-tab]').forEach(b => {
      const t=b.dataset.tab;
      b.hidden=(['order','mine'].includes(t) && !isStaff()) || (t==='restaurant' && !isManager() && !isRestaurant()) || (t==='admin' && !isManager());
    });
    $('logoutBtn').hidden=!configured;
    $('who').textContent = name() + ' • ' + ({admin:'Gestão RL',restaurante:'Restaurante',colaborador:'Colaborador'}[state.role]||'');
    if((['order','mine'].includes(state.tab) && !isStaff()) || (state.tab==='admin' && !isManager()) || (state.tab==='restaurant' && !isRestaurant() && !isManager())) {
      state.tab=isRestaurant() ? 'restaurant' : isManager() ? 'admin' : 'order';
    }
    chooseTab(state.tab);
  }
  function renderMenu() {
    const type=meal(), available=M.items(type,today);
    if(!available.includes(state.dish)) state.dish=available[0];
    $('menuDay').textContent=M.days[M.weekday(today)] + ' — ' + today.split('-').reverse().join('/');
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
    const type=meal(); $('unitPrice').textContent=M.money(M.unitPrice(type,state.dish));
    $('feePreview').textContent=M.money(M.fee(type,today));
  }
  function clearEdit() {
    state.editing=null; state.dish=''; state.sides=[]; $('notes').value='';
    $('placeBtn').textContent='Confirmar pedido'; $('clearEditBtn').hidden=true;
    renderMenu();
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
  function renderAll() { renderTabs(); renderMenu(); renderMine(); renderRestaurant(); renderAdmin(); }
  async function saveOrder() {
    if(!isStaff()) return;
    const type=meal(), dish=state.dish, sides=type==='almoco'?[...state.sides]:[], notes=$('notes').value.trim();
    if(!M.items(type,today).includes(dish)) return inform('Escolha uma opção válida do cardápio de hoje.',true);
    const feedback=$('orderFeedback');
    $('placeBtn').disabled=true;
    try {
      if(configured) {
        let response;
        if(state.editing) response = await client.from('orders').update({meal:type,dish,accompaniments:sides,notes}).eq('id',state.editing).select().single();
        else response = await client.from('orders').insert({owner:ownId(),meal:type,dish,accompaniments:sides,notes}).select().single();
        if(response.error) throw response.error;
      } else {
        if(state.editing){
          const o=state.orders.find(o=>o.id===state.editing);
          if(!o || o.status!=='confirmado') throw Error('Este pedido não pode mais ser editado.');
          Object.assign(o,{meal:type,dish,accompaniments:sides,notes,price:M.unitPrice(type,dish),updated_at:new Date().toISOString()});
        } else {
          const duplicate=state.orders.some(o=>o.owner===ownId() && o.order_day===today && o.meal===type && active(o));
          if(duplicate) throw Error('Você já tem um pedido ativo deste período. Edite ou cancele o anterior.');
          state.orders.unshift({id:crypto.randomUUID(),owner:ownId(),employee_name:name(),order_day:today,meal:type,dish,accompaniments:sides,notes,price:M.unitPrice(type,dish),status:'confirmado',archived:false,created_at:new Date().toISOString()});
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
      buttons='<button class="secondary compact" data-act="edit" data-id="'+esc(o.id)+'">Editar</button><button class="danger compact" data-act="cancel" data-id="'+esc(o.id)+'">Cancelar pedido</button>';
    if(controls==='restaurant' && !o.archived && o.status==='confirmado')
      buttons='<button class="secondary compact" data-act="prepare" data-id="'+esc(o.id)+'">Iniciar preparo</button>';
    if(controls==='restaurant' && !o.archived && o.status==='preparo')
      buttons='<button class="primary compact" data-act="deliver" data-id="'+esc(o.id)+'">Marcar entregue</button>';
    const sides=(o.accompaniments||[]).join(', ');
    return '<article class="entry"><div class="entry-top"><div><strong>'+esc(o.employee_name)+'</strong><br><small>'+esc(o.order_day.split('-').reverse().join('/'))+' • '+mealTitle(o.meal)+'</small></div>'+statusBadge(o)+'</div><p><b>'+esc(o.dish)+'</b> — '+M.money(o.price)+'</p>'+(sides?'<p class="small">Acompanhamentos: '+esc(sides)+'</p>':'')+(o.notes?'<p class="small">Observações: '+esc(o.notes)+'</p>':'')+(o.cancel_reason?'<p class="small">Motivo: '+esc(o.cancel_reason)+'</p>':'')+(buttons?'<div class="actions">'+buttons+'</div>':'')+'</article>';
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
    const rows=state.orders.filter(o=>o.order_day===day && !o.archived && (type==='todos'||o.meal===type));
    const s=M.summary(rows,day);
    $('restaurantStats').innerHTML=metric('Cafés ativos',s.coffee)+metric('Almoços ativos',s.lunch)+metric('Total da remessa',M.money(s.total));
    const el=$('restaurantList'); el.innerHTML=rows.length?rows.map(o=>orderCard(o,'restaurant')).join(''):'<div class="empty">Nenhum pedido para esta data e refeição.</div>';
    bindActions(el);
  }
  function filteredAdmin() {
    const day=$('adminDate').value||today,type=$('adminMeal').value;
    return {day,rows:state.orders.filter(o=>o.order_day===day && (type==='todos'||o.meal===type))};
  }
  function renderAdmin(){
    const {day,rows}=filteredAdmin(), s=M.summary(rows,day);
    $('adminStats').innerHTML=metric('Cafés',s.coffee)+metric('Almoços',s.lunch)+metric('Refeições',M.money(s.subtotal))+metric('Entregas',M.money(s.delivery))+metric('TOTAL A CONFERIR',M.money(s.total));
    const body=$('adminRows'); const billing=rows.filter(active);
    body.innerHTML=billing.length?billing.map(o => '<tr><td><b>'+esc(o.employee_name)+'</b></td><td>'+mealTitle(o.meal)+'</td><td>'+esc(o.dish)+(o.accompaniments?.length?'<br><small>'+esc(o.accompaniments.join(', '))+'</small>':'')+'</td><td>'+statusBadge(o)+'</td><td>'+M.money(o.price)+'</td><td><button class="danger compact" data-act="admincancel" data-id="'+esc(o.id)+'">Cancelar</button><button class="secondary compact" data-act="archive" data-id="'+esc(o.id)+'">Arquivar</button></td></tr>').join(''):'<tr><td colspan="6">Sem pedidos ativos.</td></tr>';
    bindActions(body);
    const audit=rows.filter(o=>!active(o)), el=$('adminAudit');
    el.innerHTML=audit.length?audit.map(o=>orderCard(o,'audit')+'<div class="actions"><button class="secondary compact" data-act="restore" data-id="'+esc(o.id)+'" '+(!o.archived?'disabled':'')+'>Restaurar arquivado</button></div>').join(''):'<div class="empty">Nenhum cancelamento ou arquivamento no dia.</div>';
    bindActions(el);
  }
  function downloadCsv() {
    const {day,rows}=filteredAdmin(), s=M.summary(rows,day);
    const header=['Data','Colaborador','Refeição','Prato','Acompanhamentos','Observações','Status','Arquivado','Valor'];
    const lines=[header,...rows.map(o=>[o.order_day,o.employee_name,mealTitle(o.meal),o.dish,(o.accompaniments||[]).join(' / '),o.notes||'',statusLabels[o.status]||o.status,o.archived?'Sim':'Não',Number(o.price).toFixed(2).replace('.',',')]),[],['Subtotal','', '', '', '', '', '', '',s.subtotal.toFixed(2).replace('.',',')],['Entregas','','','','','','','',s.delivery.toFixed(2).replace('.',',')],['TOTAL','','','','','','','',s.total.toFixed(2).replace('.',',')]];
    const csv='\ufeff'+lines.map(row=>row.map(cell=>'"'+String(cell??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a'); a.href=url; a.download='RL_pedidos_'+day+'.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function sendSummary(){
    const phone=$('whatsPhone').value.replace(/\D/g,'');
    if(phone.length<12 || phone.length>15) return inform('Informe o número completo do WhatsApp com 55 + DDD + número.',true);
    localStorage.setItem('rl-whats-dest',phone);
    const {day,rows}=filteredAdmin(), s=M.summary(rows,day);
    const entries=s.active.map(o=>'• '+o.employee_name+' — '+mealTitle(o.meal)+': '+o.dish+' ('+M.money(o.price)+')');
    const msg='*AMBEV | PEDIDOS RL*\nData: '+day.split('-').reverse().join('/')+'\n\n'+entries.join('\n')+'\n\nCafés: '+s.coffee+' | Almoços: '+s.lunch+'\nRefeições: '+M.money(s.subtotal)+'\nEntregas: '+M.money(s.delivery)+'\n*TOTAL: '+M.money(s.total)+'*\n\nConferir quantidades e entrega antes do pagamento.';
    window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
  }
  document.addEventListener('click', e => {
    const b=e.target.closest('[data-tab]'); if(b) chooseTab(b.dataset.tab);
    const d=e.target.closest('[data-demo-role]');
    if(d && !configured){state.role=d.dataset.demoRole;state.profile={display_name:state.role==='colaborador'?state.demoName:state.role==='admin'?'Gestão RL (prévia)':'Restaurante (prévia)',role:state.role};state.tab=state.role==='colaborador'?'order':state.role==='admin'?'admin':'restaurant';renderAll();}
  });
  document.querySelectorAll('input[name="meal"]').forEach(input => input.addEventListener('change',()=>{state.dish='';state.sides=[];renderMenu();}));
  $('demoName').addEventListener('input',e=>{state.demoName=e.target.value.trim()||'Colaborador de teste';if(state.role==='colaborador'){state.profile.display_name=state.demoName;renderTabs();}});
  $('placeBtn').addEventListener('click',saveOrder);
  $('clearEditBtn').addEventListener('click',clearEdit);
  $('loginBtn').addEventListener('click',()=>authAction(false));
  $('signupBtn').addEventListener('click',()=>authAction(true));
  $('logoutBtn').addEventListener('click',()=>client?.auth.signOut());
  $('mineRefresh').addEventListener('click',reload);
  $('restaurantRefresh').addEventListener('click',reload);
  $('adminRefresh').addEventListener('click',reload);
  ['restaurantDate','restaurantMeal'].forEach(id => $(id).addEventListener('change',renderRestaurant));
  ['adminDate','adminMeal'].forEach(id => $(id).addEventListener('change',renderAdmin));
  $('csvBtn').addEventListener('click',downloadCsv);
  $('whatsBtn').addEventListener('click',sendSummary);
  $('whatsPhone').value=localStorage.getItem('rl-whats-dest')||'';
  begin();
})();