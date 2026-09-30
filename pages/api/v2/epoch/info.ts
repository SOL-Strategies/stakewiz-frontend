import type { NextApiRequest, NextApiResponse } from 'next';
import { apiClient } from '../../../../lib/api-client';
import { handleApiError } from '../../../../lib/api-handler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    res.json(await apiClient.getEpochInfo());
  } catch (err) {
    handleApiError(err, res);
  }
}
