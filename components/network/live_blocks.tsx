import { CSSProperties, FC, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import config from '../../config.json'
import { validatorI } from '../validator/interfaces';
import { NetworkCard, COLORS, formatNumber } from './common';

const MAX_SLOTS = 64;
const RENDER_INTERVAL_MS = 400;
const RECONNECT_MS = 3000;
const PERFORMANCE_POLL_MS = 60000;
const SCHEDULE_FETCH = 1000;
const UNKNOWN_COLOR = '#64748b';
// Each block is ranked against the blocks seen in roughly the last 5 minutes (~4.7 blocks per second)
const RANK_WINDOW = 1400;
const RANK_MIN_BLOCKS = 30;

type BlockRank = 'top' | 'mid' | 'low' | 'warming';

const RANK_COLORS: {[rank in BlockRank]: string} = {
    top: COLORS.green,
    mid: '#ddaa33',
    low: COLORS.red,
    warming: UNKNOWN_COLOR
};

interface LiveSlotI {
    slot: number;
    skipped: boolean;
    // Passed while the stream was paused or reconnecting, so not watched
    missed?: boolean;
    time?: number;
    leader?: string;
    feeReward?: number;
    // Fee reward relative to the median recent block, and where it falls among recent blocks
    ratio?: number;
    rank?: BlockRank;
}

interface PerformanceI {
    tps: number;
    slotMs: number;
}

const LegendItem: FC<{dot: CSSProperties, label: string, tooltip: string}> = ({dot, label, tooltip}) => (
    <OverlayTrigger placement='bottom' overlay={<Tooltip>{tooltip}</Tooltip>}>
        <span className='network-legend-item'>
            <span className='network-legend-dot' style={dot}></span>{label}
        </span>
    </OverlayTrigger>
);

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

// Confirmed blocks streamed from a public RPC websocket (blockSubscribe without transactions: ~0.5KB per block),
// grouped into leader windows, with each block ranked on arrival by its fee reward against recent blocks
export const LiveBlocks: FC<{validators: validatorI[]}> = ({validators}) => {
    const [slots, setSlots] = useState<LiveSlotI[]>([]);
    const [totals, setTotals] = useState({blocks: 0, skipped: 0, fees: 0});
    const [status, setStatus] = useState<'connecting' | 'live' | 'paused' | 'reconnecting'>('connecting');
    const [performance, setPerformance] = useState<PerformanceI>(null);

    // Notifications arrive several times a second; collect them here and render on an interval
    const pending = useRef<LiveSlotI[]>([]);
    const lastSlot = useRef<number>(null);
    // Leader schedule (slot -> identity) so skipped and upcoming slots have a leader too
    const schedule = useRef<{start: number, leaders: string[]}>(null);
    const scheduleLoading = useRef(false);
    // Fee rewards of recent blocks, oldest first, for ranking each new block
    const recentRewards = useRef<number[]>([]);

    const byIdentity = useRef<{[identity: string]: validatorI}>({});
    useEffect(() => {
        byIdentity.current = Object.fromEntries((validators || []).map((v) => [v.identity, v]));
    }, [validators]);

    const leaderOf = (slot: number) => {
        const s = schedule.current;
        if(!s || slot < s.start || slot >= s.start + s.leaders.length) return undefined;
        return s.leaders[slot - s.start];
    }

    useEffect(() => {
        let ws: WebSocket = null;
        let reconnectTimer = null;
        let stopped = false;

        const loadSchedule = (slot: number) => {
            const s = schedule.current;
            if(scheduleLoading.current || (s && slot < s.start + s.leaders.length - 200)) return;
            scheduleLoading.current = true;
            rpc('getSlotLeaders', [slot - 100, SCHEDULE_FETCH])
                .then((leaders) => { schedule.current = {start: slot - 100, leaders}; })
                .catch((e) => console.log(e))
                .finally(() => { scheduleLoading.current = false; });
        }

        // Rank a block's fee reward against recent blocks: top half, below the median, or bottom 10%
        const rankBlock = (lamports: number): {ratio?: number, rank: BlockRank} => {
            const recent = recentRewards.current;
            let result: {ratio?: number, rank: BlockRank} = {rank: 'warming'};
            if(recent.length >= RANK_MIN_BLOCKS) {
                const sorted = [...recent].sort((a, b) => a - b);
                const p10 = sorted[Math.floor(sorted.length*0.1)];
                const median = sorted[Math.floor(sorted.length*0.5)];
                result = {
                    ratio: (median > 0) ? lamports/median : undefined,
                    rank: (lamports < p10) ? 'low' : (lamports < median) ? 'mid' : 'top'
                };
            }
            recent.push(lamports);
            if(recent.length > RANK_WINDOW) recent.shift();
            return result;
        }

        const handleBlock = (value) => {
            const block = value.block;
            if(!block) return;
            const slot: number = value.slot;
            if(lastSlot.current!=null && slot <= lastSlot.current) return;
            loadSchedule(slot);
            // Slots up to this block's parent that we never saw (tab hidden, reconnecting): not watched, capped to a strip's worth
            if(lastSlot.current!=null && block.parentSlot > lastSlot.current) {
                for(let s = Math.max(lastSlot.current + 1, block.parentSlot + 1 - MAX_SLOTS); s <= block.parentSlot; s++) {
                    pending.current.push({slot: s, skipped: false, missed: true, leader: leaderOf(s)});
                }
            }
            // Slots between the parent and this block had no block: skipped
            const from = Math.max(block.parentSlot + 1, (lastSlot.current ?? block.parentSlot) + 1);
            for(let s = from; s < slot; s++) {
                pending.current.push({slot: s, skipped: true, leader: leaderOf(s)});
            }
            const reward = (block.rewards || []).find((r) => r.rewardType === 'Fee');
            const ranked = (reward) ? rankBlock(reward.lamports) : {rank: 'warming' as BlockRank};
            pending.current.push({slot, skipped: false, time: block.blockTime, leader: reward?.pubkey ?? leaderOf(slot), feeReward: reward?.lamports, ...ranked});
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
                setStatus('connecting');
                connect();
            }
        }

        const render = setInterval(() => {
            if(pending.current.length === 0) return;
            const batch = pending.current;
            pending.current = [];
            setSlots((current) => [...[...batch].reverse(), ...current].slice(0, MAX_SLOTS));
            setTotals((t) => ({
                blocks: t.blocks + batch.filter((r) => !r.skipped && !r.missed).length,
                skipped: t.skipped + batch.filter((r) => r.skipped).length,
                fees: t.fees + batch.reduce((sum, r) => sum + (r.feeReward || 0), 0)
            }));
        }, RENDER_INTERVAL_MS);

        const pollPerformance = () => {
            rpc('getRecentPerformanceSamples', [5])
                .then((samples) => {
                    if(!samples?.length) return;
                    const transactions = samples.reduce((sum, s) => sum + s.numTransactions, 0);
                    const seconds = samples.reduce((sum, s) => sum + s.samplePeriodSecs, 0);
                    const slotCount = samples.reduce((sum, s) => sum + s.numSlots, 0);
                    setPerformance({tps: transactions/seconds, slotMs: seconds/slotCount*1000});
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

    // Group consecutive slots by leader (leaders get windows of consecutive slots), keeping unwatched slots apart
    let groups: {leader: string, missed: boolean, slots: LiveSlotI[]}[] = [];
    for(const s of slots) {
        const last = groups[groups.length - 1];
        if(last && last.leader === s.leader && last.missed === !!s.missed) last.slots.push(s);
        else groups.push({leader: s.leader, missed: !!s.missed, slots: [s]});
    }

    // The next leader window after the latest slot, from the schedule
    const latest = slots[0]?.slot;
    let next: {leader: string, count: number} = null;
    if(latest!=null) {
        const current = leaderOf(latest);
        let s = latest + 1;
        while(leaderOf(s)!=null && leaderOf(s) === current) s++;
        const nextLeader = leaderOf(s);
        if(nextLeader) {
            let count = 0;
            while(leaderOf(s + count) === nextLeader && count < 8) count++;
            next = {leader: nextLeader, count};
        }
    }

    const validatorFor = (identity: string) => (identity) ? byIdentity.current[identity] : undefined;
    const nameFor = (identity: string) => {
        const v = validatorFor(identity);
        if(v?.name) return v.name;
        return (identity) ? identity.slice(0, 4)+'…'+identity.slice(-4) : 'Unknown leader';
    }

    const missedTooltip = (identity: string, groupSlots: LiveSlotI[]) => (
        <Tooltip>
            {(identity) ? <div className='fw-bold'>{nameFor(identity)}</div> : null}
            <div>{groupSlots.length} slots not watched: they passed while this tab was in the background or the stream was reconnecting.</div>
        </Tooltip>
    );

    const leaderTooltip = (identity: string, groupSlots: LiveSlotI[]) => {
        const v = validatorFor(identity);
        const produced = groupSlots.filter((s) => !s.skipped);
        const fees = produced.reduce((sum, s) => sum + (s.feeReward || 0), 0);
        const ratios = produced.filter((s) => s.ratio!=null).map((s) => s.ratio);
        const averageRatio = (ratios.length > 0) ? ratios.reduce((sum, r) => sum + r, 0)/ratios.length : null;
        return (
            <Tooltip>
                <div className='fw-bold'>{nameFor(identity)}</div>
                {(v) ? (
                    <>
                        <div>Wiz Score {v.wiz_score.toFixed(1)}% (#{v.rank})</div>
                        <div>Block production {(v.block_production!=null) ? v.block_production.toFixed(1)+'%' : '—'}</div>
                        <div>Vote success {v.vote_success.toFixed(1)}%</div>
                    </>
                ) : <div>Not in the Stakewiz validator list</div>}
                <div>{produced.length} blocks, {groupSlots.length - produced.length} skipped · ◎ {(fees/1e9).toFixed(4)} fees</div>
                {(averageRatio!=null) ? <div>These blocks: {averageRatio.toFixed(2)}× the median recent block</div> : null}
            </Tooltip>
        );
    }

    const renderLeaderName = (identity: string) => {
        const v = validatorFor(identity);
        if(v) return <Link href={'/validator/'+v.vote_identity}>{nameFor(identity)}</Link>;
        return nameFor(identity);
    }

    const statusBadge = {
        connecting: <span className='badge bg-secondary'>Connecting…</span>,
        live: <span className='badge bg-success'>● Live</span>,
        paused: <span className='badge bg-secondary'>Paused</span>,
        reconnecting: <span className='badge bg-warning text-dark'>Reconnecting…</span>
    }[status];

    const observed = totals.blocks + totals.skipped;

    return (
        <NetworkCard title='Live blocks' tooltip='Confirmed blocks streamed from a public Solana RPC as they are produced, grouped by leader. Each block is ranked as it arrives by the fee reward it earned its leader, against every block seen in about the last 5 minutes. Hover a block for its value, or a leader for their Stakewiz stats.' full={true}>
            <div className='d-flex flex-wrap align-items-center gap-3 small mb-1'>
                {statusBadge}
                <span>Slot <span className='fw-bold' style={{color: COLORS.cyan}}>{(latest) ? formatNumber(latest) : '—'}</span></span>
                <span><span className='fw-bold' style={{color: COLORS.purple}}>{(performance) ? Math.round(performance.slotMs) : '—'}ms</span> slots</span>
                <span><span className='fw-bold' style={{color: COLORS.teal}}>{(performance) ? formatNumber(performance.tps) : '—'}</span> TPS</span>
                <span><span className='fw-bold' style={{color: COLORS.red}}>{formatNumber(totals.skipped)}</span> skipped of {formatNumber(observed)} seen</span>
                <span className='ms-auto text-secondary'>
                    <LegendItem dot={{background: RANK_COLORS.top}} label='top half' tooltip='The fee reward this block earned its leader is at or above the median of all blocks seen in about the last 5 minutes.' />
                    <LegendItem dot={{background: RANK_COLORS.mid}} label='below median' tooltip='The fee reward is below the median of blocks seen in about the last 5 minutes, but not in the bottom 10%.' />
                    <LegendItem dot={{background: RANK_COLORS.low}} label='bottom 10%' tooltip='The fee reward is lower than 90% of blocks seen in about the last 5 minutes.' />
                    <LegendItem dot={{border: '2px dashed '+COLORS.red}} label='skipped' tooltip='The leader did not produce a block in this slot.' />
                    <LegendItem dot={{background: RANK_COLORS.warming}} label='not ranked yet' tooltip={'Blocks are ranked once '+RANK_MIN_BLOCKS+' blocks have been seen since the page opened.'} />
                    <LegendItem dot={{border: '2px dashed '+UNKNOWN_COLOR}} label='not watched' tooltip='Slots that passed while this tab was in the background or the stream was reconnecting, so they were not streamed.' />
                </span>
            </div>
            <div className='network-live-strip'>
                {(next) ? (
                    <div className='network-leader-group next' key={'next-'+next.leader}>
                        <div className='network-leader-name text-secondary'>Next: {nameFor(next.leader)}</div>
                        <div className='d-flex gap-1'>
                            {Array.from({length: next.count}).map((_, i) => <div key={i} className='network-block upcoming'></div>)}
                        </div>
                    </div>
                ) : null}
                {(groups.length === 0) ? <div className='text-secondary small p-2'>Waiting for blocks…</div> : groups.map((g) => (
                    <OverlayTrigger key={g.slots[g.slots.length - 1].slot} placement='bottom' overlay={(g.missed) ? missedTooltip(g.leader, g.slots) : leaderTooltip(g.leader, g.slots)}>
                        <div className={'network-leader-group'+((g.missed) ? ' missed' : '')}>
                            <div className='network-leader-name'>{(g.missed && !g.leader) ? 'Not watched' : renderLeaderName(g.leader)}</div>
                            <div className='d-flex gap-1'>
                                {g.slots.map((s) => (
                                    <div
                                        key={s.slot}
                                        className={'network-block'+((s.missed) ? ' missed' : (s.skipped) ? ' skipped' : '')}
                                        style={{'--block': RANK_COLORS[s.rank ?? 'warming']} as CSSProperties}
                                        title={'Slot '+formatNumber(s.slot)+((s.missed) ? ' · not watched' : (s.skipped) ? ' · skipped' : (s.feeReward!=null) ? ' · ◎ '+(s.feeReward/1e9).toFixed(5)+' fees'+((s.ratio!=null) ? ' · '+s.ratio.toFixed(2)+'× median recent block' : ' · ranking after '+RANK_MIN_BLOCKS+' blocks') : '')}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    </OverlayTrigger>
                ))}
            </div>
        </NetworkCard>
    );
}
