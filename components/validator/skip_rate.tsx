import { FC, useEffect, useState } from "react";
import axios from "axios";
import { Spinner } from '../common'
import Chart from "react-google-charts";
import * as browser from 'lib/browser';


export const SkipRateChart: FC<{vote_identity: string}> = ({vote_identity}) => {
    const [allScores, setAllScores] = useState(null);
    
    useEffect(() => {
        axios('/api/v2/validator/'+vote_identity+'/skip_rate?limit=2000')
            .then(response => {
            let json = response.data;

            
            if(json.length>0) {

                let scores = [];
                scores.push([
                    'Date',
                    'Skip Rate'
                ]);

                let isSafari:boolean = browser.check('Safari');

                for(var i in json) {
                        if(isSafari){
                            let timeZone = json[i].created_at.slice(-3)+':00';
                            scores.push([new Date(json[i].created_at.substring(0, 19).replace(/-/g, "/")+timeZone), parseFloat(json[i].skip_rate)/100]);
                        }else{                
                            scores.push([new Date(json[i].created_at), parseFloat(json[i].skip_rate)/100]);
                        }
                }

                setAllScores(scores);
            }
            })
            .catch(e => {
            console.log(e);
            })
    }, []);


    if(allScores==null) {
        
        return <Spinner />
    
    }
    else {
        return (
            <Chart 
                chartType='LineChart'
                width="100%"
                height="20rem"
                data={allScores}
                options={{
                    backgroundColor: 'none',
                    colors: ['#fff', '#fff', '#fff'],
                    lineWidth: 2,
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
                        format: 'percent'
                    },
                    hAxis: {
                        gridlines: {
                            color: 'transparent'
                        },
                        textStyle: {
                            color: '#fff'
                        }
                    },
                    chartArea: {
                        top: 20,
                        left: 50,
                        width:'100%',
                        height:'80%'
                    },
                    allowAsync: true
                }}
            />
        )
    }
}