import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';

const DEFAULT_QVICK_API_BASE_URL = 'https://devapi.qvick.xyz';
const AUTH_TIMEOUT_MS = 5_000;

export type QvickRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'MANAGER';

export interface AuthenticatedUser {
  name: string;
  email: string;
  roles: QvickRole[];
}

type AuthorizationResult =
  | { authorized: true; user: AuthenticatedUser }
  | { authorized: false; response: HttpResponseInit };

function jsonResponse(status: number, message: string): HttpResponseInit {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: message }),
  };
}

function getApiBaseUrl(): string {
  return (process.env.QVICK_API_BASE_URL || DEFAULT_QVICK_API_BASE_URL).replace(/\/$/, '');
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (!value || typeof value !== 'object') return false;

  const user = value as Partial<AuthenticatedUser>;
  return (
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    Array.isArray(user.roles) &&
    user.roles.every((role) => typeof role === 'string')
  );
}

export async function requireRoles(
  request: HttpRequest,
  allowedRoles: readonly QvickRole[],
  context: InvocationContext,
): Promise<AuthorizationResult> {
  const authorization = request.headers.get('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return {
      authorized: false,
      response: jsonResponse(401, '로그인이 필요합니다.'),
    };
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/users/my`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });

    if (response.status === 401 || response.status === 403) {
      return {
        authorized: false,
        response: jsonResponse(401, '인증 정보가 유효하지 않습니다.'),
      };
    }

    if (!response.ok) {
      context.error(`인증 서버 응답 오류: ${response.status}`);
      return {
        authorized: false,
        response: jsonResponse(503, '인증 서버에 연결할 수 없습니다.'),
      };
    }

    const user: unknown = await response.json();
    if (!isAuthenticatedUser(user)) {
      context.error('인증 서버가 올바르지 않은 사용자 정보를 반환했습니다.');
      return {
        authorized: false,
        response: jsonResponse(503, '사용자 정보를 확인할 수 없습니다.'),
      };
    }

    if (!user.roles.some((role) => allowedRoles.includes(role))) {
      return {
        authorized: false,
        response: jsonResponse(403, '요청을 수행할 권한이 없습니다.'),
      };
    }

    return { authorized: true, user };
  } catch (error) {
    context.error('인증 서버 요청 실패:', error);
    return {
      authorized: false,
      response: jsonResponse(503, '인증 서버에 연결할 수 없습니다.'),
    };
  }
}
