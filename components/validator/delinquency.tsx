import { FC, useEffect, useState } from "react";
import axios from "axios";
import { Spinner } from '../common'
import Chart from "react-google-charts";
import Calendar from '../calendar';


export const DelinquencyChart: FC<{vote_identity: string, first_epoch: number}> = ({vote_identity, first_epoch}) => {
    const [delinquencies, setDelinquencies] = useState(null);
    const [allEpochs, setAllEpochs] = useState(null)
    const [startDate, setStartDate] = useState(null)
    
    useEffect(() => {
        axios('/api/v2/validator/'+vote_identity+'/delinquencies')
            .then(async (response) => {
                let json: [] = response.data;

                let d: Object = {};

                json.forEach((delinquency: any) => {
                        d[delinquency.date] = delinquency.delinquent_minutes
                })

                setDelinquencies(d);
            })
            .catch(e => {
            console.log(e);
            })
        axios('/api/v2/epoch/history')
            .then(async (response) => {
                let json: [] = response.data;
                setAllEpochs(json)
                let epoch:any = json.find((epoch: any) => epoch.epoch == first_epoch)
                let start_date = new Date(epoch.start_time)
                setStartDate(start_date.getFullYear()+'-'+(start_date.getMonth()+1)+'-'+start_date.getDate())

            })
            .catch(e => {
            console.log(e);
            })
    }, []);

    const today = new Date();
    let year = today.getFullYear()
    let month: string|number = today.getMonth() + 1
    let day = today.getDate();
    if(month<10) month = '0'+month
    const until = year+'-'+month+'-'+day

    if(delinquencies==null) {
        
        return <Spinner />
    
    }
    else {
        return (
            <div className='w-100 d-flex'>
                <Calendar 
                    key='del1'
                    values={delinquencies}
                    until={until}
                    start={startDate}
                    weekLabelAttributes={{}}
                    monthLabelAttributes={{}}
                    panelColors={['#666', '#198754', '#e5b467', '#e2a124', '#dd6e1d', '#c34c0b']}
                    panelAttributes={{}}
                />
            </div>
        )
    }
}
