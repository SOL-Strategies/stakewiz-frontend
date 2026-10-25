import { CSSProperties, FC, ReactNode } from "react";
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

export const percent = (n: number, decimals = 1) => parseFloat((n*100).toFixed(decimals))+'%';
export const sol = (lamports: number, decimals = 4) => '◎ '+(lamports/1e9).toFixed(decimals);
export const formatNumber = (n: number, decimals = 0) => n.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals});

// Accent colours for the network page; green/amber/red match the gauge rules elsewhere on the site
export const COLORS = {
    green: '#55bb55',
    amber: '#ffc107',
    red: '#bb5555',
    cyan: '#0dcaf0',
    purple: '#a78bfa',
    pink: '#f472b6',
    orange: '#fb923c',
    teal: '#2dd4bf',
    grey: '#94a3b8'
};

export const PALETTE = [COLORS.cyan, COLORS.purple, COLORS.amber, COLORS.green, COLORS.pink, COLORS.orange, COLORS.teal, COLORS.red, COLORS.grey];

// Shared look for the Google charts on the network page
export const chartOptions = (extra: {[key: string]: any} = {}) => {
    const options: {[key: string]: any} = {
        backgroundColor: 'none',
        colors: PALETTE,
        legend: { position: 'none' },
        hAxis: { gridlines: { color: 'transparent' }, textStyle: { color: '#fff' } },
        vAxis: { gridlines: { color: '#3a3a3a' }, baselineColor: '#777777', textStyle: { color: '#fff' } },
        chartArea: { top: 20, left: 60, width: '85%', height: '72%' },
        tooltip: { textStyle: { color: '#222' } },
        allowAsync: true,
        ...extra
    };
    // Google derives minor gridline colours assuming a white background, which shows as bright lines here
    options.hAxis = { minorGridlines: { color: 'transparent' }, ...options.hAxis };
    options.vAxis = { minorGridlines: { color: 'transparent' }, ...options.vAxis };
    return options;
};

export const InfoTip: FC<{text: string}> = ({text}) => (
    <OverlayTrigger
        placement="bottom"
        overlay={
            <Tooltip>
                {text}
            </Tooltip>
        }
    >
        <i className='bi bi-info-circle ms-2'></i>
    </OverlayTrigger>
);

export const NetworkCard: FC<{title: string, tooltip?: string, full?: boolean, className?: string, children: ReactNode}> = ({title, tooltip, full, className, children}) => {
    return (
        <div className={'flex-grow-1 m-1 validator-detail-flex-card'+((full) ? ' network-card-full' : '')+((className) ? ' '+className : '')}>
            <div className='validator-detail-flex-opacity-bg'></div>
            <div className='card text-light'>
                <div className='card-header'>
                    {title}
                    {(tooltip) ? <InfoTip text={tooltip} /> : null}
                </div>
                <div className='card-body'>
                    {children}
                </div>
            </div>
        </div>
    );
}

export const StatGrid: FC<{children: ReactNode}> = ({children}) => <div className='network-stat-grid'>{children}</div>;

export const StatTile: FC<{label: string, value: ReactNode, detail?: ReactNode, color?: string}> = ({label, value, detail, color}) => {
    return (
        <div className='rounded text-center p-2 network-stat-tile'>
            <div className='fs-5' style={(color) ? {color} : null}>{value}</div>
            <div className='small'>{label}</div>
            {(detail) ? <div className='small text-secondary'>{detail}</div> : null}
        </div>
    );
}

// Headline figure with an animated ring showing `ring` (0-1) of the way round, or a plain number badge
export const KpiTile: FC<{label: string, value: ReactNode, detail?: ReactNode, accent: string, ring?: number, badge?: ReactNode, tooltip?: string}> = ({label, value, detail, accent, ring, badge, tooltip}) => {
    const style = {'--accent': accent} as CSSProperties;
    const ringStyle = {'--ring': Math.max(0, Math.min(1, ring ?? 0))*100} as CSSProperties;
    return (
        <div className='network-kpi' style={style}>
            {(ring!=null) ? <div className='network-ring' style={ringStyle}></div> : <div className='network-ring-number'>{badge}</div>}
            <div>
                <div className='network-kpi-value'>{value}</div>
                <div className='small'>{label}</div>
                {(detail) ? <div className='small text-secondary'>{detail}</div> : null}
            </div>
            {(tooltip) ? <span className='network-kpi-info'><InfoTip text={tooltip} /></span> : null}
        </div>
    );
}
