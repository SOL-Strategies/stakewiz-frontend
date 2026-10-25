import { FC } from "react";
import { clusterStatsI, ClusterBlockStatsI, EpochInfoI, PercentilesI } from '../validator/interfaces';
import { NetworkCard, StatTile, StatGrid, percent, sol, formatNumber } from './common';

const range = (p: PercentilesI | null, format: (n: number) => string) => (p) ? 'p10 '+format(p.p10)+' · p90 '+format(p.p90) : null;

export const EpochProgress: FC<{epochInfo: EpochInfoI}> = ({epochInfo}) => {
    const progress = epochInfo.elapsed_seconds / epochInfo.duration_seconds;
    const hours = (seconds: number) => Math.floor(seconds/3600)+'h '+Math.floor((seconds%3600)/60)+'m';
    return (
        <NetworkCard title={'Epoch '+epochInfo.epoch} tooltip='Progress through the current epoch. Under Alpenglow slots are 200ms and an epoch lasts about 24-25 hours.' full={true}>
            <div className='d-flex flex-wrap justify-content-between small mb-1'>
                <span>{percent(progress)} complete · slot {formatNumber(epochInfo.slot_height)} of the epoch</span>
                <span>{hours(epochInfo.elapsed_seconds)} elapsed · {hours(epochInfo.remaining_seconds)} remaining</span>
            </div>
            <div className="progress bg-semidark" style={{height: '6px'}}>
                <div className="progress-bar bg-warning" role="progressbar" aria-valuenow={progress*100} aria-valuemin={0} aria-valuemax={100} style={{width: (progress*100)+'%'}}>
                </div>
            </div>
        </NetworkCard>
    );
}

// Current epoch to date, from /cluster_stats (vote spreads in percent, block_stats in fractions)
export const CurrentEpochStats: FC<{clusterStats: clusterStatsI}> = ({clusterStats}) => {
    const b: ClusterBlockStatsI = clusterStats.block_stats;
    const vote = clusterStats.vote_success;
    return (
        <NetworkCard title='This epoch' tooltip='Network-wide figures for the current epoch to date. Percentile ranges are across validators with at least 50 blocks (block metrics) or a value this epoch (vote success).' full={true}>
            {(b==null) ? (
                <div className='text-secondary'>Block stats for the new epoch are not available yet.</div>
            ) : (
                <StatGrid>
                    <StatTile
                        label='Skip rate'
                        value={percent(b.skip_rate, 2)}
                        detail='stake-weighted'
                        tooltip='Total skipped leader slots ÷ total leader slots across the network. Leader slots follow stake, so this is effectively stake-weighted.'
                    />
                    <StatTile
                        label='Vote success (median)'
                        value={(vote) ? parseFloat(vote.median.toFixed(1))+'%' : '—'}
                        detail={range(vote, (n) => parseFloat(n.toFixed(1))+'%')}
                        tooltip='Share of the optimal vote rewards validators earned this epoch.'
                    />
                    <StatTile
                        label='Block production (median)'
                        value={(b.validator_block_production) ? percent(b.validator_block_production.median) : '—'}
                        detail={range(b.validator_block_production, (n) => percent(n))}
                        tooltip='Fee capture index × share of leader slots produced. 100% is a market-typical block in every slot.'
                    />
                    <StatTile
                        label='Fee capture (median)'
                        value={(b.validator_fee_capture_index) ? b.validator_fee_capture_index.median.toFixed(2) : '—'}
                        detail={range(b.validator_fee_capture_index, (n) => n.toFixed(2))}
                        tooltip="A validator's typical block fees vs the median block in the same ~5 minute window. 1.00 is a typical block."
                    />
                    <StatTile
                        label='Blocks produced'
                        value={formatNumber(b.blocks_produced)}
                        detail={formatNumber(b.validators)+' leaders'}
                    />
                    <StatTile
                        label='Fees per block'
                        value={sol(b.fee_per_block)}
                        detail={formatNumber(b.fee_per_cu, 3)+' lamports/CU'}
                    />
                    <StatTile
                        label='Jito tips per block'
                        value={sol(b.tips_per_block)}
                        detail={'◎ '+formatNumber(b.tips_lamports/1e9, 0)+' total'}
                    />
                    <StatTile
                        label='Block fullness'
                        value={percent(b.fullness)}
                        detail={percent(b.full_block_share, 2)+' full blocks'}
                        tooltip='Average block cost units as a share of the 50M block limit. Full blocks are at 99% or more of the limit.'
                    />
                    <StatTile
                        label='Transactions per block'
                        value={formatNumber(b.txs_per_block)}
                        detail={percent(b.failed_tx_share)+' failed'}
                    />
                </StatGrid>
            )}
        </NetworkCard>
    );
}
