import { api, el } from './ui.js';

function placeCard(place) {
  return el('article', { className: 'card' },
    el('p', { className: 'district', text: place.district }),
    el('h3', { text: place.name }),
  );
}

export async function initPlaces() {
  const list = document.querySelector('#places');
  const status = document.querySelector('#place-status');
  status.textContent = 'Cargando puntos de acopio…';
  try {
    const { items } = await api('/api/places');
    status.textContent = items.length ? items.length + ' puntos encontrados' : 'No hay puntos de acopio.';
    list.replaceChildren(...items.map(placeCard));
  } catch (error) {
    status.textContent = error.message;
  }
}
