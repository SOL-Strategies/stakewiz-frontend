import { FC, useEffect, useRef, useState } from "react";
import axios from "axios";
import config from '../../config.json'
import { Spinner } from '../common'
import Chart from "react-google-charts";

const API_URL = process.env.API_BASE_URL;

const GREEN = '#55bb55';
const RED = '#bb5555';
const CLOSE_DELAY_MS = 250;

interface StakeAccountI {
    pubkey: string;
    delegated_amount: string;
}

interface PendingStakeI {
    activating: {amount: number, count: number, stake_accounts: StakeAccountI[]};
    deactivating: {amount: number, count: number, stake_accounts: StakeAccountI[]};
}

const formatSol = (sol: number) => '◎ '+Math.round(sol).toLocaleString();

const byAmount = (accounts: StakeAccountI[]) => [...accounts].sort((a, b) => parseFloat(b.delegated_amount) - parseFloat(a.delegated_amount));

// Active stake over the last 30 epochs, with this epoch's pending activations and deactivations
// projected one epoch ahead as a dashed line to a pulsing dot
export const StakeHistoryChart: FC<{vote_identity: string, updateStake?: Function}> = ({vote_identity, updateStake}) => {
    const [stakes, setStakes] = useState<{epoch: number, stake: number}[]>(null);
    const [pending, setPending] = useState<PendingStakeI>(null);
    const [dot, setDot] = useState<{x: number, y: number}>(null);
    const [open, setOpen] = useState(false);
    const closeTimer = useRef(null);
    // The drawn chart and the projected point, kept in refs so the dot is placed from the latest data:
    // the stake history and pending stake load separately, and the chart's 'ready' handler is bound once
    const chartRef = useRef(null);
    const target = useRef<{epoch: number, stake: number}>(null);

    const positionDot = () => {
        const chart = chartRef.current;
        const t = target.current;
        if(!chart || !t) return setDot(null);
        // getChartLayoutInterface exists on Google core charts but is missing from the wrapper typings
        const layout = chart.getChartLayoutInterface();
        const x = Math.round(layout.getXLocation(t.epoch));
        const y = Math.round(layout.getYLocation(t.stake));
        if(!isFinite(x) || !isFinite(y)) return setDot(null);
        // Redraws fire 'ready' again; only update when the position moves to avoid a render loop
        setDot((previous) => (previous && previous.x === x && previous.y === y) ? previous : {x, y});
    }

    useEffect(() => {
        positionDot();
    }, [stakes, pending]);

    useEffect(() => {
        axios(API_URL+config.API_ENDPOINTS.validator_total_stakes+"/"+vote_identity, {
            headers: {'Content-Type':'application/json'}
        })
            .then(response => {
                const json = response.data;
                if(json.length > 0) setStakes([...json].sort((a, b) => a.epoch - b.epoch));
            })
            .catch(e => console.log(e));
        axios(API_URL+config.API_ENDPOINTS.validator_epoch_stake_accounts+"/"+vote_identity, {
            headers: {'Content-Type':'application/json'}
        })
            .then(response => {
                const json: PendingStakeI = response.data;
                setPending(json);
                if(updateStake) updateStake(json.activating.amount - json.deactivating.amount);
            })
            .catch(e => console.log(e));
    }, [vote_identity]);

    if(stakes==null) {
        return <Spinner />
    }

    const change = (pending) ? pending.activating.amount - pending.deactivating.amount : 0;
    const hasPending = pending!=null && (pending.activating.count > 0 || pending.deactivating.count > 0);
    const last = stakes[stakes.length - 1];
    const projected = last.stake + change;
    const changeColor = (change >= 0) ? GREEN : RED;
    target.current = (hasPending) ? {epoch: last.epoch + 1, stake: projected} : null;

    // Column types are explicit: Google Charts cannot infer a type for a column that is all nulls.
    // The pending series is only added when there are pending changes.
    let data: any[] = [[{label: 'Epoch', type: 'number'}, {label: 'Stake', type: 'number'}, ...((hasPending) ? [{label: 'Pending', type: 'number'}] : [])]];
    stakes.forEach((s) => data.push([s.epoch, s.stake, ...((hasPending) ? [(s.epoch === last.epoch) ? s.stake : null] : [])]));
    if(hasPending) data.push([last.epoch + 1, null, projected]);

    // Hovering the figure, the dot or the list keeps the list open; leaving all of them closes it
    const show = () => {
        clearTimeout(closeTimer.current);
        setOpen(true);
    }
    const hide = () => {
        clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
    }

    const renderAccounts = (title: string, accounts: StakeAccountI[], amount: number, color: string) => (
        <div className='stake-pending-column'>
            <div className='fw-bold mb-1' style={{color}}>{title} · {formatSol(amount)}</div>
            {(accounts.length === 0) ? <div className='text-secondary'>None</div> : byAmount(accounts).map((a) => (
                <div key={a.pubkey} className='d-flex justify-content-between gap-2'>
                    <a href={config.EXPLORER_ACCOUNT_BASE+a.pubkey} target='_blank' rel='noreferrer' className='text-white text-truncate'>
                        {a.pubkey.slice(0, 4)}…{a.pubkey.slice(-4)}
                    </a>
                    <span className='text-nowrap'>{formatSol(parseFloat(a.delegated_amount))}</span>
                </div>
            ))}
        </div>
    );

    return (
        <div className='stake-history'>
            {(hasPending) ? (
                <div className='stake-pending-label small' onMouseEnter={show} onMouseLeave={hide}>
                    <span className='fw-bold' style={{color: changeColor}}>{(change >= 0) ? '+' : '−'}{formatSol(Math.abs(change))}</span>
                    <span className='text-secondary'> next epoch → {formatSol(projected)}</span>
                </div>
            ) : (
                <div className='stake-pending-label small text-secondary'>No pending stake changes</div>
            )}
            <Chart
                chartType='LineChart'
                width="100%"
                height="20rem"
                data={data}
                options={{
                    backgroundColor: 'none',
                    colors: ['#fff', changeColor],
                    lineWidth: 2,
                    series: {
                        1: { lineDashStyle: [4, 4], lineWidth: 2 }
                    },
                    legend:{
                        position:'none'
                    },
                    vAxis: {
                        gridlines: {
                            color: 'transparent'
                        },
                        textStyle: {
                            color: '#fff'
                        },
                        format: 'short'
                    },
                    hAxis: {
                        gridlines: {
                            color: 'transparent'
                        },
                        textStyle: {
                            color: '#fff'
                        },
                        format: '#'
                    },
                    chartArea: {
                        top: 30,
                        left: 50,
                        width:'85%',
                        height:'75%'
                    },
                    allowAsync: true
                }}
                chartEvents={[{
                    eventName: 'ready',
                    callback: ({chartWrapper}) => {
                        // Place the pulsing dot over the projected point once the chart has drawn
                        chartRef.current = chartWrapper.getChart();
                        positionDot();
                    }
                }]}
            />
            {(hasPending && dot) ? (
                <div
                    className='stake-pending-dot'
                    style={{left: dot.x, top: dot.y, background: changeColor, color: changeColor}}
                    onMouseEnter={show}
                    onMouseLeave={hide}
                ></div>
            ) : null}
            {(hasPending && open) ? (
                <div className='stake-pending-panel small' onMouseEnter={show} onMouseLeave={hide}>
                    <div className='text-secondary mb-2'>
                        Stake changing at the end of epoch {last.epoch}: {formatSol(last.stake)} now → {formatSol(projected)}
                    </div>
                    <div className='stake-pending-columns'>
                        {renderAccounts('Activating', pending.activating.stake_accounts, pending.activating.amount, GREEN)}
                        {renderAccounts('Deactivating', pending.deactivating.stake_accounts, pending.deactivating.amount, RED)}
                    </div>
                </div>
            ) : null}
        </div>
    )
}
