import type { NextApiRequest, NextApiResponse } from 'next';
import { apiClient } from '../../../../../lib/api-client';
import { handleApiError } from '../../../../../lib/api-handler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const { vote_identity } = req.query;
  try {
    res.json(await apiClient.getValidatorCommissionHistory(vote_identity as string));
  } catch (err) {
    handleApiError(err, res);
  }
}
