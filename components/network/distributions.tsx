import { FC, useState } from "react";
import Chart from "react-google-charts";
import { clusterStatsI, validatorI } from '../validator/interfaces';
import { NetworkCard, COLORS, chartOptions, formatNumber } from './common';

interface BinI {
    label: string;
    count: number;
    stake: number;
    color: string;
}

// Bucket validators by a metric; values outside [min, max) go into the end buckets
const histogram = (validators: validatorI[], value: (v: validatorI) => number | null, min: number, max: number, step: number, color: (mid: number) => string, format: (n: number) => string): BinI[] => {
    const count = Math.round((max - min)/step);
    let bins: BinI[] = Array.from({length: count}, (_, i) => {
        const lo = min + i*step;
        const label = (i === 0) ? '<'+format(lo + step) : (i === count - 1) ? '≥'+format(lo) : format(lo);
        return {label, count: 0, stake: 0, color: color(lo + step/2)};
    });
    for(const v of validators) {
        const x = value(v);
        if(x==null) continue;
        const i = Math.max(0, Math.min(count - 1, Math.floor((x - min)/step)));
        bins[i].count++;
        bins[i].stake += v.activated_stake;
    }
    return bins;
}

// Green at or above the network median, amber below it, red below p10
const spreadColor = (p10: number, median: number) => (x: number) => (x < p10) ? COLORS.red : (x < median) ? '#ddaa33' : COLORS.green;

const HistogramChart: FC<{bins: BinI[], byStake: boolean, unit: string}> = ({bins, byStake, unit}) => {
    const data = [
        ['Bucket', (byStake) ? 'Stake (M SOL)' : 'Validators', {role: 'style'}, {role: 'tooltip'}],
        ...bins.map((b) => [
            b.label,
            (byStake) ? b.stake/1e6 : b.count,
            b.color,
            b.label+unit+'\n'+formatNumber(b.count)+' validators\n◎ '+formatNumber(b.stake/1e6, 2)+'M stake'
        ])
    ];
    return (
        <Chart
            chartType='ColumnChart'
            width="100%"
            height="15rem"
            data={data}
            options={chartOptions({
                bar: { groupWidth: '88%' },
                hAxis: { textStyle: { color: '#fff', fontSize: 10 }, slantedText: false, showTextEvery: 2 },
                chartArea: { top: 15, left: 45, width: '88%', height: '75%' }
            })}
        />
    );
}

export const Distributions: FC<{validators: validatorI[], clusterStats: clusterStatsI}> = ({validators, clusterStats}) => {
    const [byStake, setByStake] = useState(false);
    const staked = validators.filter((v) => v.activated_stake > 0 && !v.delinquent);
    const vote = clusterStats?.vote_success;
    const bp = staked.find((v) => v.block_production_median!=null);
    const pct = (n: number) => parseFloat(n.toFixed(0))+'';

    const toggle = (
        <div className='btn-group btn-group-sm mb-2' role='group'>
            <button className={'btn '+((!byStake) ? 'btn-light' : 'btn-outline-light')} onClick={() => setByStake(false)}>Validators</button>
            <button className={'btn '+((byStake) ? 'btn-light' : 'btn-outline-light')} onClick={() => setByStake(true)}>Stake</button>
        </div>
    );

    return (
        <>
            <NetworkCard title='Vote success distribution' tooltip='Validators by vote success this epoch. Colours follow the network spread: green at or above the median, amber below it, red below p10.'>
                {toggle}
                <HistogramChart
                    byStake={byStake}
                    unit='%'
                    bins={histogram(staked, (v) => v.vote_success, 80, 101, 1, (vote) ? spreadColor(vote.p10, vote.median) : () => COLORS.green, pct)}
                />
            </NetworkCard>
            <NetworkCard title='Block production distribution' tooltip='Validators by block production this epoch (fee capture × share of leader slots produced). Validators under 12 blocks are not shown.'>
                {toggle}
                <HistogramChart
                    byStake={byStake}
                    unit='%'
                    bins={histogram(staked, (v) => v.block_production, 40, 150, 5, (bp) ? spreadColor(bp.block_production_p10, bp.block_production_median) : () => COLORS.cyan, pct)}
                />
            </NetworkCard>
            <NetworkCard title='Wiz Score distribution' tooltip='Validators by Wiz Score.'>
                {toggle}
                <HistogramChart
                    byStake={byStake}
                    unit='%'
                    bins={histogram(staked, (v) => v.wiz_score, 0, 105, 5, (x) => (x < 50) ? COLORS.red : (x < 80) ? '#ddaa33' : (x < 90) ? COLORS.teal : COLORS.green, pct)}
                />
            </NetworkCard>
            <MevDistribution validators={staked} />
        </>
    );
}

