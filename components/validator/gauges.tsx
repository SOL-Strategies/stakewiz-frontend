import dynamic from 'next/dynamic'
import { FC } from "react";
const GaugeComponent = dynamic(() => import('react-gauge-component'), { ssr: false });
const GaugeChart = dynamic(() => import('react-gauge-chart'), { ssr: false });
import WizEmblem from '../../public/images/emblem.svg'

export const Gauges: FC<{
    skip_rate: number, 
    vote_success: number,
    wiz_score: number, 
    uptime: number }> = ({
        skip_rate, vote_success, wiz_score, uptime
    }) => {


    let skipGauge = [
        ["Label", "Value"],
        ["Skip Rate", {v: skip_rate, f: skip_rate.toFixed(1)+'%'}]
        
    ];
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

    console.log(skip_rate);

    return (
        <div className='d-flex flex-nowrap justify-content-center mobile-gauge-container text-white my-2'>
                <div className='d-flex flex-row'>
                    <div className='flex-shrink-1 d-flex flex-column align-items-center'>
                        <div>
                            <GaugeComponent id='gauge-chart-skip' 
                                type="semicircle"
                                arc={{
                                    cornerRadius: 0,
                                    width:0.15,
                                    subArcs: [
                                        {
                                            limit: (skip_rate >=5) ? 4.99 : skip_rate,
                                            color: '#bb5555',
                                            
                                        },
                                        {
                                            limit: 5,
                                            color:'#55bb55',
                                        }
                                    ]
                                }}
                                maxValue={5}
                                value={skip_rate} 
                                pointer={{hide:true}}
                                style={chartStyle}
                                labels={{tickLabels:{hideMinMax:true}, valueLabel: {formatTextValue: (value) => value+' %', style: { fontSize: '30px'}}}}
                            />
                        </div>
                        <div>
                            Skip rate
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