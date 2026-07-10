import type { NextApiRequest, NextApiResponse } from 'next';
import { apiClient } from '../../../../lib/api-client';
import { handleApiError } from '../../../../lib/api-handler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const epoch = parseInt(req.query.epoch as string, 10);
  if (isNaN(epoch) || epoch < 0) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'epoch must be a non-negative integer' } });
  }
  try {
    res.json(await apiClient.getEpoch(epoch));
  } catch (err) {
    handleApiError(err, res);
  }
}
