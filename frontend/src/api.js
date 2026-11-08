export const tok = {
  get: () => localStorage.getItem('fe_token'),
  set: (t) => (t ? localStorage.setItem('fe_token', t) : localStorage.removeItem('fe_token')),
};

export async function upload(path, formData) {
  const res = await fetch('/api' + path, { method: 'POST', headers: tok.get() ? { Authorization: 'Bearer ' + tok.get() } : {}, body: formData });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.message || 'Conversion failed');
  }
  return res.blob();
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (tok.get()) headers.Authorization = 'Bearer ' + tok.get();
  const res = await fetch('/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Something went wrong');
  return data;
}
