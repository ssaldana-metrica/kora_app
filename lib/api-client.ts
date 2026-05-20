async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('No autenticado')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Error ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  get<T>(path: string): Promise<T> {
    return fetch(path, { headers: { 'Content-Type': 'application/json' } }).then(r =>
      handleResponse<T>(r)
    )
  },
  post<T>(path: string, body: unknown): Promise<T> {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => handleResponse<T>(r))
  },
  put<T>(path: string, body: unknown): Promise<T> {
    return fetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => handleResponse<T>(r))
  },
  delete<T>(path: string): Promise<T> {
    return fetch(path, { method: 'DELETE' }).then(r => handleResponse<T>(r))
  },
}
