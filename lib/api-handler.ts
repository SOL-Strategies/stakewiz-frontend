import type { NextApiResponse } from 'next';
import { AxiosError } from 'axios';

export function handleApiError(err: unknown, res: NextApiResponse): void {
  if (err instanceof AxiosError) {
    const status = err.response?.status ?? 500;
    const body = err.response?.data ?? {
      error: { code: 'UPSTREAM_ERROR', message: err.message },
    };
    res.status(status).json(body);
    return;
  }
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}
