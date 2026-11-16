/* Cardápio informado pelo restaurante em 15/11/2026. Horário: America/Recife. */
window.RL_MENU = (() => {
  const breakfast = {
    0: ['Cuscuz com frango e vinagrete', 'Cachorro-quente'],
    1: ['Pão com queijo e mortadela', 'Cuscuz com frango e vinagrete'],
    2: ['Cuscuz com salsichinha', 'Pão com queijo e mortadela'],
    3: ['Cachorro-quente', 'Macaxeira com linguiça toscana acebolada'],
    4: ['Pão com queijo e mortadela', 'Cuscuz com frango e vinagrete'],
    5: ['Cuscuz com salsichinha', 'Cachorro-quente'],
    6: ['Macaxeira com linguiça toscana', 'Pão com queijo e mortadela']
  };
  const lunch = {
    0: ['Arrumadinho misto (carne de sol, frango e calabresa)', 'Frango à milanesa', 'Parmegiana de carne'],
    1: ['Parmegiana de frango', 'Arrumadinho de carne de sol', 'Filé de frango'],
    2: ['Frango à milanesa', 'Arrumadinho misto', 'Arrumadinho de frango'],
    3: ['Bife à milanesa', 'Parmegiana de carne', 'Arrumadinho de frango e calabresa'],
    4: ['Filé de frango', 'Arrumadinho de carne de sol', 'Frango à milanesa'],
    5: ['Parmegiana de carne', 'Bife à milanesa', 'Arrumadinho misto'],
    6: ['Arrumadinho de frango', 'Filé de frango', 'Parmegiana de frango']
  };
  const sides = ['Arroz','Feijão mulato','Feijão macassar','Macarrão','Vinagrete','Legumes'];
  const days = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  function today(now=new Date()) { return new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Recife', year:'numeric', month:'2-digit', day:'2-digit'}).format(now); }
  function nextDay(date) {
    const utc=new Date(date+'T12:00:00Z');
    utc.setUTCDate(utc.getUTCDate()+1);
    return utc.toISOString().slice(0,10);
  }
  function orderableDays(now=new Date()) {
    const day=today(now);
    return [day,nextDay(day)];
  }
  function canOrderFor(date,now=new Date()) { return orderableDays(now).includes(date); }
  function weekday(date) { return new Date(date + 'T12:00:00Z').getUTCDay(); }
  function items(type, date) {
    return type === 'cafe' ? [...breakfast[weekday(date)], 'Café só com pão'] : [...lunch[weekday(date)]];
  }
  function unitPrice(type, dish) { return type === 'almoco' ? 22 : dish === 'Café só com pão' ? 10 : 17; }
  function fee(_type, _date) { return 8; } // Um único frete coletivo de R$ 8 por remessa.
  function cutoff(type) { return type==='cafe' ? '08:00' : '13:00'; }
  function closed(type, date, now=new Date()) {
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{
      timeZone:'America/Recife',year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',hourCycle:'h23'
    }).formatToParts(now).map(p=>[p.type,p.value]));
    const currentDay=parts.year+'-'+parts.month+'-'+parts.day;
    return currentDay>date || (currentDay===date && (parts.hour+':'+parts.minute)>=cutoff(type));
  }
  function money(amount) { return Number(amount || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'}); }
  function summary(orders, date, now=new Date()) {
    const active = orders.filter(o => o.order_day === date && !o.archived && o.status !== 'cancelado');
    const count = type => active.filter(o => o.meal === type).length;
    const subtotal = active.reduce((sum,o) => sum + Number(o.price), 0);
    const delivery = (count('cafe') && closed('cafe',date,now) ? fee('cafe',date) : 0) + (count('almoco') && closed('almoco',date,now) ? fee('almoco',date) : 0);
    return {active, coffee:count('cafe'), lunch:count('almoco'), subtotal, delivery, total:subtotal + delivery};
  }
  // Rateio do frete único por quantidade de pedidos de cada empresa, em centavos.
  // Arredondamento é aplicado à RL e o saldo à Solutio, garantindo soma exata de R$8.
  function companyBreakdown(orders,date,now=new Date()) {
    const active=orders.filter(o=>o.order_day===date && !o.archived && o.status!=='cancelado');
    const result={RL:{company:'RL',coffee:0,lunch:0,subtotal:0,delivery:0,total:0,active:[]},
      SOLUTIO:{company:'SOLUTIO',coffee:0,lunch:0,subtotal:0,delivery:0,total:0,active:[]}};
    const cents={RL:0,SOLUTIO:0};
    for(const o of active){
      const company=o.company==='SOLUTIO'?'SOLUTIO':'RL';
      const group=result[company];group.active.push(o);
      if(o.meal==='cafe')group.coffee++;
      if(o.meal==='almoco')group.lunch++;
      cents[company]+=Math.round(Number(o.price)*100);
    }
    const deliveries={RL:0,SOLUTIO:0};
    for(const type of ['cafe','almoco']){
      const rl=result.RL.active.filter(o=>o.meal===type).length;
      const sol=result.SOLUTIO.active.filter(o=>o.meal===type).length;
      if(!rl&&!sol)continue;
      if(!closed(type,date,now))continue;
      const rlShare=Math.round(800*rl/(rl+sol));
      deliveries.RL+=rlShare;
      deliveries.SOLUTIO+=800-rlShare;
    }
    for(const company of ['RL','SOLUTIO']){
      result[company].subtotal=cents[company]/100;
      result[company].delivery=deliveries[company]/100;
      result[company].total=(cents[company]+deliveries[company])/100;
    }
    return result;
  }
  return Object.freeze({breakfast, lunch, sides, days, today, nextDay, orderableDays, canOrderFor, weekday, items, unitPrice, fee, cutoff, closed, money, summary, companyBreakdown});
})();