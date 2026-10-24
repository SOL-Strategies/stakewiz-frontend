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
};

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
