import type { NextApiRequest, NextApiResponse } from 'next';
import { apiClient } from '../../../../lib/api-client';
import { handleApiError } from '../../../../lib/api-handler';
import type { ValidatorSortField, OrderDirection } from '../../../../lib/api-types';

const VALID_SORT: ValidatorSortField[] = [
  'wiz_score', 'activated_stake', 'vote_success', 'skip_rate',
  'commission', 'name', 'vote_identity', 'updated_at',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { sort, order, limit, cursor } = req.query;

  if (sort && !VALID_SORT.includes(sort as ValidatorSortField)) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: `sort must be one of: ${VALID_SORT.join(', ')}` } });
  }
  if (order && order !== 'asc' && order !== 'desc') {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'order must be asc or desc' } });
  }

  try {
    res.json(await apiClient.getValidators({
      sort: sort as ValidatorSortField | undefined,
      order: order as OrderDirection | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      cursor: cursor as string | undefined,
    }));
  } catch (err) {
    handleApiError(err, res);
  }
}
