import { FC, useEffect, useState } from "react";
import axios from "axios";
import config from '../../config.json'
import { Spinner } from '../common'
import { ValidatorBlockI, ValidatorBlocksI } from './interfaces';

const API_URL = process.env.API_BASE_URL;

const BLOCK_LIMIT = 100;
const POLL_MS = 5000;

// Block production score is fee capture vs the epoch p90 benchmark, capped at 1
const scoreColor = (score: number) => (score >= 0.9) ? '#55bb55' : (score < 0.5) ? '#bb5555' : '#ddaa33';

const timeAgo = (seconds: number) => {
    const age = Math.max(0, Math.round(Date.now()/1000 - seconds));
    if(age < 60) return age+'s ago';
    if(age < 3600) return Math.floor(age/60)+'m ago';
    if(age < 86400) return Math.floor(age/3600)+'h ago';
    return Math.floor(age/86400)+'d ago';
}

const formatCus = (cu: number) => (cu/1e6).toFixed(2)+'M';
const sol = (lamports: number) => '◎ '+(lamports/1e9).toFixed(5);

export const RecentBlocks: FC<{vote_identity: string}> = ({vote_identity}) => {
    const [data, setData] = useState<ValidatorBlocksI>(null);
    const [newest, setNewest] = useState<number>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let stopped = false;
        let previousNewest: number = null;

        const load = () => {
            if(document.hidden) return;
            axios(API_URL+config.API_ENDPOINTS.validator_blocks+'/'+vote_identity+'?limit='+BLOCK_LIMIT, {
                headers: {'Content-Type':'application/json'}
            })
                .then(response => {
                    if(stopped) return;
                    const json: ValidatorBlocksI = response.data;
                    // Remember the previous newest slot so rows that arrive on a poll can be highlighted
                    setNewest(previousNewest);
                    previousNewest = json.blocks[0]?.slot ?? previousNewest;
                    setData(json);
                    setFailed(false);
                })
                .catch(e => {
                    console.log(e);
                    if(!stopped) setFailed(true);
                });
        }

        load();
        const timer = setInterval(load, POLL_MS);
        return () => {
            stopped = true;
            clearInterval(timer);
        }
    }, [vote_identity]);

    if(data==null) {
        return (failed) ? <div className='text-secondary'>Could not load recent blocks.</div> : <Spinner />;
    }

    if(data.blocks.length === 0) {
        return <div className='text-secondary'>No leader slots indexed for this validator yet.</div>;
    }

    const s = data.summary;
    return (
        <div className='recent-blocks'>
            <div className='d-flex flex-wrap gap-3 small mb-2'>
                <span>
                    Score over last {s.leader_slots} slots:{' '}
                    {(s.block_production_score!=null) ? (
                        <span className='fw-bold' style={{color: scoreColor(s.block_production_score)}}>{(s.block_production_score*100).toFixed(0)}%</span>
                    ) : '—'}
                </span>
                <span className='text-secondary'>
                    {s.blocks_produced} produced · <span className={(s.skipped_slots > 0) ? 'text-danger' : null}>{s.skipped_slots} skipped</span>
                </span>
            </div>
            <div className='recent-blocks-scroll'>
                <table className='table table-sm text-white table-dark mb-0'>
                    <thead>
                        <tr>
                            <th scope='col'>Slot</th>
                            <th scope='col' className='text-end'>Score</th>
                            <th scope='col' className='text-end'>CUs</th>
                            <th scope='col' className='text-end'>Fees</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.blocks.map((b: ValidatorBlockI) => (
                            <tr key={b.slot} className={((newest!=null && b.slot > newest) ? 'recent-block-new' : '')+((b.skipped) ? ' recent-block-skipped' : '')}>
                                <td>
                                    <a href={config.EXPLORER_BLOCK_BASE+b.slot} target='_blank' rel='noreferrer' className='text-white'>{b.slot.toLocaleString()}</a>
                                    {(b.block_time) ? <div className='small text-secondary'>{timeAgo(b.block_time)}</div> : null}
                                </td>
                                {(b.skipped) ? (
                                    <td colSpan={3} className='text-end text-danger align-middle'>Skipped</td>
                                ) : (
                                    <>
                                        <td className='text-end align-middle fw-bold' style={(b.block_production_score!=null) ? {color: scoreColor(b.block_production_score)} : null}>
                                            {(b.block_production_score!=null) ? (b.block_production_score*100).toFixed(0)+'%' : '—'}
                                        </td>
                                        <td className='text-end align-middle'>{(b.cu_total!=null) ? formatCus(b.cu_total) : '—'}</td>
                                        <td className='text-end align-middle text-nowrap'>{(b.fee_total!=null) ? sol(b.fee_total) : '—'}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
