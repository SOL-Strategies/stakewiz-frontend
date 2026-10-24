import dynamic from 'next/dynamic'
import { FC } from "react";
const GaugeComponent = dynamic(() => import('react-gauge-component'), { ssr: false });
const GaugeChart = dynamic(() => import('react-gauge-chart'), { ssr: false });
import WizEmblem from '../../public/images/emblem.svg'
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

export const Gauges: FC<{
    block_production: number | null,
    block_production_p10: number | null,
    block_production_median: number | null,
    vote_success: number,
    wiz_score: number, 
    uptime: number }> = ({
        block_production, block_production_p10, block_production_median, vote_success, wiz_score, uptime
    }) => {

    // Block production can exceed 100% (a better than typical block in every leader slot)
    const blockProductionMax = 125;
    const blockProductionInsufficient = 'Insufficient leader slots in current epoch, data shown after 12 leader slots';
    let blockProductionColor = '#55bb55';
    // Null below 12 blocks produced this epoch: grey out the whole gauge
    if(block_production==null) {
        blockProductionColor = '#555555';
    }
    else if(block_production_median!=null && block_production < block_production_median) {
        blockProductionColor = (block_production_p10!=null && block_production < block_production_p10) ? '#bb5555' : '#ddaa33';
    }

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
                                labels={{tickLabels:{hideMinMax:true}, valueLabel: {formatTextValue: () => (block_production==null) ? '—' : block_production.toFixed(1)+' %', style: { fontSize: '30px'}}}}
                            />
                        </div>
                        </OverlayTrigger>
                        <div>
                            Block packing
                            <OverlayTrigger
                                placement="bottom"
                                overlay={
                                    <Tooltip>
                                        Fee capture &times; share of leader slots produced this epoch. 100% is a typical block for the market in every leader slot.
                                        {(block_production_median!=null) ? <><br />Network median {block_production_median.toFixed(1)}%, p10 {block_production_p10?.toFixed(1)}%.</> : null}
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
                                            limit: (vote_success>=100) ? 99.999 : (vote_success>95) ? (vote_success-95)*20 : 0,
                                            color: '#55bb55',
                                            
                                        },
                                        {
                                            limit: 100,
                                            color:'#bb5555',
                                        }
                                    ]
                                }}
                                value={vote_success} 
                                pointer={{hide:true}}
                                style={chartStyle}
                                labels={{tickLabels:{hideMinMax:true}, valueLabel: {formatTextValue: (value) => value+' %', style: { fontSize: '30px'}}}}
                            />
                        </div>
                        <div>
                            Vote success
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
                                labels={{tickLabels:{hideMinMax:true}, valueLabel: {formatTextValue: (value) => value+' %', style: { fontSize: '30px'}, maxDecimalDigits: 1}}}
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
                                labels={{tickLabels:{hideMinMax:true}, valueLabel: {formatTextValue: (value) => value+' %', style: { fontSize: '30px'}}}}
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