import React, {useEffect, useState, FC, useCallback} from 'react';
import { Connection, StakeProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Modal, Button, Overlay, OverlayTrigger, Tooltip } from 'react-bootstrap';
import RangeSlider from 'react-bootstrap-range-slider'
import config from '../../config.json';
import axios from 'axios';
import { CommissionHistoryI, JitoCommissionHistoryI } from './interfaces'


export const getStakeAccounts = async (pubkey,connection: Connection) => {

    const stakes = await connection.getParsedProgramAccounts(
        StakeProgram.programId,
        {
            commitment: "confirmed",
            filters: [
                {
                memcmp: {
                    bytes: pubkey,
                    offset: 12
                }
            }
            ]
        }
    )


    return stakes;
}

export const getCommissionHistory = async (vote_identity):Promise<CommissionHistoryI[]> => {
    
    try {
      let response = await axios('/api/v2/validator/'+vote_identity+'/commission_history')
      let json = response.data;
  
      return json
     }
     catch(e) {
        console.log(e);
        return null
      }
  }

export const getJitoCommissionHistory = async (vote_identity):Promise<JitoCommissionHistoryI[]> => {

    try {
        let response = await axios('/api/v2/validator/'+vote_identity+'/jito_commission_history')
        let json = response.data;

        return json
        }
        catch(e) {
        console.log(e);
        return null
        }
    }

export const StakeInput: FC<{
    balance: number;
    minStakeAmount: number;
    stakeAmount: number;
    updateAmount: Function;
    readOnly?: boolean;
}> = ({balance, minStakeAmount, stakeAmount, updateAmount, readOnly}) => {
    

    const [sliderValue, setSliderValue] = useState(stakeAmount);
    const [pendingValue, setPendingValue] = useState(null);

    const processUpdate = (amount) => {
        if(!readOnly) {
            updateAmount(amount);
            setSliderValue(amount);
        }
    }

    useEffect(() => {
        if(pendingValue!=null) {
            const timeoutId = setTimeout(() => processUpdate(pendingValue), 500)
            return () => clearTimeout(timeoutId)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingValue])

    return (
        <div className='my-2 d-flex flex-row align-items-center pe-0 w-100' key={'range-slider-div-'+stakeAmount}>
            <div className='me-1 flex-shrink-1'>
                <OverlayTrigger
                    placement="top"
                    overlay={
                        <Tooltip>
                            The min amount for rent exemption + 1 lamport per validator
                        </Tooltip>
                    } 
                >
                    <span onClick={() => processUpdate(minStakeAmount/LAMPORTS_PER_SOL)} className={(!readOnly) ? 'pointer' : ''}>Min</span>
                </OverlayTrigger>
            </div>
            <div className='flex-grow-1 px-1'>
                <RangeSlider 
                    value={(pendingValue != null) ? pendingValue : sliderValue} 
                    min={minStakeAmount/LAMPORTS_PER_SOL}
                    max={(balance-config.TX_RESERVE_LAMPORTS)/LAMPORTS_PER_SOL} 
                    step={500000/LAMPORTS_PER_SOL}
                    onChange={(event) => setPendingValue(parseFloat(event.target.value))}
                    tooltip='off'
                    variant='light'
                    disabled={(readOnly) ? true : false}
                />
            </div>
            <div className='text-start px-0 flex-shrink-1'>
                <OverlayTrigger
                    placement="top"
                    overlay={
                        <Tooltip>
                            Your balance minus ◎ 0.01 for fees
                        </Tooltip>
                    } 
                >
                    <span onClick={() => processUpdate((balance-config.TX_RESERVE_LAMPORTS)/LAMPORTS_PER_SOL)} className={(!readOnly) ? 'pointer' : ''}>Max</span>
                </OverlayTrigger>
            </div>
        </div>
        
    )

}

export enum DistributionMethods {
    Equal = 0,
    WizScore = 1,
    APY = 2,
    Custom = 3
};

export enum StakeStatus {
    Inactive = 0,
    Activating = 1,
    Active = 2,
    Deactivating = 3,
    Unknown = 4
}

export const getStakeStatus = (stake,epoch) => {

    let activation = stake.account.data.parsed.info.stake.delegation.activationEpoch
    let deactivation = stake.account.data.parsed.info.stake.delegation.deactivationEpoch

    if(epoch!=null) {
        if(deactivation<epoch) return StakeStatus.Inactive
        else if(deactivation==epoch) {
            if(activation==deactivation) return StakeStatus.Inactive
            if(activation < deactivation) return StakeStatus.Deactivating
        }
        else if(activation == epoch)    return StakeStatus.Activating
        else if(activation < epoch)     return StakeStatus.Active
    }
    else return StakeStatus.Unknown
}

export const getRewards = async (stake, epoch, connection: Connection) => {
    try {
        
        let response = await connection.getInflationReward([stake.pubkey],epoch)

        return response
    
       }
       catch(e) {
          console.log(e);
          return null
        }
}