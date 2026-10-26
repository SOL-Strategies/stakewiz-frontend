import { FC } from "react";
import { clusterStatsI, PercentilesI, validatorI } from '../validator/interfaces';
import { UNREPORTED_CLIENTS } from '../validator/common';
import { NetworkCard, KpiTile, StatGrid, StatTile, COLORS, percent, sol, formatNumber } from './common';

const range = (p: PercentilesI | null, format: (n: number) => string) => (p) ? 'p10 '+format(p.p10)+' · p90 '+format(p.p90) : null;

// Alpenglow fault-tolerance thresholds as shares of stake
export const STAKE_THRESHOLDS = [0.2, 0.4];

// Fewest validators that together hold more than `threshold` of stake
export const nakamotoCoefficient = (validators: validatorI[], threshold: number) => {
    const staked = validators.filter((v) => v.activated_stake > 0).sort((a, b) => b.activated_stake - a.activated_stake);
    const total = staked.reduce((sum, v) => sum + v.activated_stake, 0);
    let cumulative = 0;
    for(let i = 0; i < staked.length; i++) {
        cumulative += staked[i].activated_stake;
        if(cumulative > total*threshold) return i + 1;
    }
    return staked.length;
}

// Headline network health for the current epoch: Stakewiz vote and block measures first
export const NetworkHealth: FC<{clusterStats: clusterStatsI, validators: validatorI[]}> = ({clusterStats, validators}) => {
    const b = clusterStats?.block_stats;
    const vote = clusterStats?.vote_success;
    const largestClient = (clusterStats?.clients || [])
        .filter((c) => !UNREPORTED_CLIENTS.includes(c.client))
        .sort((a, b) => b.stake_pct - a.stake_pct)[0];

    return (
        <NetworkCard title='Network health this epoch' tooltip='Stakewiz measures across all validators for the current epoch to date. Rings show where the network median sits; ranges are across validators.' full={true}>
            <div className='network-kpi-grid'>
                <KpiTile
                    label='Vote success (median)'
                    value={(vote) ? parseFloat(vote.median.toFixed(1))+'%' : '—'}
                    detail={range(vote, (n) => parseFloat(n.toFixed(1))+'%')}
                    accent={COLORS.green}
                    ring={(vote) ? vote.median/100 : 0}
                    tooltip='Share of the optimal vote rewards validators earned this epoch, from their own votes and from including other validators votes as leader.'
                />
                <KpiTile
                    label='Block production (median)'
                    value={(b?.validator_block_production) ? percent(b.validator_block_production.median) : '—'}
                    detail={range(b?.validator_block_production, (n) => percent(n, 0))}
                    accent={COLORS.cyan}
                    ring={(b?.validator_block_production) ? b.validator_block_production.median/1.25 : 0}
                    tooltip='Fee capture index × share of leader slots produced. 100% is a market-typical block in every slot; the ring runs to 125%.'
                />
                <KpiTile
                    label='Skip rate'
                    value={(b) ? percent(b.skip_rate, 2) : '—'}
                    detail={(b) ? formatNumber(b.skipped_slots)+' of '+formatNumber(b.leader_slots)+' slots' : null}
                    accent={COLORS.pink}
                    ring={(b) ? b.skip_rate/0.05 : 0}
                    tooltip='Stake-weighted: total skipped leader slots ÷ total leader slots. The ring runs to 5%.'
                />
                <KpiTile
                    label='Fee capture (median)'
                    value={(b?.validator_fee_capture_index) ? b.validator_fee_capture_index.median.toFixed(2) : '—'}
                    detail={range(b?.validator_fee_capture_index, (n) => n.toFixed(2))}
                    accent={COLORS.amber}
                    ring={(b?.validator_fee_capture_index) ? b.validator_fee_capture_index.median/1.25 : 0}
                    tooltip="A validator's typical block fees vs the median block in the same ~5 minute window. 1.00 is a typical block."
                />
                <KpiTile
                    label='Nakamoto coefficient (20%)'
                    value={(validators) ? formatNumber(nakamotoCoefficient(validators, STAKE_THRESHOLDS[0])) : '—'}
                    detail={(validators) ? formatNumber(nakamotoCoefficient(validators, STAKE_THRESHOLDS[1]))+' validators for 40%' : null}
                    accent={COLORS.purple}
                    badge={<i className='bi bi-shield-check'></i>}
                    tooltip='Alpenglow tolerates up to 20% of stake acting maliciously plus a further 20% offline. These are the fewest validators that together hold more than 20% and 40% of stake. Higher is more decentralised.'
                />
                <KpiTile
                    label={(largestClient) ? 'of stake runs '+largestClient.client : 'Largest client'}
                    value={(largestClient) ? parseFloat(largestClient.stake_pct.toFixed(1))+'%' : '—'}
                    detail={(largestClient) ? formatNumber(largestClient.validators)+' validators · largest client' : null}
                    accent={COLORS.orange}
                    ring={(largestClient) ? largestClient.stake_pct/100 : 0}
                    tooltip='The validator client run by the most stake, as reported by each node. A single client with a large share of stake is a risk if it has a bug.'
                />
            </div>
        </NetworkCard>
    );
}

// Supporting block totals for the current epoch
export const BlockTotals: FC<{clusterStats: clusterStatsI}> = ({clusterStats}) => {
    const b = clusterStats?.block_stats;
    if(!b) return null;
    return (
        <NetworkCard title='Blocks this epoch' tooltip='Network-wide totals from every block indexed by Stakewiz in the current epoch.' full={true}>
            <StatGrid>
                <StatTile label='Blocks produced' value={formatNumber(b.blocks_produced)} detail={formatNumber(b.validators)+' leaders'} color={COLORS.cyan} />
                <StatTile label='Fees per block' value={sol(b.fee_per_block)} detail={formatNumber(b.fee_per_cu, 3)+' lamports/CU'} color={COLORS.amber} />
                <StatTile label='Jito tips per block' value={sol(b.tips_per_block)} detail={'◎ '+formatNumber(b.tips_lamports/1e9, 0)+' total'} color={COLORS.orange} />
                <StatTile label='Block fullness' value={percent(b.fullness)} detail={percent(b.full_block_share, 2)+' full blocks'} color={COLORS.purple} />
                <StatTile label='Transactions per block' value={formatNumber(b.txs_per_block)} detail={formatNumber(b.tx_count/1e6, 1)+'M this epoch'} color={COLORS.teal} />
                <StatTile label='Failed transactions' value={percent(b.failed_tx_share)} detail='of included transactions' color={COLORS.pink} />
            </StatGrid>
        </NetworkCard>
    );
}
