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
  const status = document.querySelector('#offer-status');
  let user = null;
  let catalog = null;
  const list = document.querySelector('#offer-list');
  let latest = 0;

  async function refreshOffers() {
    const request = ++latest;
    try {
      const { items } = await api('/api/offers');
      if (request !== latest) return;
      list.replaceChildren(...items.map((offer) => offerCard(offer)));
      if (!items.length) list.append(el('p', { className: 'empty', text: 'Todavía no hay material disponible.' }));
    } catch (error) {
      if (request !== latest) return;
      list.replaceChildren();
      status.textContent = error.message;
    }
  }

  function renderForm() {
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
        await refreshOffers();
      } catch (error) {
        status.textContent = error.message;
      } finally {
        publish.disabled = false;
      }
    });
    formBox.replaceChildren(el('h3', { text: 'Publicar material' }), form);
  }

  refreshOffers();
  api('/api/places/filters').then((data) => {
    catalog = data;
    renderForm();
  }).catch((error) => { status.textContent = error.message; });
  return (value) => {
    user = value;
    renderForm();
  };
}
