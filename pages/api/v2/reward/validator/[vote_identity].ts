import type { NextApiRequest, NextApiResponse } from 'next';
import { apiClient } from '../../../../../lib/api-client';
import { handleApiError } from '../../../../../lib/api-handler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const { vote_identity, since_epoch } = req.query;

  if (!since_epoch) {
    return res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'since_epoch is required' } });
  }
  const sinceEpoch = parseInt(since_epoch as string, 10);
  if (isNaN(sinceEpoch) || sinceEpoch < 0) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'since_epoch must be a non-negative integer' } });
  }

  try {
    res.json(await apiClient.getValidatorRewards(vote_identity as string, sinceEpoch));
  } catch (err) {
    handleApiError(err, res);
  }
}
