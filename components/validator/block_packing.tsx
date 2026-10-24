import { FC, useEffect, useState } from "react";
import axios from "axios";
import config from '../../config.json'
import { Spinner } from '../common'
import Chart from "react-google-charts";
import { ValidatorBlockStatsI, ClusterBlockStatsI } from './interfaces';

const API_URL = process.env.API_BASE_URL;

// Capture indexes are noisy below this many blocks in an epoch (the API's per-validator threshold)
const MIN_BLOCKS = 12;
// Tip data is only complete from this epoch
const FIRST_TIPS_EPOCH = 1067;
const EPOCHS = 10;

const percent = (decimals: number) => (n: number) => (n*100).toFixed(decimals)+'%';
const fixed = (decimals: number) => (n: number) => n.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
const sol = (n: number) => '◎ '+(n/1e9).toFixed(4);

interface BlockPackingMetricI {
    label: string;
    validator: (v: ValidatorBlockStatsI) => number | null;
    // Median across validators with 50+ blocks, falling back to the network-wide figure for the epoch
    network: (c: ClusterBlockStatsI) => number | null;
    networkLabel: string;
    format: (n: number) => string;
    tips?: boolean;
}

const metrics: BlockPackingMetricI[] = [
    {
        label: 'Fee capture',
        validator: (v) => v.fee_capture_index,
        network: (c) => c.validator_fee_capture_index?.median,
        networkLabel: 'Network median',
        format: fixed(2)
    },
    {
        label: 'Fee per CU',
        validator: (v) => v.fee_per_cu,
        network: (c) => c.validator_fee_per_cu?.median,
        networkLabel: 'Network median',
        format: (n) => fixed(3)(n)+' lamports'
    },
    {
        label: 'Priority fee per CU',
        validator: (v) => v.priority_fee_per_cu,
        network: (c) => c.priority_fee_per_cu,
        networkLabel: 'Network',
        format: (n) => fixed(3)(n)+' lamports'
    },
    {
        label: 'Fees per block',
        validator: (v) => v.fee_per_block,
        network: (c) => c.fee_per_block,
        networkLabel: 'Network',
        format: sol
    },
    {
        label: 'Jito tips per block',
        validator: (v) => v.tips_per_block,
        network: (c) => c.tips_per_block,
        networkLabel: 'Network',
        format: sol,
        tips: true
    },
    {
        label: 'Block fullness',
        validator: (v) => v.fullness,
        network: (c) => c.fullness,
        networkLabel: 'Network',
        format: percent(1)
    },
    {
        label: 'Transactions per block',
        validator: (v) => v.txs_per_block,
        network: (c) => c.txs_per_block,
        networkLabel: 'Network',
        format: fixed(0)
    },
    {
        label: 'Failed transactions',
        validator: (v) => v.failed_tx_share,
        network: (c) => c.failed_tx_share,
        networkLabel: 'Network',
        format: percent(1)
    }
];

export const BlockPacking: FC<{vote_identity: string}> = ({vote_identity}) => {
    const [validatorStats, setValidatorStats] = useState<ValidatorBlockStatsI[]>(null);
    const [clusterStats, setClusterStats] = useState<ClusterBlockStatsI[]>(null);
    const [epoch, setEpoch] = useState<number>(null);

    useEffect(() => {
        Promise.all([
            axios(API_URL+config.API_ENDPOINTS.validator_block_stats+"/"+vote_identity+"?epochs="+EPOCHS, {
                headers: {'Content-Type':'application/json'}
            }),
            axios(API_URL+config.API_ENDPOINTS.cluster_block_stats+"?epochs="+EPOCHS, {
                headers: {'Content-Type':'application/json'}
            })
        ])
            .then(([validatorResponse, clusterResponse]) => {
            setValidatorStats(validatorResponse.data);
            setClusterStats(clusterResponse.data);
            if(validatorResponse.data.length>0) setEpoch(validatorResponse.data[0].epoch);
            })
            .catch(e => {
            console.log(e);
            })
    }, [vote_identity]);

    if(validatorStats==null || clusterStats==null) {
        return <Spinner />
    }

    if(validatorStats.length==0) {
        return (
            <div className='text-secondary'>
                No blocks produced since Alpenglow activated in epoch 1064.
            </div>
        )
    }

    const v = validatorStats.find((s) => s.epoch==epoch);
    const c = clusterStats.find((s) => s.epoch==epoch);
    const lowBlocks = v.blocks_produced < MIN_BLOCKS;

    // Each bar is this validator as a share of the network figure, drawn from a 100% baseline
    let data: any[] = [[
        'Metric',
        'vs network',
        {role: 'tooltip'}
    ]];
    if(c!=undefined) {
        for(const metric of metrics) {
            if(metric.tips && epoch < FIRST_TIPS_EPOCH) continue;
            const validatorValue = metric.validator(v);
            const networkValue = metric.network(c);
            if(validatorValue==null || !networkValue) continue;
            const ratio = validatorValue / networkValue;
            data.push([
                metric.label,
                ratio,
                metric.label+'\nThis validator: '+metric.format(validatorValue)+'\n'+metric.networkLabel+': '+metric.format(networkValue)+'\n'+percent(0)(ratio)+' of network'
            ]);
        }
    }

    // Total skipped / total leader slots, so effectively stake-weighted as leader slots follow stake
    const networkSkipRate = c?.skip_rate;

    return (
        <div>
            <div className='d-flex flex-wrap align-items-center'>
                <select
                    className='form-select form-select-sm bg-dark text-light w-auto me-2'
                    value={epoch}
                    onChange={(e) => setEpoch(parseInt(e.target.value))}
                >
                    {validatorStats.map((s) => (
                        <option key={s.epoch} value={s.epoch}>
                            Epoch {s.epoch}{(s.final) ? '' : ' (in progress)'}
                        </option>
                    ))}
                </select>
                <span className='small'>
                    {v.blocks_produced.toLocaleString()}/{v.leader_slots.toLocaleString()} blocks · skip rate {percent(2)(v.skip_rate)}
                    {(networkSkipRate!=null) ? <span className='text-secondary' title='Stake-weighted: total skipped slots over total leader slots across the network'> (network {percent(2)(networkSkipRate)})</span> : null}
                </span>
            </div>
            {(lowBlocks) ? (
                <div className='text-warning small mt-1'>
                    Fewer than {MIN_BLOCKS} blocks in this epoch, so these figures are noisy.
                </div>
            ) : null}
            {(data.length>1) ? (
                <Chart
                    chartType='BarChart'
                    width="100%"
                    height="17rem"
                    data={data}
                    options={{
                        backgroundColor: 'none',
                        colors: ['#fff'],
                        legend: {
                            position: 'none'
                        },
                        bar: {
                            groupWidth: '60%'
                        },
                        hAxis: {
                            baseline: 1,
                            baselineColor: '#ffc107',
                            format: 'percent',
                            gridlines: {
                                color: 'transparent'
                            },
                            textStyle: {
                                color: '#fff'
                            }
                        },
                        vAxis: {
                            textStyle: {
                                color: '#fff'
                            }
                        },
                        chartArea: {
                            top: 10,
                            left: 150,
                            width: '100%',
                            height: '85%'
                        },
                        allowAsync: true
                    }}
                />
            ) : (
                <div className='text-secondary mt-3'>
                    Network figures for this epoch are not available yet.
                </div>
            )}
        </div>
    )
}
