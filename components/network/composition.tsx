import { FC } from "react";
import Chart from "react-google-charts";
import { validatorI } from '../validator/interfaces';
import { NetworkCard, StatTile, StatGrid, chartOptions, formatNumber } from './common';

const TOP_GROUPS = 8;

// Share of active stake per group, largest first, with the remainder as 'Other'
const stakeShares = (validators: validatorI[], key: (v: validatorI) => string, totalStake: number, top = TOP_GROUPS) => {
    let groups: {[k: string]: number} = {};
    for(const v of validators) {
        const k = key(v) || 'Unknown';
        groups[k] = (groups[k] || 0) + v.activated_stake;
    }
    const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
    let rows = sorted.slice(0, top).map(([k, stake]) => [k, stake/totalStake]);
    const other = sorted.slice(top).reduce((sum, [, stake]) => sum + stake, 0);
    if(other > 0) rows.push(['Other', other/totalStake]);
    return rows;
}

const ShareChart: FC<{rows: any[], label: string}> = ({rows, label}) => {
    return (
        <Chart
            chartType='BarChart'
            width="100%"
            height="17rem"
            data={[[label, 'Stake share'], ...rows]}
            options={chartOptions({
                hAxis: { format: 'percent', gridlines: { color: 'transparent' }, textStyle: { color: '#fff' }, minValue: 0 },
                vAxis: { textStyle: { color: '#fff', fontSize: 11 } },
                chartArea: { top: 10, left: 170, width: '60%', height: '85%' },
                bar: { groupWidth: '65%' }
            })}
        />
    );
}

export const NetworkComposition: FC<{validators: validatorI[]}> = ({validators}) => {
    const staked = validators.filter((v) => v.activated_stake > 0);
    const active = staked.filter((v) => !v.delinquent);
    const totalStake = staked.reduce((sum, v) => sum + v.activated_stake, 0);
    const delinquentStake = staked.filter((v) => v.delinquent).reduce((sum, v) => sum + v.activated_stake, 0);
    const jitoStake = staked.filter((v) => v.is_jito).reduce((sum, v) => sum + v.activated_stake, 0);

    // Fewest validators that together hold over a third of stake (the superminority)
    let nakamoto = 0;
    let cumulative = 0;
    for(const v of [...staked].sort((a, b) => b.activated_stake - a.activated_stake)) {
        nakamoto++;
        cumulative += v.activated_stake;
        if(cumulative > totalStake/3) break;
    }

    const stakeWeightedVoteSuccess = staked.reduce((sum, v) => sum + v.vote_success * v.activated_stake, 0) / totalStake;

    return (
        <>
            <NetworkCard title='Network composition' tooltip='From the latest snapshot of all validators with active stake.' full={true}>
                <StatGrid>
                    <StatTile label='Validators with stake' value={formatNumber(staked.length)} detail={formatNumber(staked.length-active.length)+' delinquent'} />
                    <StatTile label='Active stake' value={'◎ '+formatNumber(totalStake/1e6, 1)+'M'} detail={(delinquentStake/totalStake*100).toFixed(2)+'% delinquent'} />
                    <StatTile
                        label='Nakamoto coefficient'
                        value={formatNumber(nakamoto)}
                        detail='validators for 33.3% of stake'
                        tooltip='The fewest validators that together control more than a third of stake, enough to halt the network. Higher is more decentralised.'
                    />
                    <StatTile label='Jito stake' value={(jitoStake/totalStake*100).toFixed(1)+'%'} detail='running Jito with a MEV commission' />
                    <StatTile
                        label='Vote success'
                        value={stakeWeightedVoteSuccess.toFixed(2)+'%'}
                        detail='stake-weighted, this epoch'
                    />
                </StatGrid>
            </NetworkCard>
            <NetworkCard title='Client versions by stake'>
                <ShareChart rows={stakeShares(staked, (v) => v.version, totalStake)} label='Version' />
            </NetworkCard>
            <NetworkCard title='Stake by country'>
                <ShareChart rows={stakeShares(staked, (v) => v.ip_country, totalStake)} label='Country' />
            </NetworkCard>
            <NetworkCard title='Stake by ASN' tooltip='Autonomous system (network operator) hosting each validator.'>
                <ShareChart rows={stakeShares(staked, (v) => (v.ip_asn) ? v.ip_asn+((v.ip_org) ? ' '+v.ip_org.slice(0, 18) : '') : '', totalStake)} label='ASN' />
            </NetworkCard>
            <NetworkCard title='Stake by city'>
                <ShareChart rows={stakeShares(staked, (v) => v.ip_city, totalStake)} label='City' />
            </NetworkCard>
        </>
    );
}
