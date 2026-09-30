import axios, { AxiosInstance } from 'axios';
import type {
  ClusterStats,
  EpochInfo,
  EpochRecord,
  ValidatorListResponse,
  ValidatorSortField,
  ValidatorStakesSortField,
  OrderDirection,
  Delinquency,
  VoteSuccessPoint,
  SkipRatePoint,
  LogEntry,
  CommissionHistoryEntry,
  JitoCommissionHistoryEntry,
  WizScorePoint,
  EpochStakes,
  EpochStakeAccounts,
  ValidatorReward,
} from './api-types';

const API_BASE = process.env.STAKEWIZ_API_BASE ?? 'https://staging-api.stakewiz.com';
const API_TOKEN = process.env.STAKEWIZ_API_TOKEN ?? '';

class StakewizApiClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: `${API_BASE}/v2`,
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
      },
    });
  }

  async getClusterStats(): Promise<ClusterStats> {
    const { data } = await this.http.get<ClusterStats>('/cluster_stats');
    return data;
  }

  async getWizScore(): Promise<Record<string, unknown>> {
    const { data } = await this.http.get<Record<string, unknown>>('/wiz_score');
    return data;
  }

  async getEpochInfo(): Promise<EpochInfo> {
    const { data } = await this.http.get<EpochInfo>('/epoch/info');
    return data;
  }

  async getEpochHistory(): Promise<EpochRecord[]> {
    const { data } = await this.http.get<EpochRecord[]>('/epoch/history');
    return data;
  }

  async getEpoch(epoch: number): Promise<EpochRecord> {
    const { data } = await this.http.get<EpochRecord>(`/epoch/${epoch}`);
    return data;
  }

  async getValidators(params: {
    sort?: ValidatorSortField;
    order?: OrderDirection;
    limit?: number;
    cursor?: string;
  } = {}): Promise<ValidatorListResponse> {
    const { data } = await this.http.get<ValidatorListResponse>('/validators/', { params });
    return data;
  }

  async getValidator(voteIdentity: string): Promise<Record<string, unknown>> {
    const { data } = await this.http.get<Record<string, unknown>>(`/validator/${voteIdentity}`);
    return data;
  }

  async getValidatorDelinquencies(
    voteIdentity: string,
    params: {
      sort?: 'date' | 'delinquent_minutes';
      order?: OrderDirection;
      limit?: number;
    } = {},
  ): Promise<Delinquency[]> {
    const { data } = await this.http.get<Delinquency[]>(
      `/validator/${voteIdentity}/delinquencies`,
      { params },
    );
    return data;
  }

  async getValidatorVoteSuccess(
    voteIdentity: string,
    params: {
      sort?: 'created_at' | 'vote_success';
      order?: OrderDirection;
      limit?: number;
    } = {},
  ): Promise<VoteSuccessPoint[]> {
    const { data } = await this.http.get<VoteSuccessPoint[]>(
      `/validator/${voteIdentity}/vote_success`,
      { params },
    );
    return data;
  }

  async getValidatorSkipRate(
    voteIdentity: string,
    params: {
      sort?: 'created_at' | 'skip_rate';
      order?: OrderDirection;
      limit?: number;
    } = {},
  ): Promise<SkipRatePoint[]> {
    const { data } = await this.http.get<SkipRatePoint[]>(
      `/validator/${voteIdentity}/skip_rate`,
      { params },
    );
    return data;
  }

  async getValidatorLog(
    voteIdentity: string,
    params: {
      sort?: 'created_at';
      order?: OrderDirection;
      limit?: number;
    } = {},
  ): Promise<LogEntry[]> {
    const { data } = await this.http.get<LogEntry[]>(
      `/validator/${voteIdentity}/log`,
      { params },
    );
    return data;
  }

  async getValidatorCommissionHistory(voteIdentity: string): Promise<CommissionHistoryEntry[]> {
    const { data } = await this.http.get<CommissionHistoryEntry[]>(
      `/validator/${voteIdentity}/commission_history`,
    );
    return data;
  }

  async getValidatorJitoCommissionHistory(voteIdentity: string): Promise<JitoCommissionHistoryEntry[]> {
    const { data } = await this.http.get<JitoCommissionHistoryEntry[]>(
      `/validator/${voteIdentity}/jito_commission_history`,
    );
    return data;
  }

  async getValidatorWizScores(
    voteIdentity: string,
    params: {
      sort?: 'created_at' | 'wiz_score' | 'avg_wiz_score' | 'score_version';
      order?: OrderDirection;
      limit?: number;
    } = {},
  ): Promise<WizScorePoint[]> {
    const { data } = await this.http.get<WizScorePoint[]>(
      `/validator/${voteIdentity}/wiz_scores`,
      { params },
    );
    return data;
  }

  async getValidatorStakes(
    voteIdentity: string,
    params: {
      sort?: ValidatorStakesSortField;
      order?: OrderDirection;
      limit?: number;
    } = {},
  ): Promise<Record<string, unknown>[]> {
    const { data } = await this.http.get<Record<string, unknown>[]>(
      `/validator/${voteIdentity}/stakes`,
      { params },
    );
    return data;
  }

  async getValidatorEpochStakes(voteIdentity: string): Promise<EpochStakes> {
    const { data } = await this.http.get<EpochStakes>(
      `/validator/${voteIdentity}/epoch_stakes`,
    );
    return data;
  }

  async getValidatorEpochStakeAccounts(voteIdentity: string): Promise<EpochStakeAccounts> {
    const { data } = await this.http.get<EpochStakeAccounts>(
      `/validator/${voteIdentity}/epoch_stake_accounts`,
    );
    return data;
  }

  async getStakeByWithdrawAuthority(publicKey: string): Promise<string[]> {
    const { data } = await this.http.get<string[]>(
      `/stake/by_withdraw_authority/${publicKey}`,
    );
    return data;
  }

  async getValidatorRewards(voteIdentity: string, sinceEpoch: number): Promise<ValidatorReward[]> {
    const { data } = await this.http.get<ValidatorReward[]>(
      `/reward/validator/${voteIdentity}`,
      { params: { since_epoch: sinceEpoch } },
    );
    return data;
  }

  async health(): Promise<unknown> {
    const { data } = await this.http.get('/health');
    return data;
  }
}

export const apiClient = new StakewizApiClient();
