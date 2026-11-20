import { api, el, selectField } from './ui.js';

function hasCoordinates(place) {
  return Number.isFinite(place.latitude) && Number.isFinite(place.longitude);
}

function placeCard(place, showMap) {
  const content = el('div', { className: 'detail-content' });
  const detail = el('details', {}, el('summary', { text: 'Horarios y materiales' }), content);
  let state = 'idle';

  detail.addEventListener('toggle', async () => {
    if (!detail.open || state !== 'idle') return;
    state = 'loading';
    content.textContent = 'Cargando ficha…';
    try {
      const { item } = await api('/api/places/' + place.id);
      content.replaceChildren(
        el('p', { className: 'place-address', text: item.address }),
        el('p', { text: item.schedule }),
        el('ul', { className: 'tags', 'aria-label': 'Materiales aceptados' },
          ...item.materials.map((material) => el('li', { text: material }))),
      );
      state = 'ready';
    } catch (error) {
      state = 'idle';
      content.textContent = error.message;
    }
  });

  const mapButton = el('button', {
    type: 'button', className: 'text-link map-button', text: 'Ver en el mapa',
    'data-place-id': place.id, 'aria-controls': 'map-panel', 'aria-pressed': 'false',
    disabled: !hasCoordinates(place),
  });
  mapButton.addEventListener('click', () => showMap(place, true));
  return el('article', { className: 'card place-card' },
    el('p', { className: 'district', text: place.district }),
    el('h3', { text: place.name }),
    el('div', { className: 'place-actions' }, detail, mapButton),
  );
}

export async function initPlaces() {
  const filters = document.querySelector('#place-filters');
  const list = document.querySelector('#places');
  const status = document.querySelector('#place-status');
  const map = document.querySelector('#place-map');
  const mapPanel = document.querySelector('#map-panel');
  const mapTitle = document.querySelector('#map-title');
  const mapCaption = document.querySelector('#map-caption');
  const empty = document.querySelector('#map-empty');
  let selectedId = null;

  function showMap(place, reveal = false) {
    for (const button of list.querySelectorAll('[data-place-id]')) {
      button.setAttribute('aria-pressed', String(button.dataset.placeId === String(place?.id)));
    }

    if (!place || !hasCoordinates(place)) {
      selectedId = null;
      map.hidden = true;
      map.removeAttribute('src');
      empty.hidden = false;
      mapTitle.textContent = 'Mapa de acopio';
      mapCaption.textContent = 'Selecciona un punto para ver su ubicación de referencia.';
      return;
    }
    if (selectedId !== place.id) {
      const { latitude: lat, longitude: lon } = place;
      const mapUrl = new URL('https://www.openstreetmap.org/export/embed.html');
      mapUrl.search = new URLSearchParams({
        bbox: [lon - 0.011, lat - 0.009, lon + 0.011, lat + 0.009].map((value) => value.toFixed(5)).join(','),
        layer: 'mapnik',
        marker: lat + ',' + lon,
      });
      map.src = mapUrl.href;
      map.title = 'Ubicación de referencia de ' + place.name;
      mapTitle.textContent = place.name;
      mapCaption.textContent = 'Ubicación de referencia · ' + place.district;
      map.hidden = false;
      empty.hidden = true;
      selectedId = place.id;
    }
    if (reveal && window.matchMedia('(max-width: 860px)').matches) {
      mapPanel.scrollIntoView({ block: 'start' });
      mapTitle.focus({ preventScroll: true });
    }
  }

  try {
    const { districts, materials } = await api('/api/places/filters');
    const district = selectField('Distrito', 'district', districts, { placeholder: 'Todos los distritos' });
    const material = selectField('Material', 'material', materials, { placeholder: 'Todos los materiales' });
    filters.replaceChildren(district.field, material.field);
    let latest = 0;
    async function refresh() {
      const request = ++latest;
      const query = new URLSearchParams();
      if (district.control.value) query.set('district', district.control.value);
      if (material.control.value) query.set('material', material.control.value);
      status.textContent = 'Buscando puntos de acopio…';
      try {
        const { items } = await api('/api/places?' + query);
        if (request !== latest) return;
        list.replaceChildren(...items.map((place) => placeCard(place, showMap)));
        const selected = items.find(({ id }) => id === selectedId) ?? items.find(hasCoordinates);
        showMap(selected);
        status.textContent = items.length === 1 ? '1 punto encontrado' : items.length > 1
          ? items.length + ' puntos encontrados' : 'No hay puntos que coincidan con los filtros.';
      } catch (error) {
        if (request !== latest) return;
        list.replaceChildren();
        showMap(null);
        status.textContent = error.message;
      }
    }

    district.control.addEventListener('change', refresh);
    material.control.addEventListener('change', refresh);
    await refresh();
  } catch (error) {
    status.textContent = error.message;
  }
}
