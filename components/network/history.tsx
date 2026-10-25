import { FC, useEffect, useState } from "react";
import axios from "axios";
import config from '../../config.json'
import Chart from "react-google-charts";
import { Spinner } from '../common'
import { ClusterBlockStatsI, PercentilesI } from '../validator/interfaces';
import { NetworkCard, COLORS, chartOptions, formatNumber } from './common';

const API_URL = process.env.API_BASE_URL;

interface BlockMetricI {
    label: string;
    // Network-wide figure for the epoch
    value: (c: ClusterBlockStatsI) => number | null;
    // Spread across validators with 50+ blocks, drawn as a band
    spread?: (c: ClusterBlockStatsI) => PercentilesI | null;
    spreadLabel?: string;
    format: string;
    scale?: number;
    color: string;
}

const blockMetrics: BlockMetricI[] = [
    { label: 'Skip rate', value: (c) => c.skip_rate, spread: (c) => c.validator_skip_rate, spreadLabel: 'validator p10-p90', format: '#.##%', color: COLORS.pink },
    { label: 'Block production', value: (c) => c.validator_block_production?.median, spread: (c) => c.validator_block_production, spreadLabel: 'validator p10-p90 (line is the median)', format: '#%', color: COLORS.cyan },
    { label: 'Fee capture', value: (c) => c.validator_fee_capture_index?.median, spread: (c) => c.validator_fee_capture_index, spreadLabel: 'validator p10-p90 (line is the median)', format: '#.##', color: COLORS.amber },
    { label: 'Fee per CU (lamports)', value: (c) => c.fee_per_cu, spread: (c) => c.validator_fee_per_cu, spreadLabel: 'validator p10-p90', format: '#.###', color: COLORS.teal },
    { label: 'Fees per block (SOL)', value: (c) => c.fee_per_block, format: '#.####', scale: 1e-9, color: COLORS.green },
    { label: 'Jito tips per block (SOL)', value: (c) => c.tips_per_block, format: '#.####', scale: 1e-9, color: COLORS.orange },
    { label: 'Block fullness', value: (c) => c.fullness, format: '#%', color: COLORS.purple },
    { label: 'Transactions per block', value: (c) => c.txs_per_block, format: '#', color: COLORS.grey },
    { label: 'Failed transactions', value: (c) => c.failed_tx_share, format: '#%', color: COLORS.red }
];

export const BlockStatsHistory: FC = () => {
    const [stats, setStats] = useState<ClusterBlockStatsI[]>(null);
    const [metricIndex, setMetricIndex] = useState(0);

    useEffect(() => {
        axios(API_URL+config.API_ENDPOINTS.cluster_block_stats+'?epochs=100', {
            headers: {'Content-Type':'application/json'}
        })
            .then(response => setStats(response.data))
            .catch(e => console.log(e));
    }, []);

    const metric = blockMetrics[metricIndex];
    let data: any[] = null;
    if(stats) {
        const scale = metric.scale ?? 1;
        data = [['Epoch', metric.label, {role: 'interval'}, {role: 'interval'}]];
        // Oldest first; the current epoch is marked as in progress
        for(const c of [...stats].reverse()) {
            const value = metric.value(c);
            const spread = metric.spread?.(c);
            data.push([
                c.epoch+((c.final) ? '' : '*'),
                (value==null) ? null : value*scale,
                (spread) ? spread.p10*scale : null,
                (spread) ? spread.p90*scale : null
            ]);
        }
    }

    return (
        <NetworkCard title='Block stats by epoch' tooltip='Network block stats per epoch from every block since Alpenglow activated in epoch 1064. * marks the epoch in progress. A new point is added each epoch (about once a day).' full={true}>
            <div className='d-flex flex-wrap gap-1 mb-2'>
                {blockMetrics.map((m, i) => (
                    <button
                        key={m.label}
                        className='btn btn-sm rounded-pill'
                        style={(i === metricIndex) ? {background: m.color, color: '#111', borderColor: m.color} : {color: m.color, borderColor: m.color}}
                        onClick={() => setMetricIndex(i)}
                    >
                        {m.label}
                    </button>
                ))}
            </div>
            {(data==null) ? <Spinner /> : (
                <>
                    <Chart
                        chartType='LineChart'
                        width="100%"
                        height="18rem"
                        data={data}
                        options={chartOptions({
                            colors: [metric.color],
                            lineWidth: 3,
                            pointSize: 8,
                            curveType: 'function',
                            intervals: { style: 'area', color: metric.color, fillOpacity: 0.2 },
                            vAxis: { format: metric.format, gridlines: { color: '#3a3a3a' }, textStyle: { color: '#fff' }, minValue: 0 }
                        })}
                    />
                    {(metric.spread) ? <div className='small text-secondary'>Shaded band: {metric.spreadLabel}.</div> : null}
                    {(stats.length < 10) ? <div className='small text-secondary'>Only {stats.length} epochs of data so far; the chart fills in as each epoch completes.</div> : null}
                </>
            )}
        </NetworkCard>
    );
}

