import { FC } from "react";
import Chart from "react-google-charts";
import { clusterStatsI, NetworkShareI, validatorI } from '../validator/interfaces';
import { NetworkCard, COLORS, chartOptions, formatNumber } from './common';
import { nakamotoCoefficient, STAKE_THRESHOLDS } from './current_epoch';

const TOP_GROUPS = 8;

// Chart cell for a stake share, shown as a percentage in tooltips
const shareValue = (share: number) => ({v: share, f: (share*100).toFixed(1)+'%'});

// Share of active stake per group, largest first, with the remainder as 'Other'
const stakeShares = (validators: validatorI[], key: (v: validatorI) => string, totalStake: number, top = TOP_GROUPS) => {
    let groups: {[k: string]: number} = {};
    for(const v of validators) {
        const k = key(v) || 'Unknown';
        groups[k] = (groups[k] || 0) + v.activated_stake;
    }
    const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
    let rows: [string, number][] = sorted.slice(0, top).map(([k, stake]) => [k, stake/totalStake]);
    const other = sorted.slice(top).reduce((sum, [, stake]) => sum + stake, 0);
    if(other > 0) rows.push(['Other', other/totalStake]);
    return rows;
}

const Donut: FC<{rows: [string, number][], label: string}> = ({rows, label}) => (
    <Chart
        chartType='PieChart'
        width="100%"
        height="16rem"
        data={[[label, 'Stake share'], ...rows.map(([k, share]) => [k, shareValue(share)])]}
        options={chartOptions({
            pieHole: 0.55,
            legend: { position: 'right', alignment: 'center', textStyle: { color: '#fff', fontSize: 11 } },
            pieSliceBorderColor: '#2b2b2b',
            pieSliceText: 'percentage',
            pieSliceTextStyle: { color: '#111', fontSize: 10 },
            sliceVisibilityThreshold: 0,
            tooltip: { text: 'percentage', textStyle: { color: '#222' } },
            chartArea: { top: 10, left: 10, width: '95%', height: '88%' }
        })}
    />
);

const ShareBars: FC<{rows: [string, number][], label: string, color: string}> = ({rows, label, color}) => (
    <Chart
        chartType='BarChart'
        width="100%"
        height="16rem"
        data={[[label, 'Stake share', {role: 'style'}], ...rows.map(([k, share], i) => [k, shareValue(share), 'color: '+((k === 'Other') ? COLORS.grey : color)+'; opacity: '+((i < 3) ? 1 : 0.65)])]}
        options={chartOptions({
            hAxis: { format: 'percent', gridlines: { color: '#3a3a3a' }, textStyle: { color: '#fff' }, minValue: 0 },
            vAxis: { textStyle: { color: '#fff', fontSize: 11 } },
            chartArea: { top: 10, left: 170, width: '60%', height: '85%' },
            bar: { groupWidth: '70%' }
        })}
    />
);

// Cumulative stake against validators ranked by stake, with the Alpenglow 20% and 40% thresholds
const StakeCurve: FC<{validators: validatorI[], totalStake: number}> = ({validators, totalStake}) => {
    const sorted = [...validators].sort((a, b) => b.activated_stake - a.activated_stake);
    const [low, high] = STAKE_THRESHOLDS.map((t) => nakamotoCoefficient(validators, t));
    let cumulative = 0;
    const data: any[] = [['Validators', 'Cumulative stake', {role: 'tooltip'}, '20%', '40%']];
    sorted.forEach((v, i) => {
        cumulative += v.activated_stake;
        const share = cumulative/totalStake;
        data.push([i + 1, share, 'Top '+(i + 1)+' validators: '+(share*100).toFixed(1)+'% of stake', STAKE_THRESHOLDS[0], STAKE_THRESHOLDS[1]]);
    });
    return (
        <NetworkCard title='Stake concentration' tooltip='Share of all stake held by the largest validators. Alpenglow tolerates up to 20% of stake acting maliciously plus a further 20% offline, so the 20% and 40% lines show how few validators reach each threshold.' full={true}>
            <div className='small mb-1'>
                The largest <span className='fw-bold' style={{color: COLORS.amber}}>{low}</span> validators hold 20% of stake
                and the largest <span className='fw-bold' style={{color: COLORS.pink}}>{high}</span> hold 40%;
                the largest 100 hold <span className='fw-bold' style={{color: COLORS.cyan}}>{(data[Math.min(100, data.length - 1)][1]*100).toFixed(0)}%</span>.
            </div>
            <Chart
                chartType='ComboChart'
                width="100%"
                height="16rem"
                data={data}
                options={chartOptions({
                    seriesType: 'area',
                    series: {
                        0: { color: COLORS.purple, areaOpacity: 0.35, lineWidth: 2 },
                        1: { type: 'line', color: COLORS.amber, lineDashStyle: [6, 4], lineWidth: 1, enableInteractivity: false },
                        2: { type: 'line', color: COLORS.pink, lineDashStyle: [6, 4], lineWidth: 1, enableInteractivity: false }
                    },
                    legend: { position: 'top', alignment: 'end', textStyle: { color: '#fff' } },
                    hAxis: { title: 'Validators ranked by stake', titleTextStyle: { color: '#fff' }, textStyle: { color: '#fff' }, gridlines: { color: 'transparent' }, logScale: true },
                    vAxis: { format: 'percent', textStyle: { color: '#fff' }, gridlines: { color: '#3a3a3a' }, minValue: 0, maxValue: 1 },
                    chartArea: { top: 30, left: 60, width: '88%', height: '66%' }
                })}
            />
        </NetworkCard>
    );
}