// MEV tips per produced block (net of the validator's MEV commission) against the Wiz Score benchmark
const MevDistribution: FC<{validators: validatorI[]}> = ({validators}) => {
    const jito = validators.filter((v) => v.is_jito && !v.mev_ignored && v.mev_tips_per_block!=null);
    const benchmark = jito.find((v) => v.mev_benchmark!=null)?.mev_benchmark;
    if(jito.length === 0) return null;
    const sorted = jito.map((v) => v.mev_tips_per_block).sort((a, b) => a - b);
    const max = sorted[Math.floor(sorted.length*0.97)] || sorted[sorted.length - 1];
    const step = max/16;
    const bins = histogram(jito, (v) => v.mev_tips_per_block, 0, step*17, step,
        (x) => (benchmark!=null && x >= benchmark) ? COLORS.green : COLORS.orange, (n) => n.toFixed(4));
    return (
        <NetworkCard title='MEV tips per block' tooltip='Jito validators by net tips per produced block this epoch (after their MEV commission). Green buckets are at or above the Wiz Score benchmark, the p90 of Jito validators.'>
            <div className='small mb-2'>
                {formatNumber(jito.length)} Jito validators · benchmark <span className='fw-bold' style={{color: COLORS.green}}>◎ {(benchmark!=null) ? benchmark.toFixed(4) : '—'}</span> per block
            </div>
            <HistogramChart byStake={false} unit=' SOL' bins={bins} />
        </NetworkCard>
    );
}

// Every validator as a bubble: block production vs vote success, sized by stake, coloured by Wiz Score
export const PerformanceMap: FC<{validators: validatorI[]}> = ({validators}) => {
    const points = validators.filter((v) => v.activated_stake > 0 && !v.delinquent && v.block_production!=null && v.vote_success!=null);
    const data = [
        ['Validator', 'Block production (%)', 'Vote success (%)', 'Wiz Score', 'Stake (SOL)'],
        ...points.map((v) => [
            v.name || v.identity.slice(0, 8),
            Math.min(v.block_production, 160),
            Math.max(v.vote_success, 90),
            v.wiz_score,
            v.activated_stake
        ])
    ];
    return (
        <NetworkCard title='Performance map' tooltip='Each bubble is a validator: block production (x) against vote success (y), sized by stake and coloured by Wiz Score. Top right is best. Values are clamped to the chart.' full={true}>
            <Chart
                chartType='BubbleChart'
                width="100%"
                height="26rem"
                data={data}
                options={chartOptions({
                    colorAxis: { colors: [COLORS.red, '#ddaa33', COLORS.green], minValue: 40, maxValue: 100, legend: { textStyle: { color: '#fff' } } },
                    bubble: { textStyle: { fontSize: 1, color: 'transparent', auraColor: 'none' }, stroke: 'rgba(0,0,0,0.3)', opacity: 0.75 },
                    sizeAxis: { minSize: 3, maxSize: 22 },
                    hAxis: { title: 'Block production (%)', titleTextStyle: { color: '#fff' }, textStyle: { color: '#fff' }, gridlines: { color: '#3a3a3a' }, minValue: 40, maxValue: 160 },
                    vAxis: { title: 'Vote success (%)', titleTextStyle: { color: '#fff' }, textStyle: { color: '#fff' }, gridlines: { color: '#3a3a3a' }, minValue: 90, maxValue: 100 },
                    chartArea: { top: 30, left: 70, width: '82%', height: '75%' },
                    explorer: { actions: ['dragToZoom', 'rightClickToReset'], keepInBounds: true, maxZoomIn: 0.1 }
                })}
            />
            <div className='small text-secondary'>Drag to zoom, right-click to reset. Showing {formatNumber(points.length)} validators with block production this epoch.</div>
        </NetworkCard>
    );
}