// What a block earns the leader on average: base fees, priority fees and Jito tips, per epoch
export const BlockRevenueHistory: FC = () => {
    const [stats, setStats] = useState<ClusterBlockStatsI[]>(null);

    useEffect(() => {
        axios(API_URL+config.API_ENDPOINTS.cluster_block_stats+'?epochs=100', {
            headers: {'Content-Type':'application/json'}
        })
            .then(response => setStats(response.data))
            .catch(e => console.log(e));
    }, []);

    let data: any[] = null;
    if(stats) {
        data = [['Epoch', 'Base fees', 'Priority fees', 'Jito tips']];
        for(const c of [...stats].reverse()) {
            const blocks = c.blocks_produced || 1;
            data.push([
                c.epoch+((c.final) ? '' : '*'),
                c.fee_base_total/blocks/1e9,
                c.fee_priority_total/blocks/1e9,
                (c.epoch >= 1067) ? c.tips_per_block/1e9 : null
            ]);
        }
    }

    return (
        <NetworkCard title='Revenue per block' tooltip='Average SOL per produced block each epoch, split into base fees, priority fees and Jito tips. Tips are complete from epoch 1067. * marks the epoch in progress.'>
            {(data==null) ? <Spinner /> : (
                <Chart
                    chartType='ColumnChart'
                    width="100%"
                    height="17rem"
                    data={data}
                    options={chartOptions({
                        isStacked: true,
                        colors: [COLORS.grey, COLORS.amber, COLORS.orange],
                        legend: { position: 'top', textStyle: { color: '#fff' } },
                        bar: { groupWidth: '55%' },
                        vAxis: { format: '◎ #.###', gridlines: { color: '#3a3a3a' }, textStyle: { color: '#fff' }, minValue: 0 },
                        chartArea: { top: 35, left: 70, width: '82%', height: '70%' }
                    })}
                />
            )}
        </NetworkCard>
    );
}

interface EpochHistoryI {
    epoch: number;
    start: string;
    end: string;
    duration_seconds: number;
}

export const EpochDurationHistory: FC = () => {
    const [epochs, setEpochs] = useState<EpochHistoryI[]>(null);

    useEffect(() => {
        axios(API_URL+config.API_ENDPOINTS.all_epoch_history, {
            headers: {'Content-Type':'application/json'}
        })
            .then(response => setEpochs(response.data))
            .catch(e => console.log(e));
    }, []);

    let data: any[] = null;
    if(epochs) {
        data = [['Epoch', 'Duration (hours)', {role: 'annotation'}, {role: 'annotationText'}]];
        // Oldest first, skipping the epoch in progress (its duration is a projection)
        for(const e of [...epochs].reverse().slice(0, -1)) {
            const alpenglow = e.epoch === 1064;
            data.push([e.epoch, e.duration_seconds/3600, (alpenglow) ? 'Alpenglow' : null, (alpenglow) ? '200ms slots from epoch 1064' : null]);
        }
    }

    return (
        <NetworkCard title='Epoch duration' tooltip='How long each epoch took, since epoch 97. Epochs shortened when Alpenglow brought 200ms slots in epoch 1064.'>
            {(data==null) ? <Spinner /> : (
                <>
                    <Chart
                        chartType='AreaChart'
                        width="100%"
                        height="17rem"
                        data={data}
                        options={chartOptions({
                            colors: [COLORS.purple],
                            areaOpacity: 0.3,
                            lineWidth: 1,
                            annotations: { style: 'line', stem: { color: COLORS.cyan }, textStyle: { color: COLORS.cyan, fontSize: 12 } },
                            hAxis: { format: '#', gridlines: { color: 'transparent' }, textStyle: { color: '#fff' } },
                            vAxis: { format: '#h', gridlines: { color: '#3a3a3a' }, textStyle: { color: '#fff' }, minValue: 0 }
                        })}
                    />
                    <div className='small text-secondary'>
                        {formatNumber(epochs.length-1)} completed epochs · latest {(epochs[1].duration_seconds/3600).toFixed(1)}h
                    </div>
                </>
            )}
        </NetworkCard>
    );
}

