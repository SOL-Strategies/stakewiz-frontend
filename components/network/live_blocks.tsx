import { FC, useEffect, useRef, useState } from "react";
import Link from "next/link";
import config from '../../config.json'
import { validatorI } from '../validator/interfaces';
import { NetworkCard, StatTile, StatGrid, formatNumber } from './common';

const MAX_ROWS = 14;
const RENDER_INTERVAL_MS = 500;
const RECONNECT_MS = 3000;
const PERFORMANCE_POLL_MS = 60000;

interface LiveSlotI {
    slot: number;
    skipped: boolean;
    time?: number;
    leader?: string;
    feeReward?: number;
}

interface LiveTotalsI {
    blocks: number;
    skipped: number;
    since: number;
}

interface PerformanceI {
    tps: number;
    slotMs: number;
}

const rpc = async (method: string, params: any[] = []) => {
    const response = await fetch(config.PUBLIC_RPC_HTTP, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params})
    });
    const json = await response.json();
    if(json.error) throw new Error(json.error.message);
    return json.result;
}

// Streams confirmed blocks from a public RPC websocket (blockSubscribe without transactions: ~0.5KB per block)
export const LiveBlocks: FC<{validators: validatorI[]}> = ({validators}) => {
    const [rows, setRows] = useState<LiveSlotI[]>([]);
    const [totals, setTotals] = useState<LiveTotalsI>({blocks: 0, skipped: 0, since: Date.now()});
    const [status, setStatus] = useState<'connecting' | 'live' | 'paused' | 'reconnecting'>('connecting');
    const [performance, setPerformance] = useState<PerformanceI>(null);
    const [, setTick] = useState(0);

    // Notifications arrive several times a second; collect them here and render on an interval
    const pending = useRef<LiveSlotI[]>([]);
    const lastSlot = useRef<number>(null);

    const leaders = useRef<{[identity: string]: validatorI}>({});
    useEffect(() => {
        leaders.current = Object.fromEntries((validators || []).map((v) => [v.identity, v]));
    }, [validators]);

    useEffect(() => {
        let ws: WebSocket = null;
        let reconnectTimer = null;
        let stopped = false;

        const handleBlock = (value) => {
            const block = value.block;
            if(!block) return;
            const slot: number = value.slot;
            if(lastSlot.current!=null && slot <= lastSlot.current) return;
            // Slots between the parent and this block had no block: skipped
            const from = Math.max(block.parentSlot + 1, (lastSlot.current ?? block.parentSlot) + 1);
            for(let s = from; s < slot; s++) {
                pending.current.push({slot: s, skipped: true});
            }
            const reward = (block.rewards || []).find((r) => r.rewardType === 'Fee');
            pending.current.push({slot, skipped: false, time: block.blockTime, leader: reward?.pubkey, feeReward: reward?.lamports});
            lastSlot.current = slot;
        }

        const connect = () => {
            if(stopped) return;
            ws = new WebSocket(config.PUBLIC_RPC_WS);
            ws.onopen = () => {
                setStatus('live');
                ws.send(JSON.stringify({
                    jsonrpc: '2.0', id: 1, method: 'blockSubscribe',
                    params: ['all', {commitment: 'confirmed', transactionDetails: 'none', showRewards: true, maxSupportedTransactionVersion: 1}]
                }));
            }
            ws.onmessage = (e) => {
                const message = JSON.parse(e.data);
                if(message.method === 'blockNotification') handleBlock(message.params.result.value);
            }
            ws.onclose = () => {
                if(stopped) return;
                setStatus('reconnecting');
                reconnectTimer = setTimeout(connect, RECONNECT_MS);
            }
            ws.onerror = () => ws.close();
        }

        const disconnect = () => {
            clearTimeout(reconnectTimer);
            if(ws) {
                ws.onclose = null;
                ws.close();
                ws = null;
            }
        }

        // Pause while the tab is hidden so a background tab doesn't keep streaming
        const onVisibility = () => {
            if(document.hidden) {
                disconnect();
                setStatus('paused');
            }
            else {
                lastSlot.current = null;
                setStatus('connecting');
                connect();
            }
        }

        const render = setInterval(() => {
            if(pending.current.length === 0) {
                setTick((t) => t + 1);
                return;
            }
            const batch = pending.current;
            pending.current = [];
            setRows((current) => [...batch.reverse(), ...current].slice(0, MAX_ROWS));
            setTotals((t) => ({
                ...t,
                blocks: t.blocks + batch.filter((r) => !r.skipped).length,
                skipped: t.skipped + batch.filter((r) => r.skipped).length
            }));
        }, RENDER_INTERVAL_MS);

        const pollPerformance = () => {
            rpc('getRecentPerformanceSamples', [5])
                .then((samples) => {
                    if(!samples?.length) return;
                    const transactions = samples.reduce((sum, s) => sum + s.numTransactions, 0);
                    const seconds = samples.reduce((sum, s) => sum + s.samplePeriodSecs, 0);
                    const slots = samples.reduce((sum, s) => sum + s.numSlots, 0);
                    setPerformance({tps: transactions/seconds, slotMs: seconds/slots*1000});
                })
                .catch((e) => console.log(e));
        }
        pollPerformance();
        const performanceTimer = setInterval(pollPerformance, PERFORMANCE_POLL_MS);

        connect();
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            stopped = true;
            disconnect();
            clearInterval(render);
            clearInterval(performanceTimer);
            document.removeEventListener('visibilitychange', onVisibility);
        }
    }, []);

    const latest = rows.find((r) => !r.skipped);
    const observed = totals.blocks + totals.skipped;
    const now = Date.now()/1000;

    const renderLeader = (identity: string) => {
        const v = leaders.current[identity];
        if(!v) return <span className='text-secondary'>{identity.slice(0, 6)}…{identity.slice(-4)}</span>;
        return (
            <Link href={'/validator/'+v.vote_identity} className='text-white'>
                {(v.name) ? v.name : identity.slice(0, 6)+'…'+identity.slice(-4)}
            </Link>
        );
    }

    const statusBadge = {
        connecting: <span className='badge bg-secondary'>Connecting…</span>,
        live: <span className='badge bg-success'>● Live</span>,
        paused: <span className='badge bg-secondary'>Paused</span>,
        reconnecting: <span className='badge bg-warning text-dark'>Reconnecting…</span>
    }[status];

    return (
        <NetworkCard title='Live blocks' tooltip='Confirmed blocks streamed from a public Solana RPC as they are produced. Skipped slots are slots with no block between one block and the next.' full={true}>
            <div className='d-flex justify-content-between align-items-center mb-2'>
                {statusBadge}
                <span className='small text-secondary'>via {new URL(config.PUBLIC_RPC_HTTP).hostname}</span>
            </div>
            <StatGrid>
                <StatTile label='Latest slot' value={(latest) ? formatNumber(latest.slot) : '—'} />
                <StatTile
                    label='Slot time'
                    value={(performance) ? Math.round(performance.slotMs)+'ms' : '—'}
                    detail='last 5 minutes'
                />
                <StatTile
                    label='TPS'
                    value={(performance) ? formatNumber(performance.tps) : '—'}
                    detail='last 5 minutes'
                    tooltip='Transactions per second from the RPC node performance samples. Under Alpenglow votes are not transactions, so this is user transactions only.'
                />
                <StatTile
                    label='Skipped slots'
                    value={formatNumber(totals.skipped)}
                    detail={(observed > 0) ? (totals.skipped/observed*100).toFixed(2)+'% of '+formatNumber(observed)+' seen' : 'since you opened this page'}
                />
            </StatGrid>
            <div className='table-responsive mt-2'>
                <table className='table table-sm text-white table-dark mb-0 network-live-table'>
                    <thead>
                        <tr>
                            <th scope='col'>Slot</th>
                            <th scope='col'>Leader</th>
                            <th scope='col' className='text-end text-nowrap'>Fee reward</th>
                            <th scope='col' className='text-end'>Age</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(rows.length === 0) ? (
                            <tr><td colSpan={4} className='text-secondary'>Waiting for blocks…</td></tr>
                        ) : rows.map((r) => (
                            <tr key={r.slot} className={(r.skipped) ? 'text-danger' : null}>
                                <td>{formatNumber(r.slot)}</td>
                                <td>{(r.skipped) ? 'Skipped' : (r.leader) ? renderLeader(r.leader) : '—'}</td>
                                <td className='text-end text-nowrap'>{(r.feeReward!=null) ? '◎ '+(r.feeReward/1e9).toFixed(5) : ''}</td>
                                <td className='text-end text-nowrap'>{(r.time) ? Math.max(0, Math.round(now - r.time))+'s' : ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </NetworkCard>
    );
}
