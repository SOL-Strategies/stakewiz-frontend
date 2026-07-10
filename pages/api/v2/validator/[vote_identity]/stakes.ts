import type { NextApiRequest, NextApiResponse } from 'next';
import { apiClient } from '../../../../../lib/api-client';
import { handleApiError } from '../../../../../lib/api-handler';
import type { OrderDirection, ValidatorStakesSortField } from '../../../../../lib/api-types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const { vote_identity, sort, order, limit } = req.query;
  try {
    res.json(await apiClient.getValidatorStakes(vote_identity as string, {
      sort: sort as ValidatorStakesSortField | undefined,
      order: order as OrderDirection | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    }));
  } catch (err) {
    handleApiError(err, res);
  }
}
