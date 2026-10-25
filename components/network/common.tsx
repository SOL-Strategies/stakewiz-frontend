import { FC, ReactNode } from "react";
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

export const percent = (n: number, decimals = 1) => parseFloat((n*100).toFixed(decimals))+'%';
export const sol = (lamports: number, decimals = 4) => '◎ '+(lamports/1e9).toFixed(decimals);
export const formatNumber = (n: number, decimals = 0) => n.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals});

// Shared look for the Google charts on the network page, matching the validator page charts
export const chartOptions = (extra: object = {}) => ({
    backgroundColor: 'none',
    colors: ['#fff', '#ffc107', '#0dcaf0'],
    legend: { position: 'none' },
    hAxis: { gridlines: { color: 'transparent' }, textStyle: { color: '#fff' } },
    vAxis: { gridlines: { color: 'transparent' }, textStyle: { color: '#fff' } },
    chartArea: { top: 20, left: 60, width: '85%', height: '75%' },
    allowAsync: true,
    ...extra
});

export const StatGrid: FC<{children: ReactNode}> = ({children}) => <div className='network-stat-grid'>{children}</div>;

export const NetworkCard: FC<{title: string, tooltip?: string, full?: boolean, children: ReactNode}> = ({title, tooltip, full, children}) => {
    return (
        <div className={'flex-grow-1 m-1 validator-detail-flex-card'+((full) ? ' network-card-full' : '')}>
            <div className='validator-detail-flex-opacity-bg'></div>
            <div className='card text-light'>
                <div className='card-header'>
                    {title}
                    {(tooltip) ? (
                        <OverlayTrigger
                            placement="bottom"
                            overlay={
                                <Tooltip>
                                    {tooltip}
                                </Tooltip>
                            }
                        >
                            <i className='bi bi-info-circle ms-2'></i>
                        </OverlayTrigger>
                    ) : null}
                </div>
                <div className='card-body'>
                    {children}
                </div>
            </div>
        </div>
    );
}

export const StatTile: FC<{label: string, value: ReactNode, detail?: ReactNode, tooltip?: string}> = ({label, value, detail, tooltip}) => {
    const tile = (
        <div className='rounded text-center p-2 network-stat-tile'>
            <div className='fs-5'>{value}</div>
            <div className='small'>{label}</div>
            {(detail) ? <div className='small text-secondary'>{detail}</div> : null}
        </div>
    );
    if(!tooltip) return tile;
    return (
        <OverlayTrigger
            placement="bottom"
            overlay={
                <Tooltip>
                    {tooltip}
                </Tooltip>
            }
        >
            {tile}
        </OverlayTrigger>
    );
}
