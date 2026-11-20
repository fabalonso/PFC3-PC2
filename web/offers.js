import { api, el, selectField } from './ui.js';

const stateTitles = { available: 'Disponible', reserved: 'Reservada', delivered: 'Entregada' };
const weights = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 });

function offerCard(offer, action) {
  return el('article', { className: 'card offer-card' },
    el('div', { className: 'card-top' }, el('p', { className: 'district', text: offer.district }),
      el('span', { className: 'offer-state state-' + offer.status, text: stateTitles[offer.status] })),
    el('h3', { text: offer.material }),
    el('p', { className: 'offer-weight', text: weights.format(offer.weight_kg) + ' kg' }),
    ...(action ? [action] : []),
  );
}

export function initOffers() {
  const formBox = document.querySelector('#offer-form');
  const status = document.querySelector('#offer-status, #activity-status');
  const offerHint = document.querySelector('#offer-hint');
  let user = null;
  let catalog = null;
  const list = document.querySelector('#offer-list');
  const filters = document.querySelector('#offer-filters');
  const activityGate = document.querySelector('#activity-gate');
  const activityList = document.querySelector('#activity-list');
  const activityDescription = document.querySelector('#activity-description');
  let latestActivity = 0;
  let districtFilter;
  let materialFilter;
  let latest = 0;

  function actionButton(offer, action, label, confirmation) {
    const button = el('button', { className: 'button button-outline', type: 'button', text: label });
    button.addEventListener('click', async () => {
      button.disabled = true;
      status.textContent = '';
      try {
        await api('/api/offers/' + offer.id + '/' + action, { method: 'POST' });
        status.textContent = confirmation;
      } catch (error) {
        status.textContent = error.message;
      } finally {
        await Promise.all([refreshOffers(), refreshActivity()]);
        button.disabled = false;
      }
    });
    return button;
  }

  function pickupAction(offer) {
    if (offer.status === 'reserved' && user?.role === 'collector') {
      return actionButton(offer, 'cancel', 'Cancelar reserva', 'Reserva cancelada. El material vuelve a estar disponible.');
    }
    if (offer.status === 'reserved' && user?.role === 'generator') {
      return actionButton(offer, 'complete', 'Confirmar entrega', 'Entrega confirmada.');
    }
    return null;
  }

  async function refreshOffers() {
    if (!list) return;
    const request = ++latest;
    try {
      const query = new URLSearchParams();
      if (districtFilter?.control.value) query.set('district', districtFilter.control.value);
      if (materialFilter?.control.value) query.set('material', materialFilter.control.value);
      const { items } = await api('/api/offers?' + query);
      if (request !== latest) return;
      list.replaceChildren(...items.map((offer) => offerCard(offer, user?.role === 'collector'
        ? actionButton(offer, 'reserve', 'Reservar', 'Material reservado.')
        : null)));

      if (!items.length) {
        const message = query.size ? 'No hay ofertas que coincidan con los filtros.' : 'Todavía no hay material disponible.';
        list.append(el('p', { className: 'empty', text: message }));
      }
    } catch (error) {
      if (request !== latest) return;
      list.replaceChildren();
      status.textContent = error.message;
    }
  }

  async function refreshActivity() {
    const request = ++latestActivity;
    if (!activityList) return;
    activityGate.hidden = Boolean(user);
    if (!user) {
      activityList.replaceChildren();
      return;
    }
    const generator = user.role === 'generator';
    activityDescription.textContent = generator ? 'Estado de tus publicaciones.' : 'Estado de tus recojos.';
    try {
      const { items } = await api('/api/offers/mine');
      if (request !== latestActivity) return;
      activityList.replaceChildren(...items.map((offer) => offerCard(offer, pickupAction(offer))));
      if (!items.length) {
        activityList.append(el('p', { className: 'empty', text: generator ? 'Aún no tienes publicaciones.' : 'Aún no tienes recojos.' }));
      }
    } catch (error) {
      if (request !== latestActivity) return;
      activityList.replaceChildren(el('p', { className: 'status', text: error.message }));
    }
  }

  function renderForm() {
    if (!formBox) return;
    offerHint.hidden = Boolean(user);
    const active = user?.role === 'generator';
    formBox.hidden = !active;
    formBox.replaceChildren();
    if (!active) return;
    if (!catalog) {
      formBox.textContent = 'Cargando opciones para publicar…';
      return;
    }
    const material = selectField('Material', 'material', catalog.materials, { placeholder: 'Elige un material', required: true });
    const district = selectField('Distrito', 'district', catalog.districts, { placeholder: 'Elige un distrito', required: true });
    material.control.value = '';
    district.control.value = '';
    const weight = el('label', { className: 'field' }, el('span', { text: 'Peso aproximado (kg)' }),
      el('input', { type: 'number', name: 'weightKg', min: '0.01', max: '1000', step: '0.01', required: true }));
    const publish = el('button', { className: 'button', type: 'submit', text: 'Publicar material' });
    const form = el('form', { className: 'publish-form' }, material.field, district.field, weight, publish);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      publish.disabled = true;
      status.textContent = '';
      try {
        await api('/api/offers', { method: 'POST', body: Object.fromEntries(new FormData(form)) });
        form.reset();
        material.control.value = '';
        district.control.value = '';
        status.textContent = 'Tu material ya está disponible para recojo.';
        await Promise.all([refreshOffers(), refreshActivity()]);
      } catch (error) {
        status.textContent = error.message;
      } finally {
        publish.disabled = false;
      }
    });
    formBox.replaceChildren(el('h3', { text: 'Publicar material' }), form);
  }

  refreshOffers();
  if (filters) api('/api/places/filters').then((data) => {
    catalog = data;
    districtFilter = selectField('Distrito', 'offerDistrict', data.districts, { placeholder: 'Todos los distritos' });
    materialFilter = selectField('Material', 'offerMaterial', data.materials, { placeholder: 'Todos los materiales' });
    filters.replaceChildren(districtFilter.field, materialFilter.field);
    districtFilter.control.addEventListener('change', refreshOffers);
    materialFilter.control.addEventListener('change', refreshOffers);
    renderForm();
  }).catch((error) => { status.textContent = error.message; });
  return (value) => {
    user = value;
    renderForm();
    refreshOffers();
    refreshActivity();
  };
}
