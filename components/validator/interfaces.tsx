import { Connection } from "@solana/web3.js";

export interface validatorI {
    identity: string;
    vote_identity: string;
    last_vote: number;
    root_slot: number;
    credits: number;
    epoch_credits: number;
    activated_stake: number;
    version: string;
    delinquent: boolean;
    skip_rate: number;
    wiz_skip_rate: number;
    // Validator client as reported by the node, e.g. 'AgaveBam'; 'Not reported' or 'Unknown' when absent
    client?: string | null;
    block_production: number | null;
    block_production_p10: number | null;
    block_production_median: number | null;
    block_production_p90: number | null;
    created_at: string;
    updated_at: string;
    oldest_active_stake_pubkey: string;
    first_epoch_with_stake: number;
    name: string;
    keybase: string;
    description: string;
    info_pubkey: string;
    website: string;
    commission: number;
    image: string;
    gossip_ip: string;
    mod: boolean;
    is_jito: boolean;
    jito_commission_bps: number;
    admin_comment: string|null;
    ip_latitude: string;
    ip_longitude: string;
    ip_city: string;
    ip_country: string;
    ip_asn: string;
    ip_org: string;
    withdraw_authority: string;
    wiz_score_id: number;
    ignore: boolean;
    vote_success: number;
    vote_success_score: number;
    voting_success: number | null;
    voting_success_score: number;
    inclusion_success: number | null;
    inclusion_success_score: number;
    skip_rate_score: number;
    info_score: number;
    commission_score: number;
    // Wiz score components added for score version 84 (score fields are Wiz points in percent; tips in SOL)
    mev_tips_per_block?: number | null;
    mev_benchmark?: number | null;
    mev_score?: number;
    mev_ignored?: boolean;
    wiz_fee_capture_index?: number | null;
    fee_capture_benchmark?: number | null;
    fee_capture_score?: number;
    fee_capture_ignored?: boolean;
    wizscore_commission: number;
    first_epoch_distance: number;
    epoch_distance_score: number;
    stake_weight: number;
    above_halt_line: boolean;
    stake_weight_score: number;
    withdraw_authority_score: number;
    asn: string;
    asn_concentration: number;
    asn_concentration_score: number;
    tpu_ip: string;
    tpu_ip_concentration: number;
    tpu_ip_concentration_score: number;
    uptime: number;
    uptime_score: number;
    wiz_score: number;
    version_valid: boolean;
    city_concentration: number;
    city_concentration_score: number;
    invalid_version_score: number;
    superminority_penalty: number;
    score_version: number;
    no_voting_override: boolean;
    epoch: number;
    epoch_slot_height: number;
    asncity_concentration: number;
    asncity_concentration_score: number;
    stake_ratio: number;
    /** @deprecated always null; use vote_success */
    credit_ratio: null;
    /** @deprecated always null; use staking_apy */
    apy_estimate: null;
    rank: number;
    updateTitle: Function;
    userPubkey: string;
    solflareEnabled: boolean;
    skip_rate_ignored: boolean;
    staking_apy: number;
    jito_apy?: number;
    total_apy: number;
    bls_pubkey: string;
};

// /wiz_score weightings for the active score version; absent keys mean 0 or the default
export interface WizWeightingsI {
    score_version: number;
    vote_success_weight?: number;
    vote_success_cutoff?: number;
    voting_success_weight?: number;
    inclusion_success_weight?: number;
    skip_rate_weight: number;
    skip_rate_min_stake: number;
    skip_rate_cutoff_multiplier: number;
    // 'rpc' (default), 'blocks' or 'block_production'
    skip_rate_source?: string;
    skip_rate_cutoff_floor?: number;
    skip_rate_min_slots?: number;
    mev_weight?: number;
    mev_min_blocks?: number;
    mev_min_validators?: number;
    commission_weight: number;
    max_commission: number;
    info_weight: number;
    epoch_distance_max: number;
    epoch_distance_weight: number;
    stake_weight_threshold: number;
    stake_weight_weight: number;
    uptime_weight: number;
    uptime_cutoff: number;
    min_versions: string[];
    invalid_version_penalty: number;
    withdraw_authority_penalty: number;
    asn_concentration_weight: number;
    city_concentration_weight: number;
    asn_city_concentration_weight: number;
    tpu_ip_concentration_weight: number;
    superminority_penalty: number;
}

export interface clusterStatsI {
    avg_credit_ratio: number;
    avg_activated_stake: number;
    median_stake: number;
    avg_commission: number;
    avg_skip_rate: number;
    avg_apy: number;
    // Percent spread across validators with a value this epoch (absent until the API deploys it)
    vote_success?: PercentilesI | null;
    voting_success?: PercentilesI | null;
    inclusion_success?: PercentilesI | null;
    // Current epoch to date (fractions); null briefly at the start of an epoch
    block_stats?: ClusterBlockStatsI | null;
    // Network split by validator client and by version; activated_stake in lamports, percentages in percent
    clients?: ClientShareI[];
    versions?: VersionShareI[];
};

export interface NetworkShareI {
    validators: number;
    validators_pct: number;
    activated_stake: number;
    stake_pct: number;
}

export interface ClientShareI extends NetworkShareI {
    client: string;
}

