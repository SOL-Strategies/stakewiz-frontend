export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

export interface ClusterStats {
  avg_credit_ratio: number | null;
  avg_activated_stake_lamports: number | null;
  median_stake_lamports: number | null;
  avg_commission: number | null;
  avg_skip_rate: number | null;
  avg_apy: number | null;
}

export interface EpochInfo {
  epoch: number;
  start_slot: number | null;
  start_time: string | null;
  slot_height: number | null;
  duration_seconds: number | null;
  elapsed_seconds: number | null;
  remaining_seconds: number | null;
  epochs_per_year: number | null;
}

export interface EpochRecord {
  epoch: number;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number | null;
}

export type ValidatorSortField =
  | 'wiz_score'
  | 'activated_stake'
  | 'vote_success'
  | 'skip_rate'
  | 'commission'
  | 'name'
  | 'vote_identity'
  | 'updated_at';

export type OrderDirection = 'asc' | 'desc';

export interface ValidatorListResponse {
  data: Record<string, unknown>[];
  next_cursor: string | null;
}

export interface Delinquency {
  date: string;
  delinquent_minutes: number;
}

export interface VoteSuccessPoint {
  vote_success: number;
  created_at: string;
}

export interface SkipRatePoint {
  skip_rate: number;
  created_at: string;
}

export interface LogEntry {
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface CommissionHistoryEntry {
  commission: number;
  observed_at: string;
}

export interface JitoCommissionHistoryEntry {
  commission_bps: number | null;
  observed_at: string;
}

export interface WizScorePoint {
  wiz_score: number | null;
  avg_wiz_score: number | null;
  created_at: string;
  score_version: number | null;
}

export interface EpochStakes {
  epoch: number;
  activating_stake_lamports: string;
  activating_count: number;
  deactivating_stake_lamports: string;
  deactivating_count: number;
}

export interface StakeAccount {
  pubkey: string;
  delegated_amount_lamports: number | null;
  activation_epoch: number | null;
  deactivation_epoch: number | null;
}

export interface EpochStakeAccountsGroup {
  amount_lamports: number;
  count: number;
  stake_accounts: StakeAccount[];
}

export interface EpochStakeAccounts {
  epoch: number;
  activating: EpochStakeAccountsGroup;
  deactivating: EpochStakeAccountsGroup;
}

export interface ValidatorReward {
  epoch: number;
  percentage: number | null;
  apr: number | null;
  commission: number | null;
  true_percentage: number | null;
  apy: number | null;
}

export type ValidatorStakesSortField =
  | 'pubkey'
  | 'delegated_to'
  | 'balance'
  | 'credits_observed'
  | 'delegated_stake'
  | 'activation_epoch'
  | 'deactivation_epoch'
  | 'iteration'
  | 'rent_exempt_reserve'
  | 'stake_authority'
  | 'withdraw_authority'
  | 'created_at';
