export function el(tag, { className, text, ...attributes } = {}, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== false) node.setAttribute(name, value === true ? '' : value);
  }
  node.append(...children);
  return node;
}

export async function api(path, options = {}) {
  const { method = 'GET', body } = options;
  const headers = body === undefined ? undefined : { 'Content-Type': 'application/json' };
  const response = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (response.status === 204) return {};
  const result = response.headers.get('content-type')?.includes('application/json')
    ? await response.json().catch(() => null) : null;
  if (!response.ok || !result) {
    throw new Error(result?.error ?? 'El servicio no está disponible en este momento.');
  }
  return result;
}

export function selectField(label, name, options, { placeholder = 'Todos', required = false } = {}) {
  const control = el('select', { name, required },
    el('option', { value: '', text: placeholder, disabled: required }),
    ...options.map((option) => el('option', { value: option, text: option })),
  );
  const field = el('label', { className: 'field' }, el('span', { text: label }), control);
  return { field, control };
}
