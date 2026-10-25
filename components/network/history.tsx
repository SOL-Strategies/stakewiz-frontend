import { FC, useEffect, useState } from "react";
import axios from "axios";
import config from '../../config.json'
import Chart from "react-google-charts";
import { Spinner } from '../common'
import { ClusterBlockStatsI, PercentilesI } from '../validator/interfaces';
import { NetworkCard, chartOptions, formatNumber } from './common';

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
}

const blockMetrics: BlockMetricI[] = [
    { label: 'Skip rate', value: (c) => c.skip_rate, spread: (c) => c.validator_skip_rate, spreadLabel: 'validator p10-p90', format: '#.##%' },
    { label: 'Block production', value: (c) => c.validator_block_production?.median, spread: (c) => c.validator_block_production, spreadLabel: 'validator p10-p90 (line is the median)', format: '#%' },
    { label: 'Fee capture', value: (c) => c.validator_fee_capture_index?.median, spread: (c) => c.validator_fee_capture_index, spreadLabel: 'validator p10-p90 (line is the median)', format: '#.##' },
    { label: 'Fee per CU (lamports)', value: (c) => c.fee_per_cu, spread: (c) => c.validator_fee_per_cu, spreadLabel: 'validator p10-p90', format: '#.###' },
    { label: 'Fees per block (SOL)', value: (c) => c.fee_per_block, format: '#.####', scale: 1e-9 },
    { label: 'Jito tips per block (SOL)', value: (c) => c.tips_per_block, format: '#.####', scale: 1e-9 },
    { label: 'Block fullness', value: (c) => c.fullness, format: '#%' },
    { label: 'Transactions per block', value: (c) => c.txs_per_block, format: '#' },
    { label: 'Failed transactions', value: (c) => c.failed_tx_share, format: '#%' }
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
            <select
                className='form-select form-select-sm bg-dark text-light w-auto mb-2'
                value={metricIndex}
                onChange={(e) => setMetricIndex(parseInt(e.target.value))}
            >
                {blockMetrics.map((m, i) => <option key={m.label} value={i}>{m.label}</option>)}
            </select>
            {(data==null) ? <Spinner /> : (
                <>
                    <Chart
                        chartType='LineChart'
                        width="100%"
                        height="18rem"
                        data={data}
                        options={chartOptions({
                            lineWidth: 2,
                            pointSize: 6,
                            intervals: { style: 'area', color: '#ffc107', fillOpacity: 0.25 },
                            vAxis: { format: metric.format, gridlines: { color: 'transparent' }, textStyle: { color: '#fff' }, minValue: 0 }
                        })}
                    />
                    {(metric.spread) ? <div className='small text-secondary'>Shaded band: {metric.spreadLabel}.</div> : null}
                    {(stats.length < 10) ? <div className='small text-secondary'>Only {stats.length} epochs of data so far; the chart fills in as each epoch completes.</div> : null}
                </>
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
        data = [['Epoch', 'Duration (hours)']];
        // Oldest first, skipping the epoch in progress (its duration is a projection)
        for(const e of [...epochs].reverse().slice(0, -1)) {
            data.push([e.epoch, e.duration_seconds/3600]);
        }
    }

    return (
        <NetworkCard title='Epoch duration' tooltip='How long each epoch took, since epoch 97. Epochs shortened when Alpenglow brought 200ms slots in epoch 1064.' full={true}>
            {(data==null) ? <Spinner /> : (
                <>
                    <Chart
                        chartType='LineChart'
                        width="100%"
                        height="16rem"
                        data={data}
                        options={chartOptions({
                            lineWidth: 1,
                            hAxis: { format: '#', gridlines: { color: 'transparent' }, textStyle: { color: '#fff' } },
                            vAxis: { format: '#h', gridlines: { color: 'transparent' }, textStyle: { color: '#fff' }, minValue: 0 }
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

