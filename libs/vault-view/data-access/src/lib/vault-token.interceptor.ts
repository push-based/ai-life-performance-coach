import type { HttpInterceptorFn } from '@angular/common/http';

export function readVaultToken(doc: Document = document): string | null {
  return (
    doc
      .querySelector<HTMLMetaElement>('meta[name="vault-token"]')
      ?.getAttribute('content') ?? null
  );
}

export const vaultTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next(req);
  const token = readVaultToken();
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { 'x-vault-token': token } }));
};
