import { FC, useEffect, useState } from "react";
import axios from "axios";
import config from '../../config.json'
import { Spinner } from '../common'
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { ValidatorBlockStatsI, ClusterBlockStatsI, PercentilesI } from './interfaces';

const API_URL = process.env.API_BASE_URL;

// Capture indexes are noisy below this many blocks in an epoch
const MIN_BLOCKS = 50;
// Tip data is only complete from this epoch
const FIRST_TIPS_EPOCH = 1067;
const EPOCHS = 10;

const percent = (decimals: number) => (n: number) => (n*100).toFixed(decimals)+'%';
const fixed = (decimals: number) => (n: number) => n.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
const sol = (n: number) => '◎ '+(n/1e9).toFixed(4);

interface BlockPackingRowI {
    label: string;
    tooltip: string;
    validator: (v: ValidatorBlockStatsI) => number | null;
    // Median across validators with 50+ blocks, with p10-p90 range
    median?: (c: ClusterBlockStatsI) => PercentilesI | null;
    // Network-wide figure for the epoch
    average?: (c: ClusterBlockStatsI) => number | null;
    format: (n: number) => string;
    noisy?: boolean;
    tips?: boolean;
}

const rows: BlockPackingRowI[] = [
    {
        label: 'Fee capture index',
        tooltip: "Median over this validator's blocks of block fees vs the median block fees in the same ~5 minute window. 1.00 is a typical block for the market at that moment.",
        validator: (v) => v.fee_capture_index,
        median: (c) => c.validator_fee_capture_index,
        format: fixed(2),
        noisy: true
    },
    {
        label: 'Value capture index',
        tooltip: 'Fee capture index including Jito tips.',
        validator: (v) => v.value_capture_index,
        format: fixed(2),
        noisy: true,
        tips: true
    },
    {
        label: 'Fee per CU',
        tooltip: 'Fees earned per compute unit, in lamports.',
        validator: (v) => v.fee_per_cu,
        median: (c) => c.validator_fee_per_cu,
        format: fixed(3)
    },
    {
        label: 'Priority fee per CU',
        tooltip: 'Priority fees earned per compute unit, in lamports.',
        validator: (v) => v.priority_fee_per_cu,
        average: (c) => c.priority_fee_per_cu,
        format: fixed(3)
    },
    {
        label: 'Fees per block',
        tooltip: 'Average base and priority fees per block produced.',
        validator: (v) => v.fee_per_block,
        average: (c) => c.fee_per_block,
        format: sol
    },
    {
        label: 'Jito tips per block',
        tooltip: 'Average Jito tips per block produced.',
        validator: (v) => v.tips_per_block,
        average: (c) => c.tips_per_block,
        format: sol,
        tips: true
    },
    {
        label: 'Block fullness',
        tooltip: 'Average block cost units as a share of the 50M block limit.',
        validator: (v) => v.fullness,
        average: (c) => c.fullness,
        format: percent(1)
    },
    {
        label: 'Block fullness (p90)',
        tooltip: "90th percentile of this validator's block fullness.",
        validator: (v) => v.fullness_p90,
        format: percent(1)
    },
    {
        label: 'Full blocks',
        tooltip: 'Share of blocks at 99% or more of the block limit.',
        validator: (v) => v.full_block_share,
        average: (c) => c.full_block_share,
        format: percent(2)
    },
    {
        label: 'Transactions per block',
        tooltip: 'Average number of transactions per block.',
        validator: (v) => v.txs_per_block,
        average: (c) => c.txs_per_block,
        format: fixed(0)
    },
    {
        label: 'Failed transactions',
        tooltip: 'Share of included transactions that failed.',
        validator: (v) => v.failed_tx_share,
        average: (c) => c.failed_tx_share,
        format: percent(1)
    },
    {
        label: 'Skip rate',
        tooltip: 'Share of leader slots in which no block was produced, from indexed blocks.',
        validator: (v) => v.skip_rate,
        median: (c) => c.validator_skip_rate,
        format: percent(2)
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

    const renderValidatorValue = (row: BlockPackingRowI) => {
        if(row.tips && v.epoch < FIRST_TIPS_EPOCH) return <span className='text-secondary'>Incomplete</span>;
        const value = row.validator(v);
        if(value==null) return '—';
        return (
            <span className={(row.noisy && lowBlocks) ? 'text-secondary' : null}>
                {row.format(value)}
            </span>
        );
    }

    const renderNetworkValue = (row: BlockPackingRowI) => {
        if(c==undefined) return '—';
        if(row.tips && c.epoch < FIRST_TIPS_EPOCH) return <span className='text-secondary'>Incomplete</span>;
        if(row.median) {
            const percentiles = row.median(c);
            if(percentiles==null) return '—';
            return (
                <>
                    {row.format(percentiles.median)}
                    <span className='text-secondary small ms-1'>median</span>
                </>
            );
        }
        if(row.average) {
            const value = row.average(c);
            if(value==null) return '—';
            return (
                <>
                    {row.format(value)}
                    <span className='text-secondary small ms-1'>network</span>
                </>
            );
        }
        return '—';
    }

    const renderRange = (row: BlockPackingRowI) => {
        if(c==undefined || !row.median) return null;
        const percentiles = row.median(c);
        if(percentiles==null) return null;
        return row.format(percentiles.p10)+' – '+row.format(percentiles.p90);
    }

    return (
        <div>
            <div className='d-flex flex-wrap align-items-center mb-2'>
                <select
                    className='form-select form-select-sm bg-dark text-light w-auto me-3'
                    value={epoch}
                    onChange={(e) => setEpoch(parseInt(e.target.value))}
                >
                    {validatorStats.map((s) => (
                        <option key={s.epoch} value={s.epoch}>
                            Epoch {s.epoch}{(s.final) ? '' : ' (in progress)'}
                        </option>
                    ))}
                </select>
                <span>
                    {v.blocks_produced.toLocaleString()} of {v.leader_slots.toLocaleString()} leader slots produced
                    {(c!=undefined) ? <span className='text-secondary'> · {c.validators.toLocaleString()} leaders network-wide</span> : null}
                </span>
            </div>
            {(lowBlocks) ? (
                <div className='text-warning small mb-2'>
                    Fewer than {MIN_BLOCKS} blocks in this epoch, so the capture indexes are noisy.
                </div>
            ) : null}
            <table className='table table-sm text-white table-dark'>
                <thead>
                    <tr>
                        <th scope='col'>Metric</th>
                        <th scope='col'>This validator</th>
                        <th scope='col'>Network</th>
                        <th scope='col'>
                            Network p10 – p90
                            <OverlayTrigger
                                placement='bottom'
                                overlay={
                                    <Tooltip>
                                        Range across validators with at least {MIN_BLOCKS} blocks in the epoch.
                                    </Tooltip>
                                }
                            >
                                <i className='bi bi-info ps-1'></i>
                            </OverlayTrigger>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.label}>
                            <td>
                                {row.label}
                                <OverlayTrigger
                                    placement='right'
                                    overlay={
                                        <Tooltip>
                                            {row.tooltip}
                                        </Tooltip>
                                    }
                                >
                                    <i className='bi bi-info ps-2'></i>
                                </OverlayTrigger>
                            </td>
                            <td>{renderValidatorValue(row)}</td>
                            <td>{renderNetworkValue(row)}</td>
                            <td className='text-secondary'>{renderRange(row)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
