import dynamic from 'next/dynamic'
import { FC } from "react";
const GaugeComponent = dynamic(() => import('react-gauge-component'), { ssr: false });
const GaugeChart = dynamic(() => import('react-gauge-chart'), { ssr: false });
import WizEmblem from '../../public/images/emblem.svg'

export const Gauges: FC<{
    skip_rate: number, 
    credit_ratio: number,
    wiz_score: number, 
    uptime: number }> = ({
        skip_rate, credit_ratio, wiz_score, uptime
    }) => {


    let skipGauge = [
        ["Label", "Value"],
        ["Skip Rate", {v: Number(skip_rate), f: Number(skip_rate).toFixed(1)+'%'}]
        
    ];
    let creditGauge = [
        ["Label", "Value"],
        ["Vote Credits", {v: Number(credit_ratio), f: Number(credit_ratio).toFixed(1)+'%'}]
    ]
    let wizScoreGauge = [
        ["Label", "Value"],
        ["Wiz Score", {v: Number(wiz_score), f: Number(wiz_score).toFixed(1)+'%'}]
    ]
    let uptimeGauge = [
        ["Label", "Value"],
        ["Uptime", {v: Number(uptime), f: Number(uptime).toFixed(2)+'%'}]
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
                                value={Number(skip_rate)}
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
                            <GaugeComponent id='gauge-chart-voting' 
                                type="semicircle"
                                arc={{
                                    cornerRadius: 0,
                                    width:0.15,
                                    subArcs: [
                                        {
                                            limit: (credit_ratio>=100) ? 99.999 : (credit_ratio>95) ? (credit_ratio-95)*20 : 0,
                                            color: '#55bb55',
                                            
                                        },
                                        {
                                            limit: 100,
                                            color:'#bb5555',
                                        }
                                    ]
                                }}
                                value={Number(credit_ratio)}
                                pointer={{hide:true}}
                                style={chartStyle}
                                labels={{tickLabels:{hideMinMax:true}, valueLabel: {formatTextValue: (value) => value+' %', style: { fontSize: '30px'}}}}
                            />
                        </div>
                        <div>
                            Voting rate
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
                                value={Number(wiz_score)}
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
                                value={Number(uptime)}
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