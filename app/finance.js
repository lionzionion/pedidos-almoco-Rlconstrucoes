/* RL Pedidos | Relatórios financeiros e fechamentos por empresa.
   Cálculos no navegador para prévia; fechamentos e pagamentos validados no PostgreSQL. */
window.RL_FINANCE = (() => {
  'use strict';
  const M=window.RL_MENU;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const br=d=>String(d||'').split('-').reverse().join('/');
  const cents=v=>Math.round(Number(v||0)*100);
  const moneyCent=v=>M.money(Number(v||0)/100);
  const companyName=k=>k==='RL'?'RL Construções':k==='SOLUTIO'?'Solutio':'RL + Solutio';
  const mealName=k=>k==='cafe'?'Café da manhã':'Almoço';
  const companyKey=o=>o.company==='SOLUTIO'?'SOLUTIO':'RL';
  const active=o=>!o.archived&&o.status!=='cancelado';
  const empty=()=>({coffee:0,lunch:0,deliveredCount:0,pendingCount:0,subtotalCents:0,freightCents:0,totalCents:0,deliveredCents:0,deliveredFreightCents:0,deliveredTotalCents:0});
  function add(group,forecast,billed){
    group.coffee+=forecast.coffee;
    group.lunch+=forecast.lunch;
    group.deliveredCount+=billed.coffee+billed.lunch;
    group.pendingCount+=forecast.coffee+forecast.lunch-billed.coffee-billed.lunch;
    group.subtotalCents+=cents(forecast.subtotal);
    group.freightCents+=cents(forecast.delivery);
    group.totalCents+=cents(forecast.total);
    group.deliveredCents+=cents(billed.subtotal);
    group.deliveredFreightCents+=cents(billed.delivery);
    group.deliveredTotalCents+=cents(billed.total);
  }
  function calculate(orders,from,to,meal='todos',company='todos'){
    if(!from||!to||from>to)throw Error('Selecione um intervalo de datas válido.');
    const all=(orders||[]).filter(o=>o.order_day>=from&&o.order_day<=to&&(meal==='todos'||o.meal===meal));
    const days=[...new Set(all.map(o=>o.order_day))].sort();
    const totals={RL:empty(),SOLUTIO:empty()},daily=[];
    for(const day of days){
      const dayOrders=all.filter(o=>o.order_day===day);
      const forecast=M.companyBreakdown(dayOrders,day);
      const delivered=M.companyBreakdown(dayOrders.filter(o=>o.status==='entregue'),day);
      for(const companyKey of ['RL','SOLUTIO']){
        add(totals[companyKey],forecast[companyKey],delivered[companyKey]);
        daily.push({day,company:companyKey,coffee:forecast[companyKey].coffee,
          lunch:forecast[companyKey].lunch,subtotalCents:cents(forecast[companyKey].subtotal),
          freightCents:cents(forecast[companyKey].delivery),
          totalCents:cents(forecast[companyKey].total),
          deliveredTotalCents:cents(delivered[companyKey].total)});
      }
    }
    const keys=company==='todos'?['RL','SOLUTIO']:[company];
    if(!keys.every(k=>k==='RL'||k==='SOLUTIO'))throw Error('Empresa inválida.');
    const selected=empty();
    for(const key of keys)for(const [field,value] of Object.entries(totals[key]))selected[field]+=value;
    const nominal=all.filter(o=>company==='todos'||companyKey(o)===company)
      .sort((a,b)=>a.order_day.localeCompare(b.order_day)||a.meal.localeCompare(b.meal)||
        String(a.employee_name).localeCompare(String(b.employee_name),'pt-BR'));
    return {from,to,meal,company,nominal,totals,selected,
      daily:daily.filter(row=>company==='todos'||row.company===company)};
  }
  function paymentTotal(c){return (c.rl_meal_payments||[]).reduce((v,p)=>v+Number(p.amount_cents||0),0);}
  function closureStatus(c){
    const due=Number(c.total_cents||0),paid=paymentTotal(c);
    return paid>=due?'Quitado':paid>0?'Parcial':'Pendente';
  }
  function toCSV(report,closures=[]){
    const safe=v=>{
      let s=String(v??'');
      if(/^[\s]*[=+\-@]/.test(s))s="'"+s; // evita execução de fórmulas ao abrir no Excel
      return '"'+s.replace(/"/g,'""')+'"';
    };
    const data=[['RELATÓRIO FINANCEIRO RL PEDIDOS',br(report.from)+' até '+br(report.to)],
      ['Empresa',companyName(report.company)],['Refeição',report.meal==='todos'?'Todas':mealName(report.meal)],[],
      ['RESUMO','Cafés','Almoços','Refeições (R$)','Frete rateado (R$)','Total previsto (R$)','Total entregue (R$)','Aguardando entrega']];
    for(const k of (report.company==='todos'?['RL','SOLUTIO']:[report.company])){
      const x=report.totals[k];
      data.push([companyName(k),x.coffee,x.lunch,(x.subtotalCents/100).toFixed(2).replace('.',','),(x.freightCents/100).toFixed(2).replace('.',','),(x.totalCents/100).toFixed(2).replace('.',','),(x.deliveredTotalCents/100).toFixed(2).replace('.',','),x.pendingCount]);
    }
    data.push([],['DETALHAMENTO NOMINAL'],['Data','Empresa','Colaborador','Refeição','Prato','Status','Valor (R$)','Previsto válido']);
    for(const o of report.nominal)data.push([br(o.order_day),companyName(companyKey(o)),o.employee_name,mealName(o.meal),o.dish,o.archived?'Arquivado':o.status,(Number(o.price||0)).toFixed(2).replace('.',','),active(o)?'Sim':'Não']);
    data.push([],['RESUMO DIÁRIO'],['Data','Empresa','Cafés','Almoços','Refeições (R$)','Frete (R$)','Total (R$)','Entregue (R$)']);
    for(const d of report.daily)data.push([br(d.day),companyName(d.company),d.coffee,d.lunch,(d.subtotalCents/100).toFixed(2).replace('.',','),(d.freightCents/100).toFixed(2).replace('.',','),(d.totalCents/100).toFixed(2).replace('.',','),(d.deliveredTotalCents/100).toFixed(2).replace('.',',')]);
    data.push([],['FECHAMENTOS REGISTRADOS'],['Empresa','Período início','Período fim','Valor fechado (R$)','Pago (R$)','Saldo (R$)','Situação']);
    for(const c of closures){const paid=paymentTotal(c);
      data.push([companyName(c.company),br(c.period_start),br(c.period_end),(c.total_cents/100).toFixed(2).replace('.',','),(paid/100).toFixed(2).replace('.',','),((c.total_cents-paid)/100).toFixed(2).replace('.',','),closureStatus(c)]);
    }
    data.push([],['PAGAMENTOS LANÇADOS'],['Empresa','Data','Valor (R$)','Método','Observações']);
    for(const c of closures)for(const p of c.rl_meal_payments||[])data.push([companyName(c.company),br(p.payment_day),(p.amount_cents/100).toFixed(2).replace('.',','),p.method,p.notes||'']);
    return '\ufeff'+data.map(row=>row.map(safe).join(';')).join('\r\n');
  }
  let deps=null, current=null, currentClosures=[], loading=false;
  function status(s,error=false){const el=$('financeStatus');if(el){el.textContent=s;el.classList.toggle('error',error);}}
  function syncRange(){
    const now=M.today(),select=$('financePeriod').value;
    if(select==='custom')return;
    let first=now;
    if(select==='mes')first=now.slice(0,7)+'-01';
    if(select==='semana'){
      const d=new Date(now+'T12:00:00Z');
      d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));
      first=d.toISOString().slice(0,10);
    }
    $('financeStartDate').value=first;$('financeEndDate').value=now;
  }
  function readFilters(){
    const from=$('financeStartDate').value,to=$('financeEndDate').value,
      company=$('financeCompany').value,meal=$('financeMeal').value;
    if(!from||!to||from>to)throw Error('Informe uma data inicial anterior ou igual à final.');
    const length=Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000);
    if(length>366)throw Error('Consulte no máximo 367 dias de cada vez.');
    return {from,to,company,meal};
  }
  async function fetchAll(from,to){
    if(!deps.configured)return deps.demoOrders().filter(o=>o.order_day>=from&&o.order_day<=to);
    const result=[];const pageSize=1000;
    for(let offset=0;offset<20000;offset+=pageSize){
      const {data,error}=await deps.client.from('orders').select('*')
        .gte('order_day',from).lte('order_day',to)
        .order('order_day',{ascending:true}).order('id',{ascending:true})
        .range(offset,offset+pageSize-1);
      if(error)throw error;
      result.push(...(data||[]));
      if(!data||data.length<pageSize)return result;
    }
    throw Error('Há mais de 20 mil pedidos no período. Divida o intervalo para evitar valores incompletos.');
  }
  async function fetchClosures(from,to,company){
    if(!deps.configured)return [];
    let query=deps.client.from('rl_meal_closures').select('*,rl_meal_payments(id,amount_cents,payment_day,method,notes,created_at)')
      .lte('period_start',to).gte('period_end',from).order('period_start',{ascending:false}).limit(1000);
    if(company!=='todos')query=query.eq('company',company);
    const {data,error}=await query;
    if(error)throw error;
    if(data.length===1000)throw Error('Há mais de 999 fechamentos neste período. Divida o intervalo.');
    return data;
  }
  async function refresh(){
    if(!deps?.isAdmin()||loading)return;
    let filters;try{filters=readFilters();}catch(e){status(e.message,true);return;}
    loading=true;$('financeApply').disabled=true;status('Consultando pedidos e fechamentos...');
    try{
      const [orders,closures]=await Promise.all([
        fetchAll(filters.from,filters.to),
        fetchClosures(filters.from,filters.to,filters.company)
      ]);
      current=calculate(orders,filters.from,filters.to,filters.meal,filters.company);
      currentClosures=closures;
      render();
      status('Consulta atualizada. O fechamento utiliza somente pedidos entregues e é registrado no servidor.');
    }catch(e){current=null;currentClosures=[];status('Falha na consulta: '+e.message,true);}
    finally{loading=false;$('financeApply').disabled=false;}
  }
  function metric(label,value){return '<div class="metric"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>';}
  function render(){
    if(!current)return;
    const {selected,totals,nominal,daily,company}=current;
    const cards=['<div class="finance-section-title">RESUMO DO PERÍODO</div>'];
    const keys=company==='todos'?['RL','SOLUTIO']:[company];
    for(const k of keys){
      cards.push('<div class="finance-company-card"><span>'+esc(companyName(k))+'</span><strong>'+moneyCent(totals[k].totalCents)+'</strong><small>Previsto • Entregue: '+moneyCent(totals[k].deliveredTotalCents)+'</small></div>');
    }
    cards.push(metric('TOTAL PREVISTO',moneyCent(selected.totalCents)),
      metric('Total entregue',moneyCent(selected.deliveredTotalCents)),
      metric('Frete previsto',moneyCent(selected.freightCents)),
      metric('Cafés / Almoços',selected.coffee+' / '+selected.lunch),
      metric('Aguardando entrega',selected.pendingCount));
    $('financeStats').innerHTML=cards.join('');
    $('financeDailyRows').innerHTML=daily.filter(d=>d.coffee+d.lunch>0).map(d=>'<tr><td>'+br(d.day)+'</td><td>'+esc(companyName(d.company))+'</td><td>'+d.coffee+'</td><td>'+d.lunch+'</td><td>'+moneyCent(d.subtotalCents)+'</td><td>'+moneyCent(d.freightCents)+'</td><td><strong>'+moneyCent(d.totalCents)+'</strong></td><td>'+moneyCent(d.deliveredTotalCents)+'</td></tr>').join('')||
      '<tr><td colspan="8">Nenhuma refeição no período.</td></tr>';
    $('financeNominalRows').innerHTML=nominal.map(o=>'<tr><td>'+br(o.order_day)+'</td><td>'+esc(companyName(companyKey(o)))+'</td><td>'+esc(o.employee_name)+'</td><td>'+esc(mealName(o.meal))+'</td><td>'+esc(o.dish)+'</td><td>'+esc(o.archived?'Arquivado':o.status)+'</td><td>'+moneyCent(cents(o.price))+'</td></tr>').join('')||
      '<tr><td colspan="7">Nenhum pedido encontrado.</td></tr>';
    const paid=currentClosures.reduce((s,c)=>s+paymentTotal(c),0);
    const pending=currentClosures.reduce((s,c)=>s+Number(c.total_cents)-paymentTotal(c),0);
    $('financePaymentStats').innerHTML=metric('Fechamentos na consulta',currentClosures.length)+
      metric('Pagamentos registrados',moneyCent(paid))+metric('Saldo dos fechamentos',moneyCent(pending));
    $('financeClosureRows').innerHTML=currentClosures.map(c=>{
      const paid=paymentTotal(c),due=c.total_cents-paid,st=closureStatus(c);
      return '<tr><td>'+esc(companyName(c.company))+'</td><td>'+br(c.period_start)+' a '+br(c.period_end)+'</td><td>'+c.coffee_count+' / '+c.lunch_count+'</td><td>'+moneyCent(c.subtotal_cents)+'</td><td>'+moneyCent(c.delivery_cents)+'</td><td><strong>'+moneyCent(c.total_cents)+'</strong></td><td>'+moneyCent(paid)+'</td><td><b>'+moneyCent(due)+'</b></td><td><span class="status '+(st==='Quitado'?'entregue':'confirmado')+'">'+st+'</span></td><td><button type="button" class="secondary compact" data-pay-closure="'+esc(c.id)+'" '+(due<=0?'disabled':'')+'>Registrar pagamento</button></td></tr>';
    }).join('')||'<tr><td colspan="10">Nenhum fechamento registrado nesse intervalo.</td></tr>';
    $('financeClosureSelect').innerHTML='<option value="">Selecione um fechamento</option>'+
      currentClosures.filter(c=>c.total_cents>paymentTotal(c)).map(c=>'<option value="'+esc(c.id)+'">'+esc(companyName(c.company))+' • '+br(c.period_start)+' a '+br(c.period_end)+' • Saldo '+moneyCent(c.total_cents-paymentTotal(c))+'</option>').join('');
    const canClose=deps.configured && current.meal==='todos' && current.to<=M.today();
    $('financeCloseBtn').disabled=!canClose;
    $('financeCloseHelp').textContent=!deps.configured?'Pagamentos indisponíveis no modo demonstração.':
      current.meal!=='todos'?'Selecione Todas as refeições para registrar um fechamento.':
      current.to>M.today()?'Período futuro não pode ser fechado.':
      'O fechamento fixa os valores entregues no banco. Confirme todas as entregas antes de continuar.';
    $('financePaymentBtn').disabled=!deps.configured;
  }
  function downloadFile(name,text,type){
    const url=URL.createObjectURL(new Blob([text],{type}));
    const a=document.createElement('a');a.href=url;a.download=name;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function exportCsv(){
    if(!current)return status('Clique em Consultar antes de exportar.',true);
    downloadFile('RL_Financeiro_'+current.from+'_'+current.to+'.csv',toCSV(current,currentClosures),'text/csv;charset=utf-8');
  }
  function printHtml(){
    if(!current)return status('Clique em Consultar antes de imprimir.',true);
    const w=window.open('','_blank');if(!w)return status('Permita a janela de impressão.',true);
    const table=(head,rows)=>'<table><thead><tr>'+head.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(cells=>'<tr>'+cells.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
    const daily=current.daily.filter(d=>d.coffee+d.lunch>0).map(d=>[br(d.day),companyName(d.company),d.coffee,d.lunch,moneyCent(d.subtotalCents),moneyCent(d.freightCents),moneyCent(d.totalCents),moneyCent(d.deliveredTotalCents)]);
    const closureRows=currentClosures.map(c=>[companyName(c.company),br(c.period_start)+' a '+br(c.period_end),moneyCent(c.total_cents),moneyCent(paymentTotal(c)),moneyCent(c.total_cents-paymentTotal(c)),closureStatus(c)]);
    const nominal=current.nominal.map(o=>[br(o.order_day),companyName(companyKey(o)),o.employee_name,mealName(o.meal),o.dish,o.archived?'Arquivado':o.status,moneyCent(cents(o.price))]);
    const logo=new URL('../assets/rl-logo.webp',location.href).href;
    w.document.open();w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>RL - Relatório financeiro</title><style>@page{size:A4 landscape;margin:13mm}body{font:11px Arial;color:#15354b}header{background:#073a60;color:#fff;padding:10px 16px}header img{width:170px}h1{font-size:20px}h2{font-size:15px;margin-top:18px}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #d7e2ea;padding:7px;text-align:left}th{background:#105a7f;color:white}tr{break-inside:avoid}thead{display:table-header-group}p{line-height:1.5}button{padding:9px} @media print{button{display:none}}</style></head><body><header><img src="'+esc(logo)+'" alt="RL Engenharia"></header><button onclick="print()">Imprimir / Salvar PDF</button><h1>Relatório financeiro — '+esc(companyName(current.company))+'</h1><p>Período: '+br(current.from)+' a '+br(current.to)+' | Total previsto: <b>'+moneyCent(current.selected.totalCents)+'</b> | Entregue: <b>'+moneyCent(current.selected.deliveredTotalCents)+'</b> | Gerado em '+esc(new Date().toLocaleString('pt-BR'))+'</p><h2>Fechamento por dia e empresa</h2>'+
      table(['Data','Empresa','Cafés','Almoços','Refeições','Frete','Previsto','Entregue'],daily)+
      '<h2>Fechamentos e pagamentos</h2>'+table(['Empresa','Período','Fechado','Pago','Saldo','Status'],closureRows)+
      '<h2>Relação nominal</h2>'+table(['Data','Empresa','Colaborador','Refeição','Prato','Status','Preço'],nominal)+
      '<p>Frete único por dia e refeição, rateado por quantidade entre RL e Solutio. Cancelados/arquivados não são cobrados; confira as entregas antes de pagar.</p></body></html>');w.document.close();w.focus();
  }
  async function downloadPdf(){
    if(!current)return status('Clique em Consultar antes de exportar.',true);
    try{
      await window.RL_REPORTS.ensurePDF();
      const doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
      const W=doc.internal.pageSize.getWidth();
      doc.setFillColor(6,52,80);doc.rect(0,0,W,34,'F');
      try{const png=await window.RL_REPORTS.logoPNG();doc.addImage(png,'PNG',13,3,95,26);}
      catch{doc.setFontSize(20);doc.setTextColor(255,255,255);doc.text('RL ENGENHARIA',14,20);}
      doc.setTextColor(25,52,69);doc.setFontSize(16);doc.text('RELATÓRIO FINANCEIRO — '+companyName(current.company).toUpperCase(),13,44);
      doc.setFontSize(10);doc.text(br(current.from)+' a '+br(current.to)+' | Previsto '+moneyCent(current.selected.totalCents)+' | Entregue '+moneyCent(current.selected.deliveredTotalCents),13,52);
      const common={margin:{left:13,right:13,top:14,bottom:17},styles:{fontSize:8,cellPadding:3,overflow:'linebreak'},headStyles:{fillColor:[11,83,121]},alternateRowStyles:{fillColor:[242,247,250]}};
      const table=(title,head,body,startY)=>{
        if(startY>170){doc.addPage();startY=18;}
        doc.setFontSize(11);doc.setFont('helvetica','bold');doc.text(title,13,startY);
        doc.autoTable({...common,startY:startY+3,head:[head],body:body.length?body:[['Sem registros']]});
        return doc.lastAutoTable.finalY+12;
      };
      let y=table('Resumo diário',['Data','Empresa','Café','Almoço','Refeições','Frete','Previsto','Entregue'],
        current.daily.filter(d=>d.coffee+d.lunch).map(d=>[br(d.day),companyName(d.company),String(d.coffee),String(d.lunch),moneyCent(d.subtotalCents),moneyCent(d.freightCents),moneyCent(d.totalCents),moneyCent(d.deliveredTotalCents)]),61);
      y=table('Fechamentos e pagamentos',['Empresa','Período','Valor fechado','Pago','Saldo','Situação'],
        currentClosures.map(c=>[companyName(c.company),br(c.period_start)+' a '+br(c.period_end),moneyCent(c.total_cents),moneyCent(paymentTotal(c)),moneyCent(c.total_cents-paymentTotal(c)),closureStatus(c)]),y);
      table('Pedidos nominais',['Data','Empresa','Colaborador','Refeição','Prato','Status','Valor'],
        current.nominal.map(o=>[br(o.order_day),companyName(companyKey(o)),o.employee_name,mealName(o.meal),o.dish,o.archived?'Arquivado':o.status,moneyCent(cents(o.price))]),y);
      const count=doc.internal.getNumberOfPages();
      for(let i=1;i<=count;i++){doc.setPage(i);doc.setTextColor(98,113,124);doc.setFontSize(8);doc.text('RL Pedidos | Verificar entregas e comprovantes antes do pagamento.',13,doc.internal.pageSize.getHeight()-8);doc.text('Página '+i+'/'+count,W-13,doc.internal.pageSize.getHeight()-8,{align:'right'});}
      doc.save('RL_Financeiro_'+current.from+'_'+current.to+'.pdf');
    }catch(e){status('Não foi possível gerar PDF: '+e.message+'. Utilize Imprimir / Salvar PDF.',true);}
  }
  async function createClosure(){
    if(!deps.isAdmin()||!deps.configured||!current)return;
    const key=$('financeCloseCompany').value;
    const actual=readFilters();
    if(actual.from!==current.from||actual.to!==current.to||actual.meal!==current.meal||actual.company!==current.company)
      return status('Os filtros foram alterados. Clique em Consultar antes de registrar o fechamento.',true);
    if(current.meal!=='todos'||current.to>M.today())return status('Feche somente períodos encerrados com todas as refeições.',true);
    if(!['RL','SOLUTIO'].includes(key))return status('Escolha RL ou Solutio.',true);
    if(current.selected.pendingCount>0)return status('Existem pedidos sem entrega confirmada. Finalize-os antes de fechar.',true);
    if(!confirm('Registrar fechamento DEFINITIVO de '+companyName(key)+' para '+br(current.from)+' a '+br(current.to)+'? O servidor recalculará os valores entregues. Não será possível fechar novamente datas sobrepostas.'))return;
    const btn=$('financeCloseBtn');btn.disabled=true;
    try{
      const {error}=await deps.client.rpc('rl_create_meal_closure',{p_company:key,p_start:current.from,p_end:current.to});
      if(error)throw error;
      await refresh();status('Fechamento registrado com sucesso. Valores históricos preservados.');
    }catch(e){status('Não foi possível fechar: '+e.message,true);}finally{btn.disabled=false;}
  }
  async function recordPayment(){
    if(!deps.isAdmin()||!deps.configured)return;
    const id=$('financeClosureSelect').value,c=currentClosures.find(c=>c.id===id);
    if(!c)return status('Selecione um fechamento pendente.',true);
    const raw=$('financePaymentAmount').value.trim(),amt=Number(raw.replace(',','.'));
    if(!raw||!/^\d+(?:[.,]\d{1,2})?$/.test(raw)||!Number.isFinite(amt)||amt<=0)
      return status('Informe um valor positivo com até duas casas decimais.',true);
    const value=Math.round(amt*100),due=c.total_cents-paymentTotal(c);
    if(value>due)return status('Valor maior que o saldo de '+moneyCent(due)+'.',true);
    const day=$('financePaymentDay').value,method=$('financePaymentMethod').value,notes=$('financePaymentNotes').value.trim();
    if(!day||day>M.today())return status('Informe uma data de pagamento válida, não futura.',true);
    if(!confirm('Confirmar registro de '+moneyCent(value)+' pago por '+companyName(c.company)+'? Este lançamento ficará no histórico financeiro.'))return;
    const btn=$('financePaymentBtn');btn.disabled=true;
    try{
      const {error}=await deps.client.rpc('rl_record_meal_payment',
        {p_closure_id:id,p_amount_cents:value,p_payment_day:day,p_method:method,p_notes:notes});
      if(error)throw error;
      $('financePaymentAmount').value='';$('financePaymentNotes').value='';
      await refresh();status('Pagamento registrado com sucesso.');
    }catch(e){status('Erro ao registrar pagamento: '+e.message,true);}finally{btn.disabled=false;}
  }
  function init(options){
    deps=options;
    $('financePaymentDay').value=M.today();
    syncRange();
    $('financePeriod').addEventListener('change',()=>{syncRange();});
    $('financeCompany').addEventListener('change',()=>{
      if($('financeCompany').value!=='todos')$('financeCloseCompany').value=$('financeCompany').value;
    });
    $('financeStartDate').addEventListener('change',()=>{$('financePeriod').value='custom';});
    $('financeEndDate').addEventListener('change',()=>{$('financePeriod').value='custom';});
    $('financeApply').addEventListener('click',refresh);
    $('financePdfBtn').addEventListener('click',downloadPdf);
    $('financePrintBtn').addEventListener('click',printHtml);
    $('financeCsvBtn').addEventListener('click',exportCsv);
    $('financeCloseBtn').addEventListener('click',createClosure);
    $('financePaymentBtn').addEventListener('click',recordPayment);
    $('financeClosureRows').addEventListener('click',e=>{
      const id=e.target.closest('[data-pay-closure]')?.dataset.payClosure;
      if(!id)return;
      $('financeClosureSelect').value=id;
      const c=currentClosures.find(c=>c.id===id);
      $('financePaymentAmount').value=((c.total_cents-paymentTotal(c))/100).toFixed(2);
      $('financePaymentAmount').focus();
    });
  }
  return Object.freeze({calculate,toCSV,closureStatus,paymentTotal,init,refresh});
})();
