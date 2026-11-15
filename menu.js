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
  function today() { return new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Recife', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date()); }
  function weekday(date) { return new Date(date + 'T12:00:00Z').getUTCDay(); }
  function items(type, date) {
    return type === 'cafe' ? [...breakfast[weekday(date)], 'Café só com pão'] : [...lunch[weekday(date)]];
  }
  function unitPrice(type, dish) { return type === 'almoco' ? 22 : dish === 'Café só com pão' ? 10 : 17; }
  function fee(type, date) { return type === 'cafe' ? 12 : ([0, 6].includes(weekday(date)) ? 12 : 8); }
  function money(amount) { return Number(amount || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'}); }
  function summary(orders, date) {
    const active = orders.filter(o => o.order_day === date && !o.archived && o.status !== 'cancelado');
    const count = type => active.filter(o => o.meal === type).length;
    const subtotal = active.reduce((sum,o) => sum + Number(o.price), 0);
    const delivery = (count('cafe') ? fee('cafe',date) : 0) + (count('almoco') ? fee('almoco',date) : 0);
    return {active, coffee:count('cafe'), lunch:count('almoco'), subtotal, delivery, total:subtotal + delivery};
  }
  return Object.freeze({breakfast, lunch, sides, days, today, weekday, items, unitPrice, fee, money, summary});
})();