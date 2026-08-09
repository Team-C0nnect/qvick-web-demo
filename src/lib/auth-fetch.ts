import { clearAuthTokens, refreshAccessToken } from './api-client';

function withAccessToken(init: RequestInit, accessToken: string | null): RequestInit {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  return { ...init, headers };
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(
    input,
    withAccessToken(init, localStorage.getItem('accessToken')),
  );

  if (response.status !== 401) return response;

  try {
    const accessToken = await refreshAccessToken();
    return fetch(input, withAccessToken(init, accessToken));
  } catch {
    clearAuthTokens();
    window.location.href = '/login';
    return response;
  }
}