export interface VersionShareI extends NetworkShareI {
    version: string;
}

export interface ValidatorBoxPropsI {
    validator: validatorI;
    clusterStats: clusterStatsI;
    showWizModal: Function;
    showAlertModal: Function;
    connected: boolean;
    index: number;
    updateStakeValidators: Function;
    isStakeValidator: boolean;
    showListView: boolean;
}

export interface ValidatorListI {
    clusterStats: clusterStatsI;
    validators: [validatorI];
    updateWizModal: Function;
    updateAlertModal: Function;
    listSize: number;
    showWizModal: boolean;
    wizValidator: validatorI;
    alertValidator: validatorI;
    showAlertModal: boolean;
    showMultiStakeModal: boolean;
    updateMultiStakeModal: Function;
    userPubkey: string;
    solflareEnabled: boolean;
    connection: Connection;
    connected: boolean;
    updateStakeValidators: Function;
    clearStakeValidators: Function;
    stakeValidators: [validatorI];
    laine: validatorI;
    showListView: boolean;
}

export interface ValidatorListingI {
    state: {
        validators: [validatorI],
        clusterStats: clusterStatsI,
        filteredValidators: [validatorI],
        stakeValidators: [validatorI],
        hasData: boolean,
        visibleCount: number,
        showWizModal: boolean,
        wizValidator: validatorI,
        showAlertModal: boolean,
        alertValidator: validatorI,
        stakeValidator: validatorI,
        showStakeModal: boolean,
        walletValidators: [string],
        solflareNotificationsEnabled: boolean,
        showMultiStakeModal: boolean,
        laine: validatorI,
        showListView: boolean
      },
    updateState: Function;
    userPubkey: string;
    connection: Connection;
    connected: boolean;
}

export interface validatorDetailI {
    vote_identity: string;
    updateTitle: Function;
    userPubkey: string;
    solflareEnabled: boolean;
    connection: Connection;
    connected: boolean;
}

export interface EpochInfoI {
    epoch: number;
    duration_seconds: number;
    epochs_per_year: number;
    slot_height: number;
    start_slot: number;
    start_time: string;
    remaining_seconds: number;
    elapsed_seconds: number;
}
// Block stats ratios are fractions (0-1) and amounts are lamports
export interface BlockStatsI {
    epoch: number;
    leader_slots: number;
    blocks_produced: number;
    skipped_slots: number;
    skip_rate: number;
    fee_total: number;
    fee_base_total: number;
    fee_priority_total: number;
    leader_reward_lamports: number;
    fee_per_block: number;
    fee_per_cu: number;
    priority_fee_per_cu: number;
    tips_lamports: number;
    tip_blocks: number;
    tips_per_block: number;
    cu_total: number;
    cu_per_block: number;
    cost_units_per_block: number;
    fullness: number;
    full_blocks: number;
    full_block_share: number;
    tx_count: number;
    txs_per_block: number;
    failed_tx_share: number;
    final: boolean;
}

export interface ValidatorBlockStatsI extends BlockStatsI {
    identity: string;
    block_production: number | null;
    fullness_p90: number;
    cost_units_p90: number;
    fee_capture_index: number | null;
    value_capture_index: number | null;
}

export interface PercentilesI {
    p10: number;
    median: number;
    p90: number;
}

export interface ClusterBlockStatsI extends BlockStatsI {
    validators: number;
    validator_fee_per_cu: PercentilesI | null;
    validator_fee_capture_index: PercentilesI | null;
    validator_skip_rate: PercentilesI | null;
    validator_block_production: PercentilesI | null;
}

// /validator_blocks: recent leader slots, newest first. Amounts in lamports, ratios as fractions
export interface ValidatorBlockI {
    slot: number;
    epoch: number;
    identity: string;
    skipped: boolean;
    block_time: number | null;
    // Fee capture vs the epoch p90 benchmark, capped at 1; 0 when skipped, null before the epoch has a benchmark
    block_production_score: number | null;
    tx_count?: number;
    tx_vote_count?: number;
    tx_failed_count?: number;
    tx_with_priority_fee_count?: number;
    cu_total?: number;
    cost_units_total?: number;
    fullness?: number | null;
    fee_total?: number;
    fee_base_total?: number;
    fee_priority_total?: number;
    priority_fee_median?: number | null;
    tips_lamports?: number | null;
    tip_tx_count?: number | null;
    leader_reward_lamports?: number;
    fee_capture_index?: number | null;
    value_capture_index?: number | null;
}

export interface ValidatorBlocksSummaryI {
    leader_slots: number;
    blocks_produced: number;
    skipped_slots: number;
    skip_rate: number | null;
    first_slot: number | null;
    last_slot: number | null;
    fee_total: number;
    tips_lamports: number;
    leader_reward_lamports: number;
    fee_per_block: number | null;
    tx_count: number;
    txs_per_block: number | null;
    failed_tx_share: number | null;
    fullness: number | null;
    fee_capture_index: number | null;
    value_capture_index: number | null;
    // Over the returned slots only: skip-rate score × score of the median block
    block_production_score: number | null;
}

export interface ValidatorBlocksI {
    blocks: ValidatorBlockI[];
    summary: ValidatorBlocksSummaryI;
}
