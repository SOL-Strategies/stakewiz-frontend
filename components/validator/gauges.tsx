import dynamic from 'next/dynamic'
import { FC } from "react";
const GaugeComponent = dynamic(() => import('react-gauge-component'), { ssr: false });
const GaugeChart = dynamic(() => import('react-gauge-chart'), { ssr: false });
import WizEmblem from '../../public/images/emblem.svg'
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { BLOCK_PRODUCTION_MAX, BLOCK_PRODUCTION_INSUFFICIENT, blockProductionColor as getBlockProductionColor, networkSpreadColor as getNetworkSpreadColor } from './common';

const GAUGE_FONT_SIZE = 30;

// Percentage with up to `decimals` places, dropping trailing zeros (112.0 -> 112)
const formatPercent = (n: number, decimals: number) => parseFloat(n.toFixed(decimals)).toString()+' %';

// react-gauge-component scales the value text by 6/length once it is over 4 characters;
// undo that so every gauge's value renders at the same size
const valueLabel = (text: string) => ({
    formatTextValue: () => text,
    style: { fontSize: (GAUGE_FONT_SIZE / ((text.length > 4) ? 6/text.length : 1))+'px' }
});

export const Gauges: FC<{
    block_production: number | null,
    block_production_p10: number | null,
    block_production_median: number | null,
    vote_success: number,
    vote_success_p10?: number | null,
    vote_success_median?: number | null,
    wiz_score: number, 
    uptime: number }> = ({
        block_production, block_production_p10, block_production_median, vote_success, vote_success_p10, vote_success_median, wiz_score, uptime
    }) => {

    const blockProductionMax = BLOCK_PRODUCTION_MAX;
    const blockProductionInsufficient = BLOCK_PRODUCTION_INSUFFICIENT;
    const blockProductionColor = getBlockProductionColor(block_production, block_production_p10, block_production_median);
    const voteSuccessColor = getNetworkSpreadColor(vote_success, vote_success_p10, vote_success_median) ?? '#55bb55';

    let voteSuccessGauge = [
        ["Label", "Value"],
        ["Vote Success", {v: vote_success, f: vote_success.toFixed(1)+'%'}]
    ]
    let wizScoreGauge = [
        ["Label", "Value"],
        ["Wiz Score", {v: wiz_score, f: wiz_score.toFixed(1)+'%'}]
    ]
    let uptimeGauge = [
        ["Label", "Value"],
        ["Uptime", {v: uptime, f: uptime.toFixed(2)+'%'}]
    ]

    let chartStyle = {
        width: 180
    }

    return (
        <div className='d-flex flex-nowrap justify-content-center mobile-gauge-container text-white my-2'>
                <div className='d-flex flex-row'>
                    <div className='flex-shrink-1 d-flex flex-column align-items-center'>
                        <OverlayTrigger
                            placement="bottom"
                            trigger={(block_production==null) ? ['hover', 'focus'] : []}
                            overlay={
                                <Tooltip>
                                    {blockProductionInsufficient}
                                </Tooltip>
                            }
                        >
                        <div>
                            <GaugeComponent id='gauge-chart-block-production'
                                type="semicircle"
                                arc={{
                                    cornerRadius: 0,
                                    width:0.15,
                                    subArcs: [
                                        {
                                            limit: (block_production==null) ? 0.01 : Math.max(0.01, Math.min(block_production, blockProductionMax-0.01)),
                                            color: blockProductionColor,
                                            
                                        },
                                        {
                                            limit: blockProductionMax,
                                            color:'#555555',
                                        }
                                    ]
                                }}
                                maxValue={blockProductionMax}
                                value={(block_production==null) ? 0 : Math.min(block_production, blockProductionMax)} 
                                pointer={{hide:true}}
                                style={chartStyle}
                                labels={{tickLabels:{hideMinMax:true}, valueLabel: valueLabel((block_production==null) ? '—' : formatPercent(block_production, 1))}}
                            />
                        </div>
                        </OverlayTrigger>
                        <div>
                            Block production
                            <OverlayTrigger
                                placement="bottom"
                                overlay={
                                    <Tooltip>
                                        Fees earned per block compared with a typical block at the same time, multiplied by the share of leader slots produced. A typical block in every slot = 100%.
                                        {(block_production_median!=null) ? <><br />Network median {block_production_median.toFixed(1)}%, p10 {block_production_p10?.toFixed(1)}% (validators with 50+ blocks this epoch).</> : null}
                                        {(block_production==null) ? <><br />{blockProductionInsufficient}</> : null}
                                    </Tooltip>
                                }
                            >
                                <i className='bi bi-info-circle ms-1'></i>
                            </OverlayTrigger>
                        </div>
                    </div>
                    <div className='flex-grow-1 d-flex flex-column align-items-center'>
                        <div>
                            <GaugeComponent id='gauge-chart-vote-success' 
                                type="semicircle"
                                arc={{
                                    cornerRadius: 0,
                                    width:0.15,
                                    subArcs: [
                                        {
                                            limit: Math.max(0.01, Math.min(vote_success, 99.99)),
                                            color: voteSuccessColor,
                                            
                                        },
                                        {
                                            limit: 100,
                                            color:'#555555',
                                        }
                                    ]
                                }}
                                value={vote_success} 
                                pointer={{hide:true}}
                                style={chartStyle}
                                labels={{tickLabels:{hideMinMax:true}, valueLabel: valueLabel(formatPercent(vote_success, 1))}}
                            />
                        </div>
                        <div>
                            Vote success
                            <OverlayTrigger
                                placement="bottom"
                                overlay={
                                    <Tooltip>
                                        Share of the optimal vote rewards earned this epoch.
                                        {(vote_success_median!=null) ? <><br />Network median {vote_success_median.toFixed(1)}%, p10 {vote_success_p10?.toFixed(1)}%.</> : null}
                                    </Tooltip>
                                }
                            >
                                <i className='bi bi-info-circle ms-1'></i>
                            </OverlayTrigger>
                        </div>
                    </div>
                </div>
                <div className='d-flex flex-row'>
                    <div className='flex-grow-1 d-flex flex-column align-items-center'>
                        <div>
                            <GaugeComponent id='gauge-chart-uptime' 
                                type="semicircle"
                                arc={{
                                    cornerRadius: 0,
                                    width:0.15,
                                    subArcs: [
                                        {
                                            limit: wiz_score,
                                            color: '#55bb55',
                                            
                                        },
                                        {
                                            limit: 100,
                                            color:'#bb5555',
                                        }
                                    ]
                                }}
                                value={wiz_score} 
                                pointer={{hide:true}}
                                style={chartStyle}
                                labels={{tickLabels:{hideMinMax:true}, valueLabel: valueLabel(formatPercent(wiz_score, 1))}}
                            />
                        </div>
                        <div>
                            <span><WizEmblem fill="#fff" width="25px" height="25px" /> Score</span>
                        </div>
                    </div>
                    <div className='flex-grow-1 d-flex flex-column align-items-center'>
                        <div>
                            <GaugeComponent id='gauge-chart-voting' 
                                type="semicircle"
                                arc={{
                                    cornerRadius: 0,
                                    width:0.15,
                                    subArcs: [
                                        {
                                            limit: (uptime==100) ? 99.999 : (uptime>99) ? (uptime-99)*100 : 0,
                                            color: '#55bb55',
                                            
                                        },
                                        {
                                            limit: 100,
                                            color:'#bb5555',
                                        }
                                    ]
                                }}
                                value={uptime} 
                                pointer={{hide:true}}
                                style={chartStyle}
                                labels={{tickLabels:{hideMinMax:true}, valueLabel: valueLabel(formatPercent(uptime, 2))}}
                            />
                        </div>
                        <div>
                            Uptime (30 days)
                        </div>
                    </div>
                </div>
        </div>
    );
}