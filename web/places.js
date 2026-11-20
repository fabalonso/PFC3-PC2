import { api, el, selectField } from './ui.js';

function placeCard(place) {
  const content = el('div', { className: 'detail-content' });
  const detail = el('details', {},
    el('summary', { text: 'Ver horarios y materiales' }),
    content,
  );
  let loaded = false;
  let loading = false;
  detail.addEventListener('toggle', async () => {
    if (!detail.open || loaded || loading) return;
    loading = true;
    content.textContent = 'Cargando ficha…';
    try {
      const { item } = await api('/api/places/' + place.id);
      content.replaceChildren(
        el('p', { text: item.schedule }),
        el('ul', { className: 'tags', 'aria-label': 'Materiales aceptados' },
          ...item.materials.map((material) => el('li', { text: material }))),
      );
      loaded = true;
    } catch (error) {
      content.textContent = error.message;
    } finally {
      loading = false;
    }
  });
  return el('article', { className: 'card' },
    el('p', { className: 'district', text: place.district }),
    el('h3', { text: place.name }),
    detail,
  );
}

export async function initPlaces() {
  const filters = document.querySelector('#place-filters');
  const list = document.querySelector('#places');
  const status = document.querySelector('#place-status');
  status.textContent = 'Cargando puntos de acopio…';
  try {
    const { districts } = await api('/api/places/filters');
    const district = selectField('Distrito', 'district', districts, { placeholder: 'Todos los distritos' });
    filters.replaceChildren(district.field);
    let latest = 0;
    async function refresh() {
      const request = ++latest;
      const query = new URLSearchParams();
      if (district.control.value) query.set('district', district.control.value);
      status.textContent = 'Buscando puntos de acopio…';
      try {
        const { items } = await api('/api/places?' + query);
        if (request !== latest) return;
        list.replaceChildren(...items.map(placeCard));
        status.textContent = items.length ? items.length + ' puntos encontrados' : 'No hay coincidencias para este distrito.';
      } catch (error) {
        if (request !== latest) return;
        list.replaceChildren();
        status.textContent = error.message;
      }
    }
    district.control.addEventListener('change', refresh);
    await refresh();
  } catch (error) {
    status.textContent = error.message;
  }
}