// Top entries of a network split from /cluster_stats (percent shares across all staked nodes), with the remainder as 'Other'
const apiShares = <T extends NetworkShareI>(list: T[], name: (entry: T) => string, key: 'stake_pct' | 'validators_pct', top = 7): [string, number][] => {
    const sorted = [...list].sort((a, b) => b[key] - a[key]);
    let rows: [string, number][] = sorted.slice(0, top).map((entry) => [name(entry), entry[key]/100]);
    const other = sorted.slice(top).reduce((sum, entry) => sum + entry[key], 0);
    if(other > 0) rows.push(['Other', other/100]);
    return rows;
}

export const NetworkComposition: FC<{validators: validatorI[], clusterStats: clusterStatsI}> = ({validators, clusterStats}) => {
    const staked = validators.filter((v) => v.activated_stake > 0);
    const totalStake = staked.reduce((sum, v) => sum + v.activated_stake, 0);
    const delinquent = staked.filter((v) => v.delinquent);
    const clients = clusterStats?.clients || [];
    const versions = clusterStats?.versions || [];

    return (
        <>
            <StakeCurve validators={staked} totalStake={totalStake} />
            <NetworkCard title='Stake by client' tooltip='Share of active stake by the validator client each node reports.'>
                <Donut rows={(clients.length > 0) ? apiShares(clients, (c) => c.client, 'stake_pct') : stakeShares(staked, (v) => v.client, totalStake, 7)} label='Client' />
            </NetworkCard>
            {(clients.length > 0) ? (
                <NetworkCard title='Validators by client' tooltip='Share of validators by reported client, regardless of stake. Many small validators do not report a client.'>
                    <ShareBars rows={apiShares(clients, (c) => c.client, 'validators_pct')} label='Client' color={COLORS.cyan} />
                </NetworkCard>
            ) : null}
            <NetworkCard title='Stake by version' tooltip={formatNumber(staked.length)+' validators with stake, ◎ '+formatNumber(totalStake/1e6, 1)+'M active, '+delinquent.length+' delinquent.'}>
                <Donut rows={(versions.length > 0) ? apiShares(versions, (v) => v.version, 'stake_pct', 6) : stakeShares(staked, (v) => v.version, totalStake, 6)} label='Version' />
            </NetworkCard>
            <NetworkCard title='Stake by country'>
                <Donut rows={stakeShares(staked, (v) => v.ip_country, totalStake, 7)} label='Country' />
            </NetworkCard>
            <NetworkCard title='Stake by hosting provider' tooltip='Autonomous system (network operator) hosting each validator.'>
                <ShareBars rows={stakeShares(staked, (v) => (v.ip_asn) ? ((v.ip_org) ? v.ip_org.slice(0, 22) : v.ip_asn) : '', totalStake)} label='Provider' color={COLORS.teal} />
            </NetworkCard>
            <NetworkCard title='Stake by city'>
                <ShareBars rows={stakeShares(staked, (v) => v.ip_city, totalStake)} label='City' color={COLORS.amber} />
            </NetworkCard>
        </>
    );
}
