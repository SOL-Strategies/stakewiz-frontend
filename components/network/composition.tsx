import { FC } from "react";
import Chart from "react-google-charts";
import { validatorI } from '../validator/interfaces';
import { NetworkCard, COLORS, chartOptions, formatNumber } from './common';
import { nakamotoCoefficient } from './current_epoch';

const TOP_GROUPS = 8;

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
        data={[[label, 'Stake share'], ...rows]}
        options={chartOptions({
            pieHole: 0.55,
            legend: { position: 'right', alignment: 'center', textStyle: { color: '#fff', fontSize: 11 } },
            pieSliceBorderColor: '#2b2b2b',
            pieSliceText: 'percentage',
            pieSliceTextStyle: { color: '#111', fontSize: 10 },
            sliceVisibilityThreshold: 0,
            chartArea: { top: 10, left: 10, width: '95%', height: '88%' }
        })}
    />
);

const ShareBars: FC<{rows: [string, number][], label: string, color: string}> = ({rows, label, color}) => (
    <Chart
        chartType='BarChart'
        width="100%"
        height="16rem"
        data={[[label, 'Stake share', {role: 'style'}], ...rows.map(([k, share], i) => [k, share, 'color: '+((k === 'Other') ? COLORS.grey : color)+'; opacity: '+((i < 3) ? 1 : 0.65)])]}
        options={chartOptions({
            hAxis: { format: 'percent', gridlines: { color: '#3a3a3a' }, textStyle: { color: '#fff' }, minValue: 0 },
            vAxis: { textStyle: { color: '#fff', fontSize: 11 } },
            chartArea: { top: 10, left: 170, width: '60%', height: '85%' },
            bar: { groupWidth: '70%' }
        })}
    />
);

// Cumulative stake against validators ranked by stake, with the one-third halt line
const StakeCurve: FC<{validators: validatorI[], totalStake: number}> = ({validators, totalStake}) => {
    const sorted = [...validators].sort((a, b) => b.activated_stake - a.activated_stake);
    const nakamoto = nakamotoCoefficient(validators);
    let cumulative = 0;
    const data: any[] = [['Validators', 'Cumulative stake', {role: 'tooltip'}, 'One third']];
    sorted.forEach((v, i) => {
        cumulative += v.activated_stake;
        const share = cumulative/totalStake;
        data.push([i + 1, share, 'Top '+(i + 1)+' validators: '+(share*100).toFixed(1)+'% of stake', 1/3]);
    });
    return (
        <NetworkCard title='Stake concentration' tooltip='Share of all stake held by the largest validators. Where the curve crosses one third is the Nakamoto coefficient: that many validators could halt the network.' full={true}>
            <div className='small mb-1'>
                The largest <span className='fw-bold' style={{color: COLORS.purple}}>{nakamoto}</span> validators hold a third of stake;
                the largest 100 hold <span className='fw-bold' style={{color: COLORS.cyan}}>{(data[Math.min(100, data.length - 1)][1]*100).toFixed(0)}%</span>.
            </div>
            <Chart
                chartType='ComboChart'
                width="100%"
                height="16rem"
                data={data}
                options={chartOptions({
                    seriesType: 'area',
                    series: { 0: { color: COLORS.purple, areaOpacity: 0.35, lineWidth: 2 }, 1: { type: 'line', color: COLORS.pink, lineDashStyle: [6, 4], lineWidth: 1, enableInteractivity: false } },
                    hAxis: { title: 'Validators ranked by stake', titleTextStyle: { color: '#fff' }, textStyle: { color: '#fff' }, gridlines: { color: 'transparent' }, logScale: true },
                    vAxis: { format: 'percent', textStyle: { color: '#fff' }, gridlines: { color: '#3a3a3a' }, minValue: 0, maxValue: 1 },
                    chartArea: { top: 15, left: 60, width: '88%', height: '72%' }
                })}
            />
        </NetworkCard>
    );
}

export const NetworkComposition: FC<{validators: validatorI[]}> = ({validators}) => {
    const staked = validators.filter((v) => v.activated_stake > 0);
    const totalStake = staked.reduce((sum, v) => sum + v.activated_stake, 0);
    const delinquent = staked.filter((v) => v.delinquent);

    return (
        <>
            <StakeCurve validators={staked} totalStake={totalStake} />
            <NetworkCard title='Client versions by stake' tooltip={formatNumber(staked.length)+' validators with stake, ◎ '+formatNumber(totalStake/1e6, 1)+'M active, '+delinquent.length+' delinquent.'}>
                <Donut rows={stakeShares(staked, (v) => v.version, totalStake, 6)} label='Version' />
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
