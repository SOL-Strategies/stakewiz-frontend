import { FC, useEffect, useState } from "react";
import axios from "axios";
import { Spinner } from '../common'
import Chart from "react-google-charts";


export const EpochStakeChart: FC<{vote_identity: string, updateStake: Function}> = ({vote_identity, updateStake}) => {
    const [stakes, setStakes] = useState(null);
    
    useEffect(() => {
        axios('/api/v2/validator/'+vote_identity+'/epoch_stake_accounts')
            .then(response => {

                let json = response.data;

                const SOL = 1e9;
                let change = (json.activating?.amount_lamports ?? 0)/SOL - (json.deactivating?.amount_lamports ?? 0)/SOL;

                updateStake(change);

                let stakes = [];
                stakes.push(['Location','Parent','Value (SOL)','Color value']);
                stakes.push(['Total Epoch Stake Changes',null,0,0]);
                stakes.push(['Activating','Total Epoch Stake Changes',0,0]);
                stakes.push(['Deactivating','Total Epoch Stake Changes', 0,0]);

                json.activating.stake_accounts.map((stake) => {
                    const sol = (stake.delegated_amount_lamports ?? 0)/SOL;
                    stakes.push([
                        stake.pubkey,
                        'Activating',
                        sol,
                        Math.sqrt(sol)
                    ])
                })
                json.deactivating.stake_accounts.map((stake) => {
                    const sol = (stake.delegated_amount_lamports ?? 0)/SOL;
                    stakes.push([
                        stake.pubkey,
                        'Deactivating',
                        sol,
                        Math.sqrt(sol)*-1
                    ])
                })

                setStakes(stakes);
            })
            .catch(e => {
            console.log(e);
            })
    }, []);


    if(stakes==null) {
        
        return <Spinner />
    
    }
    else {
        return (
            <Chart 
                    key='epoch-stake-chart'
                    chartType='TreeMap'
                    width="100%"
                    height="20rem"
                    data={stakes}
                    options={{
                        backgroundColor: 'none',
                        highlightOnMouseOver: false,
                        maxDepth: 1,
                        maxPostDepth: 2,
                        minColor: "#dc3545",
                        maxColor: "#198754",
                        headerHeight: 0,
                        hintOpacity: 0.4,
                        showScale: false,
                        useWeightedAverageForAggregation: true,
                        textStyle: {
                            fontName: 'lato',
                            bold: true
                        }
                    }}
                />
        )
    }
}

