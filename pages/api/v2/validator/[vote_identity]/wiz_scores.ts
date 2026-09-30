import type { NextApiRequest, NextApiResponse } from 'next';
import { apiClient } from '../../../../../lib/api-client';
import { handleApiError } from '../../../../../lib/api-handler';
import type { OrderDirection } from '../../../../../lib/api-types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const { vote_identity, sort, order, limit } = req.query;
  try {
    res.json(await apiClient.getValidatorWizScores(vote_identity as string, {
      sort: sort as 'created_at' | 'wiz_score' | 'avg_wiz_score' | 'score_version' | undefined,
      order: order as OrderDirection | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    }));
  } catch (err) {
    handleApiError(err, res);
  }
}
