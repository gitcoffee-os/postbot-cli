import { IamApiError } from '@gitcoffee/postbot-sdk';

/** 错误归类（对应后端分级错误码前缀，见 IAM ERROR_CODE.md） */
export type ErrorKind = 'developer' | 'user' | 'delegation' | 'auth' | 'other';

export interface ClassifiedError {
  /** 原始错误消息 */
  message: string;
  /** 业务码（分级码 / 粗码 / 数值码），无法提取时为 '' */
  code: string;
  kind: ErrorKind;
}

/**
 * 从错误对象提取业务码并归类。
 * 兼容 {@link IamApiError}（携带 code）与任意错误对象。
 */
export function classifyError(error: unknown): ClassifiedError {
  const e = error as { code?: unknown; message?: string } | null | undefined;
  const rawCode = e?.code;
  const message = e?.message ?? String(error);
  const code = rawCode === undefined || rawCode === null ? '' : String(rawCode);

  if (code.startsWith('DEVELOPER.')) return { message, code, kind: 'developer' };
  if (code.startsWith('USER.')) return { message, code, kind: 'user' };
  if (code.startsWith('DELEGATION.')) return { message, code, kind: 'delegation' };
  if (code === 'NOT_LOGIN' || code === 'LOGIN_EXPIRED' || code === 'ACCESS_DENIED' || code === 'LOGIN_FAILURE') {
    return { message, code, kind: 'auth' };
  }
  return { message, code, kind: 'other' };
}

/** 针对 token 失效场景的修复建议（非 token 错误返回空串） */
export function tokenHint(error: unknown): string {
  switch (classifyError(error).kind) {
    case 'developer':
      return '开发者应用凭证已失效，请检查 clientId / clientSecret 配置';
    case 'user':
    case 'auth':
      return '登录已失效，请重新运行: postbot login';
    case 'delegation':
      return '委托令牌已失效，请重新登录后重试';
    default:
      return '';
  }
}

/** 是否为 IamApiError（可用于精确判断是否携带业务码） */
export function isIamApiError(error: unknown): error is IamApiError {
  return error instanceof IamApiError;
}
