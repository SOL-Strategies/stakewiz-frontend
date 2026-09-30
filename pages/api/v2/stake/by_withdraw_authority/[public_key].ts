import type { NextApiRequest, NextApiResponse } from 'next';
import { apiClient } from '../../../../../lib/api-client';
import { handleApiError } from '../../../../../lib/api-handler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const { public_key } = req.query;
  try {
    res.json(await apiClient.getStakeByWithdrawAuthority(public_key as string));
  } catch (err) {
    handleApiError(err, res);
  }
}
