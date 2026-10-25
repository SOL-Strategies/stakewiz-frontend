import { FC } from "react";
import { clusterStatsI, PercentilesI, validatorI } from '../validator/interfaces';
import { NetworkCard, KpiTile, StatGrid, StatTile, COLORS, percent, sol, formatNumber } from './common';

const range = (p: PercentilesI | null, format: (n: number) => string) => (p) ? 'p10 '+format(p.p10)+' · p90 '+format(p.p90) : null;

// Fewest validators that together hold over a third of stake (the superminority)
export const nakamotoCoefficient = (validators: validatorI[]) => {
    const staked = validators.filter((v) => v.activated_stake > 0).sort((a, b) => b.activated_stake - a.activated_stake);
    const total = staked.reduce((sum, v) => sum + v.activated_stake, 0);
    let cumulative = 0;
    for(let i = 0; i < staked.length; i++) {
        cumulative += staked[i].activated_stake;
        if(cumulative > total/3) return i + 1;
    }
    return staked.length;
}

// Headline network health for the current epoch: Stakewiz vote and block measures first
export const NetworkHealth: FC<{clusterStats: clusterStatsI, validators: validatorI[]}> = ({clusterStats, validators}) => {
    const b = clusterStats?.block_stats;
    const vote = clusterStats?.vote_success;
    const staked = (validators || []).filter((v) => v.activated_stake > 0);
    const totalStake = staked.reduce((sum, v) => sum + v.activated_stake, 0);
    const jitoShare = (totalStake > 0) ? staked.filter((v) => v.is_jito).reduce((sum, v) => sum + v.activated_stake, 0)/totalStake : null;

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
                    label='Nakamoto coefficient'
                    value={(validators) ? formatNumber(nakamotoCoefficient(validators)) : '—'}
                    detail='validators for 33.3% of stake'
                    accent={COLORS.purple}
                    badge={<i className='bi bi-shield-check'></i>}
                    tooltip='The fewest validators that together control more than a third of stake, enough to halt the network. Higher is more decentralised.'
                />
                <KpiTile
                    label='Jito stake'
                    value={(jitoShare!=null) ? percent(jitoShare) : '—'}
                    detail='running Jito with a MEV commission'
                    accent={COLORS.orange}
                    ring={jitoShare ?? 0}
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
