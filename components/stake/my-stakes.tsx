import React, { FC, useContext, useEffect, useState } from "react";
import config from '../../config.json';
import { ComputeBudgetProgram, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getStakeAccounts, StakeStatus, getStakeStatus, getRewards } from './common';
import { ValidatorContext } from '../validator/validatorhook';
import { getAllEpochHistory, getClusterStats, Spinner} from '../common'
import { RenderImage, RenderName } from '../validator/common'
import { Alert, Form, InputGroup, Modal, OverlayTrigger, Tooltip } from "react-bootstrap";
import { addMeta, closeStake, deactivateStake, delegateStake } from "./transactions";
import { useWallet } from "@solana/wallet-adapter-react";
import { validatorI } from "components/validator/interfaces";
import ordinal from "ordinal";
import { arrayBuffer } from "node:stream/consumers";

import * as gtag from '../../lib/gtag.js'
import Chart from "react-google-charts";
import { createNamedExports } from "typescript";

const API_URL = process.env.API_BASE_URL;

export const Stakes: FC<{userPubkey: PublicKey, connection: Connection, connected: boolean, unsetUserPublicKey: Function}> = ({userPubkey, connection, connected, unsetUserPublicKey}) => {

    const [ stakes, setStakes ] = useState(null);
    const [renderResult, setRenderResult] = useState<any>(<Spinner />)
    const validatorList = useContext(ValidatorContext)
    const [epoch, setEpoch] = useState(0)
    const {signTransaction} = useWallet();
    const [awaitingSignature, setAwaitingSignature] = useState(false)
    const [updatingStakes, setUpdatingStakes] = useState([])
    const [message, setMessage] = useState(null)
    const [messageType, setMessageType] = useState('success')
    const [delegatingStake, setDelegatingStake] = useState(null)
    const [delegateSearch, setDelegateSearch] = useState([])
    const [delegateValidator, setDelegateValidator] = useState(null)
    const [delegateSearchInput, setDelegateSearchInput] = useState('')
    const [clusterStats, setClusterStats] = useState(null)
    const [initialFetch, setInitialFetch] = useState(false)
    const [rewardsStake, setRewardsStake] = useState(null)
    const [rewardsData, setRewardsData] = useState([])
    const [rewardsTable, setRewardsTable] = useState(null)
    const [epochHistory, setEpochHistory] = useState([])
    const [activePubkey, setActivePubkey] = useState(userPubkey)

    useEffect(() => {
        if(stakes == null) {
            getStakeAccounts(activePubkey.toString(), connection).then((stakes) => {
                
                setStakes(stakes);
                setInitialFetch(true)

            })
            
        }
    }, [activePubkey])

    useEffect(() => {
        renderStakes()
    }, [stakes, validatorList, awaitingSignature, updatingStakes, initialFetch])

    useEffect(() => {
        if(epochHistory.length==0) {

            getAllEpochHistory()
            .then((result: [{epoch: number, start, end, duration_seconds}]) => {
                let epochHistory = []
                result.map((epoch) => {
                    if(epoch.epoch != undefined) epochHistory[epoch.epoch] = epoch
                    
                })

                setEpochHistory(epochHistory)
            })
        }
    }, [])

    useEffect(() => {
        if(epoch == 0) {
            connection.getEpochInfo()
            .then((epoch) => {
                setEpoch(epoch.epoch)
            })
        }
        if(clusterStats==null) {
            getClusterStats()
            .then((results) => {
                setClusterStats(results)
            })
        }
        
    })

    useEffect(() => {
        doSearch(delegateSearchInput)
    }, [delegateSearchInput])

    useEffect(() => {
        if(rewardsStake!=null) {

            for(let i = epoch-1; i > rewardsStake.account.data.parsed.info.stake.delegation.activationEpoch; i--) {
                
                getRewards(rewardsStake, i, connection)
                .then((result) => {
                    let obj = {}
                    obj[i] = result
                    setRewardsData(rewardsData => [...rewardsData,obj])
                })
            }
            
        }
    }, [rewardsStake])

    useEffect(() => {
        if(rewardsStake!=null) {
            
            let staleLamports = rewardsStake.account.lamports - rewardsStake.account.data.parsed.info.stake.delegation.stake;

            let rewardsEpochs = []

            for(let i = epoch-1; i > rewardsStake.account.data.parsed.info.stake.delegation.activationEpoch; i--) {
                rewardsEpochs.push(i)
            }
    
            let sortedRewardsData = {}

            let rewards_chart = [];
            rewards_chart.push(['Epoch', 'APY', {type: 'string', role: 'tooltip'}]);
            let chart_data = [];
            
            rewardsData.map((data) => {

                

                const epoch = Object.keys(data)[0]

                let rewards = null;

                if(data[epoch]!==null && data[epoch] !== undefined && data[epoch][0]!==null) {
                    rewards = data[epoch][0]

                    let preBalance = 0
                    let apy: any = 0
                    let epochs_per_year = (epochHistory[epoch] !== undefined) ? 365.25 * 24 * 60 * 60 / epochHistory[epoch].duration_seconds : 0;
                    
                    preBalance = rewards.postBalance - rewards.amount
                    apy = Math.pow(1 + (rewards.amount / (preBalance - staleLamports)), epochs_per_year) - 1
                    if(epochs_per_year==0) apy = 0
                    
                    rewards.apy = apy
                    
                    if(!chart_data.some((row,i) => {
                        if(i>0) {
                            if(row[0] == rewards.epoch) return true;
                        }
                        else return false
                    }) && epochHistory[epoch] !== undefined) chart_data.push([epoch, parseFloat(rewards.apy), (rewards.apy*100).toFixed(2)+'%']);


                }
                sortedRewardsData[epoch] = rewards
                 
            })

            chart_data.sort((a,b) => {
                if(a[0] < b[0]) return -1
                else return 1
            })

            rewards_chart = rewards_chart.concat(chart_data)
    
            setRewardsTable(
                <div className='d-flex flex-column'>
                    {(rewards_chart.length>1) ? (
                        <div>
                            <h5 className='text-center'>Your TrueAPY per epoch</h5>
                            <Chart 
                                chartType='LineChart'
                                width="100%"
                                height="20rem"
                                data={rewards_chart}
                                options={{
                                    backgroundColor: 'none',
                                    curveType: "function",
                                    colors: ['#fff', '#fff', '#fff'],
                                    lineWidth: 2,
                                    pointsVisible: true,
                                    vAxis: {
                                        gridlines: {
                                            color: 'transparent'
                                        },
                                        textStyle: {
                                            color: '#fff'
                                        },
                                        format: '#.#%',
                                        baseLine: 0,
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
                                        left: 40,
                                        width:'100%',
                                        height:'80%'
                                    }
                                }}
                            />
                        </div>
                    ) : null}
                    <div className='table-responsive-md'>
                        <table className='table tabl-sm text-light table-dark'>
                            <thead>
                                <tr>
                                    <th scope='col'>
                                        Epoch
                                    </th>
                                    <th scope='col'>
                                        Change
                                    </th>
                                    <th scope='col'>
                                        Delegated stake
                                    </th>
                                    <th scope='col'>
                                        TrueAPY
                                        <OverlayTrigger
                                            placement="bottom"
                                            overlay={
                                                <Tooltip>
                                                    Our True APY excludes non-delegated amounts and uses the precise epoch duration, giving you the accurate compounded, annualised yield
                                                </Tooltip>
                                            } 
                                        >
                                            <i className='bi bi-info-circle ms-2'></i>
                                        </OverlayTrigger>
                                    </th>
                                    <th scope='col'>
                                        Commission
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rewardsEpochs.map((epoch) => {

                                    let apy_na = (epochHistory[epoch] === undefined) ? true : false

                                    return (
                                        <tr key={'rewards-epoch-row-'+epoch}>
                                            <th scope='row'>
                                                {epoch}
                                            </th>
                                            <td className='text-truncate'>
                                                {(sortedRewardsData[epoch]!==undefined) ? (
                                                    (sortedRewardsData[epoch]!==null) ? '+ ◎ '+(sortedRewardsData[epoch].amount / LAMPORTS_PER_SOL).toFixed(9) : 'Not found  '
                                                    ) : (
                                                        <div className='spinner-border text-light h-100 w-auto' role="status">
                                                            <span className='visually-hidden'>Loading...</span>
                                                        </div>
                                                    )
                                                }
                                            </td>
                                            <td className='text-truncate'>
                                                {(sortedRewardsData[epoch]!=undefined) ? '◎ '+Number((sortedRewardsData[epoch].postBalance - staleLamports) / LAMPORTS_PER_SOL) : null}
                                            </td>
                                            <td className='text-truncate'>
                                                {(sortedRewardsData[epoch]!=undefined) ? 
                                                    (!apy_na) ? (sortedRewardsData[epoch].apy * 100).toFixed(2)+' %' 
                                                    : 'N/A'
                                                    : null}
                                            </td>
                                            <td>
                                                {(sortedRewardsData[epoch]!=undefined) ? sortedRewardsData[epoch].commission+' %' : null}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
        }
        
    }, [rewardsData, rewardsStake])

    const findStakeValidator = (vote_identity) => {
        
        if(validatorList!=null) {
            for(let i = 0; i < validatorList.length; i++) {
                if(validatorList[i].vote_identity == vote_identity) {
                    return validatorList[i]
                }
            }
        }
        return null;
    }

    const renderStakeButtons = (stake, status) => {


        if(updatingStakes.includes(stake)) {
            return (
                <div className='spinner-grow text-light' role="status">
                    <span className='visually-hidden'>Loading...</span>
                </div>
            )
        }
        else {
            let buttons = []
            if(connected && (status == 2 || status == 1)) {
                buttons.push(
                    <OverlayTrigger
                    placement="bottom"
                    key={'stake-deactivate-'+stake.pubkey.toString()}
                    overlay={
                        <Tooltip>
                            Deactivate
                        </Tooltip>
                    } 
                    > 
                        <button className='btn btn-outline-light btn-sm px-4 me-1' onClick={() => doDeactivate(stake)} disabled={awaitingSignature}><i className='bi bi-chevron-double-down fs-6'></i></button>
                    </OverlayTrigger>
                    
                )
            }
            if(connected && status == 0) {
                buttons.push(
                    [
                        <OverlayTrigger
                        placement="bottom"
                        key={'withdraw-button-'+stake.pubkey.toString()}
                        overlay={
                            <Tooltip>
                                Withdraw &amp; close
                            </Tooltip>
                        } 
                        > 
                            <button className='btn btn-outline-light btn-sm me-1 px-4' onClick={() => doClose(stake)} disabled={awaitingSignature}><i className='bi bi-box-arrow-left fs-6'></i></button>
                        </OverlayTrigger>,
                        <OverlayTrigger
                        placement="bottom"
                        key={'delegate-button-'+stake.pubkey.toString()}
                        overlay={
                            <Tooltip>
                                Delegate
                            </Tooltip>
                        } 
                        > 
                            <button className='btn btn-outline-light btn-sm px-4' onClick={() => setDelegatingStake(stake)} disabled={awaitingSignature}><i className='bi bi-arrow-up-right-square-fill fs-6'></i></button>
                        </OverlayTrigger>
                    ]
                )
            }
            if(connected && status ==3 ) {
                buttons.push(
                    <OverlayTrigger
                        placement="bottom"
                        key={'delegate-button-'+stake.pubkey.toString()}
                        overlay={
                            <Tooltip>
                                Cancel deactivation
                            </Tooltip>
                        } 
                        > 
                            <button className='btn btn-outline-light btn-sm me-1 px-4' onClick={() => doDelegate(stake, stake.account.data.parsed.info.stake.delegation.voter)} disabled={awaitingSignature}><i className='bi bi-x-octagon fs-6'></i></button>
                        </OverlayTrigger>
                )
            }
            if((status==2 || status ==3) && stake.account.data.parsed.info.stake.delegation.activationEpoch < (epoch-1)) {
                buttons.push(
                    <OverlayTrigger
                    placement="bottom"
                    key={'stake-rewards-'+stake.pubkey.toString()}
                    overlay={
                        <Tooltip>
                            Rewards
                        </Tooltip>
                    } 
                    > 
                        <button className='btn btn-outline-light btn-sm px-4' onClick={() => setRewardsStake(stake)} disabled={awaitingSignature}><i className='bi bi-bank2 fs-6'></i></button>
                    </OverlayTrigger>
                )
            }

            return buttons
        }
        
    }

    const displayAlert = (message,type) => {
        setMessageType(type)
        setMessage(message)

        setTimeout(() => {
            setMessage(null)
        }, 5000)
    }

    const submitTx = async (tx, stake, isClose:Boolean = false, type = 'none', value = 0) => {

        console.log(tx)


        let signature = await connection.sendRawTransaction(tx.serialize())
        console.log('Transaction signature: '+signature)

        
        gtag.event({
            action: 'my-stake-tx',
            category: type,
            label: signature,
            value: value
          })
        
        setUpdatingStakes(updatingStakes => [...updatingStakes, stake])
        setDelegatingStake(null)
        setDelegateValidator(null)

        let blockhash = await connection.getLatestBlockhash()

        connection.confirmTransaction({
            signature: signature, 
            blockhash: blockhash.blockhash, 
            lastValidBlockHeight: blockhash.lastValidBlockHeight}, 
            'confirmed'
        )
        .then(async (conf) => {
            
            setAwaitingSignature(false)
            if(conf.value.err!=null) {
                console.log(conf.value.err)
                setUpdatingStakes(updatingStakes.filter(item => item !== stake))

                let alert = (
                    <span>
                        Error confirming the transaction.<br />
                        <a href={config.EXPLORER_TX_BASE+signature} target="_blank" rel="noreferrer">View in Explorer<i className='bi bi-box-arrow-up-right ms-2'></i></a>
                    </span>
                )

                displayAlert(alert,'error')
            }
            else {
                if(!isClose) {
                    let account = await connection.getParsedAccountInfo(stake.pubkey,'processed')
        
                    let tempStake = stake
                    tempStake.account.data = account.value.data
                    setStakes(stakes => [...stakes.filter(item => item !== stake),tempStake])

                    let alert = (
                        <span>
                            Transaction confirmed.<br />
                            <a href={config.EXPLORER_TX_BASE+signature} target="_blank" rel="noreferrer">View in Explorer<i className='bi bi-box-arrow-up-right ms-2'></i></a>
                        </span>
                    )

                    displayAlert(alert,'success')
                }
                else {
                    setStakes(stakes => stakes.filter(item => item !== stake))

                    let alert = (
                        <span>
                            Transaction confirmed.<br />
                            <a href={config.EXPLORER_TX_BASE+signature} target="_blank" rel="noreferrer">View in Explorer<i className='bi bi-box-arrow-up-right ms-2'></i></a>
                        </span>
                    )

                    displayAlert(alert,'success')
                }
                
                setUpdatingStakes(updatingStakes.filter(item => item !== stake))    
            }
            
        })

        return signature
        
    }

    const doDeactivate = async (stake) => {
        
        setAwaitingSignature(true)
        
        try {

            let tx = deactivateStake(activePubkey,stake.pubkey)

            tx = await addMeta(tx,activePubkey,connection)
    
            let signedTx = await signTransaction(tx)
            await submitTx(signedTx,stake,false,'deactivate',stake.account.lamports)
    
        }
        catch(e) {
            console.log(e.message)
            displayAlert(e.message,'error')
            setAwaitingSignature(false)
        }

    }

    const doClose = async (stake) => {
        
        setAwaitingSignature(true)
        
        try {
            let tx = closeStake(activePubkey, stake.pubkey, stake.account.lamports)

            tx = await addMeta(tx,activePubkey,connection)

            let signedTx = await signTransaction(tx)
            await submitTx(signedTx,stake,true,'close',stake.account.lamports)
        }
        catch(e) {
            console.log(e.message)
            displayAlert(e.message,'error')
            setAwaitingSignature(false)
        }
    }

    const doDelegate = async (stake, vote_identity, hideModal = false) => {

        setAwaitingSignature(true)
        
        try {
            let votePubkey = new PublicKey(vote_identity)

            let tx = delegateStake(activePubkey, stake.pubkey, votePubkey)

            tx = await addMeta(tx,activePubkey,connection)

            let signedTx = await signTransaction(tx)
            await submitTx(signedTx,stake,false,'delegate',stake.account.lamports)
        }
        catch(e) {
            console.log(e.message)
            displayAlert(e.message,'error')
            setAwaitingSignature(false)
        }
    }
    
    const doSearch = (input) => {
        
        const filteredValidators = [];
        if(input.length > config.DEFAULT_SEARCH_KEY_COUNT){
          validatorList.map((validator) => {
            
                let name = validator.name;
                let txtValue = validator.name + validator.identity + validator.vote_identity;
                
                if (txtValue.toUpperCase().indexOf(input.toUpperCase()) > -1 ) {
                    
                    let sf = "rank"
                    filteredValidators.sort((a,b) => (a[sf] > b[sf]) ? 1 : ((b[sf] > a[sf]) ? -1 : 0));
                    filteredValidators.push(validator);
                    
                }   
            })
            console.log(filteredValidators)
            setDelegateSearch(filteredValidators)
        }
        else setDelegateSearch([])

    }

    const renderDelegateSearchResults = () => {
        if(delegateSearch.length>0) {
            let result = []
            delegateSearch.map((validator,i) => {
                if(i<3) {
                    result.push((
                        <div className='d-flex flex-row align-items-center px-2 py-1' onClick={() => selectDelegateValidator(validator)} key={'delegate-search-'+validator.vote_identity}>
                            <div className='me-2'>
                                {(validator.image!=null) ? <RenderImage vote_identity={validator.vote_identity} img={validator.image} size={25} /> : null}
                            </div>
                            <div>
                                <RenderName validator={validator} />
                            </div>
                        </div>
                    ))
                }
            })

            return (
                <div className='d-flex flex-column bg-light text-dark rounded-bottom pt-2 delegate-search-results'>
                    {result}
                </div>
            )
        }
        else return null
    }

    const selectDelegateValidator = (validator: validatorI) => {
        setDelegateValidator(validator)
        setDelegateSearch([])
        setDelegateSearchInput('')
    }


    const renderRedelegateModal = () => {
        return (
            <Modal show={(delegatingStake!=null)} onHide={() => {setDelegatingStake(null); setDelegateValidator(null)}} dialogClassName='modal-md'>
                    <Modal.Header closeButton>
                        <Modal.Title>Delegate to a validator</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className='d-flex flex-column'>
                        <div className='d-flex flex-column'>
                            <InputGroup>
                                <Form.Control
                                    onChange={(event) => setDelegateSearchInput(event.target.value)}
                                    value={delegateSearchInput}
                                    placeholder='Type to search...'
                                ></Form.Control>
                            </InputGroup>
                            <div className='position-relative'>
                                {renderDelegateSearchResults()}
                            </div>
                            
                        </div>
                        {(delegateValidator!=null && clusterStats !=null) ?
                        <div className='d-flex justify-content-center flex-column mt-3'>
                            <div className='d-flex justify-content-center'>
                                <div className='fw-bold fs-5 mb-2'>
                                    <RenderImage
                                        img={delegateValidator.image}
                                        vote_identity={delegateValidator.vote_identity}
                                        size={60}
                                        className='border border-dark border-1'
                                    />
                                </div>
                            </div>
                            <div className='d-flex justify-content-center'>
                                <div className='fw-bold fs-5 mb-2 text-truncate'>
                                    <RenderName validator={delegateValidator} />
                                </div>
                            </div>
                            <div className='row'>
                                <div className='col col-md-3 fw-bold'>
                                    Vote Account
                                </div>
                                <div className='col col-md-9 text-truncate'>
                                        {delegateValidator.vote_identity}
                                </div>
                            </div>
                            <div className='row'>
                                <div className='col col-md-3 fw-bold'>
                                    Identity
                                </div>
                                <div className='col col-md-9 text-truncate'>
                                        {delegateValidator.identity}
                                </div>
                            </div>

                            <div className='d-flex text-center my-2'>
                                <div className='flex-grow-1'>
                                    <span className='pointer wiz-font me-3 '>WIZ SCORE</span>
                                    <span className='fw-bold'>{delegateValidator.wiz_score}%</span>
                                </div>
                                <div className='flex-grow-1'>
                                    <span className='wiz-font me-3'>WIZ RANK</span>
                                    <span className='fw-bold'>{ordinal(delegateValidator.rank)}</span>
                                </div>
                            </div>
                            <div className='d-flex my-2'>
                                <OverlayTrigger
                                    placement="bottom"
                                    overlay={
                                        <Tooltip>
                                            Skip rate (lower is better)
                                        </Tooltip>
                                    } 
                                >
                                    <div className='bg-wizlight rounded text-center flex-grow-1 m-1'>
                                        <div className='p-2'>
                                            {delegateValidator.skip_rate.toFixed(1)}%
                                        </div>
                                        <div>
                                            
                                                <i className='bi bi-box'></i>
                                            
                                        </div>
                                        <div className="progress bg-semidark" style={{height: '2px'}}>                        
                                            <div className="progress-bar bg-warning" role="progressbar" aria-valuenow={delegateValidator.skip_rate} aria-valuemin={0} aria-valuemax={100} style={{width: delegateValidator.skip_rate+'%'}}>
                                            </div>                    
                                        </div>                
                                    </div>
                                </OverlayTrigger>
                                <OverlayTrigger
                                    placement="bottom"
                                    overlay={
                                        <Tooltip>
                                            Voting rate (higher is better)
                                        </Tooltip>
                                    } 
                                >
                                    <div className='bg-wizlight rounded text-center flex-grow-1 m-1'>
                                        <div className='p-2'>   
                                            {delegateValidator.credit_ratio.toFixed(1)}%
                                        </div>
                                        <div>
                                            
                                                <i className='bi bi-pencil-square'></i>
                                            
                                        </div>
                                        <div className="progress bg-semidark" style={{height: '2px'}}>                        
                                            <div className="progress-bar bg-warning" role="progressbar" aria-valuenow={delegateValidator.credit_ratio} aria-valuemin={0} aria-valuemax={100} style={{width: delegateValidator.credit_ratio+'%'}}>
                                            </div>                    
                                        </div>    
                                    </div>
                                </OverlayTrigger>
                                <OverlayTrigger
                                    placement="bottom"
                                    overlay={
                                        <Tooltip>
                                            Commission
                                        </Tooltip>
                                    } 
                                >
                                    <div className='bg-wizlight rounded text-center flex-grow-1 m-1'>
                                        <div className='p-2'>
                                            {delegateValidator.commission/100}%
                                        </div>
                                        <div>
                                            
                                                <i className='bi bi-cash-coin'></i>
                                            
                                        </div>
                                        <div className="progress bg-semidark" style={{height: '2px'}}>                        
                                            <div className={(delegateValidator.commission<=1000) ? "progress-bar bg-warning" : "progress-bar bg-danger"} role="progressbar" aria-valuenow={delegateValidator.commission} aria-valuemin={0} aria-valuemax={1000} style={{width: delegateValidator.commission/10+'%'}}>
                                            </div>                    
                                        </div>  
                                    </div>
                                </OverlayTrigger>
                                <OverlayTrigger
                                    placement="bottom"
                                    overlay={
                                        <Tooltip>
                                            Estimated APY based on this epoch&apos;s performance
                                        </Tooltip>
                                    } 
                                >
                                    <div className='bg-wizlight rounded text-center flex-grow-1 m-1'>
                                        <div className='p-2'>
                                            {delegateValidator.total_apy}%
                                        </div>
                                        <div>
                                                <i className='bi bi-graph-up-arrow'></i>  
                                        </div>
                                        <div className="progress bg-semidark" style={{height: '2px'}}>                        
                                            <div className="progress-bar bg-warning" role="progressbar" aria-valuenow={delegateValidator.total_apy} aria-valuemin={0} aria-valuemax={10} style={{width: delegateValidator.total_apy*10+'%'}}>
                                            </div>                    
                                        </div> 
                                    </div>
                                </OverlayTrigger>
                            </div>
                            <div className='d-flex align-items-center my-2 flex-column'>
                                {(delegatingStake!=null) ? (
                                    <div className='badge bg-dark text-light p-2 px-3 fs-5'>
                                        ◎ {Number(delegatingStake.account.data.parsed.info.stake.delegation.stake/LAMPORTS_PER_SOL).toFixed(9)}
                                    </div>
                                ) : null }
                                <div className='text-light text-center'>
                                    Amount to delegate
                                    <br />
                                    (excludes rent exempt reserve)
                                </div>
                            </div>
                            <div className='my-2 text-center'>
                                <button 
                                    className='btn btn-outline-light px-5' 
                                    onClick={() => { 
                                        doDelegate(delegatingStake, delegateValidator.vote_identity)
                                    }}
                                    disabled={awaitingSignature}
                                    >
                                    🚀 Stake
                                </button>
                            </div>
                        </div>
                         : null}

                    </Modal.Body>
                </Modal>
        )
    }

    const renderRewardsModal = () => {

        if(rewardsStake!=null) {
            

            return (
                <Modal show={(rewardsStake!=null)} onHide={() => {setRewardsStake(null); setRewardsData([])}} dialogClassName='modal-lg'>
                    <Modal.Header closeButton>
                        <Modal.Title>Your stake rewards</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className='d-flex flex-column'>
            
                        {rewardsTable}

                    </Modal.Body>
                </Modal>
            )
        }
        else return null
    }

    const renderStakes = () => {
        if(stakes!=null && stakes.length > 0) {
            let result = []

            stakes.sort((a,b) => {
                if(a.account.data.parsed.info.stake !== null && b.account.data.parsed.info.stake !== null) {
                    try {
                        if(b.account.data.parsed.info.stake.delegation.stake === a.account.data.parsed.info.stake.delegation.stake) {

                            return b.pubkey.toString().toLowerCase().localeCompare(a.pubkey.toString().toLowerCase())
                        }
                        else {
                            return b.account.data.parsed.info.stake.delegation.stake - a.account.data.parsed.info.stake.delegation.stake
                        }
                    }
                    catch(e) {
                        console.log(b)
                    }
                }
            })

            stakes.map((stake) => {
                if(stake.account.data.parsed.info.stake !== null) {
                    let validator = findStakeValidator(stake.account.data.parsed.info.stake.delegation.voter);
                    let status = getStakeStatus(stake,epoch);
                    let statusbg = (status == 2) ? 'bg-success' : 'bg-secondary';
                    statusbg = (status == 1) ? 'bg-info' : statusbg;
                    statusbg = (status == 3) ? 'bg-warning' : statusbg;
                    let statustext = (status==3 || status ==1) ? 'text-dark' : 'text-white'
                    
                    result.push((
                        <div className='d-flex card-light rounded border border-1 border-dark flex-column align-items-center m-1 text-light my-stake-box mt-5' key={'stake-card-'+stake.pubkey.toString()}>
                            <div className='me-2 stake-image'>
                                {(validator!=null) ? (
                                <RenderImage
                                    img={validator.image}
                                    vote_identity={validator.vote_identity}
                                    size={60}
                                    className='border border-2 border-dark'
                                />   
                                ) : null}
                            </div>
                            <div className='fs-5 text-truncate w-100 px-3 text-center'>
                                <RenderName
                                    validator={validator}
                                />
                            </div> 
                            
                                <div className='d-flex align-items-center'>
                                    <div className='justify-content-center fs-6 p-1 px-3 badge bg-dark flex-nowrap ms-4'>
                                        ◎ {Number(stake.account.data.parsed.info.stake.delegation.stake/LAMPORTS_PER_SOL).toFixed(9)}
                                    </div>
                                    <div>
                                        <OverlayTrigger
                                            placement="top"
                                            overlay={
                                                <Tooltip>
                                                    Delegated amount, excludes rent exempt amount<br />(~ ◎ 0.002)
                                                </Tooltip>
                                            } 
                                        >
                                            <i className='bi bi-info-circle ms-2'></i>
                                        </OverlayTrigger>
                                    </div>
                                </div>
                            
                            <div className={'p-1 my-1 px-3 badge '+statusbg+' '+statustext}>
                                {StakeStatus[status]}
                            </div>
                            <div className='w-100 text-truncate p-1 px-3 text-center'>
                                <OverlayTrigger
                                    placement="top"
                                    overlay={
                                        <Tooltip>
                                            Click to copy stake account address
                                        </Tooltip>
                                    } 
                                >
                            
                                    <span className='pointer' onClick={() => {navigator.clipboard.writeText(stake.pubkey.toString())}}>
                                        <i className='bi bi-key me-2'></i>{stake.pubkey.toString()}
                                    </span>
                                
                                </OverlayTrigger>
                                
                            </div>
                            <div className='p-1'>
                                {renderStakeButtons(stake,status)}
                            </div>
                        </div>
                        
                    ))
                }
            })
            
            setRenderResult(result); 
        }
        else if(stakes!=null && initialFetch) {
            if(stakes.length==0) {
                setRenderResult((
                    <div className='d-flex justify-content-center text-white p-5 fs-5'>
                        Uh oh... looks like you don&apos;t have any stake accounts or we&apos;re having trouble finding them.
                    </div>
                ))
            }
            
        }
        
    }
    
    if(userPubkey == null) {
        return (
            <div className='w-50 p-2 border border-light text-light rounded text-center fs-5 m-auto mt-5'>
                    Please connect your wallet to view your stake accounts
            </div>

        )
    }
    else {
        return (
            <React.Fragment>
                [
                <div className='d-flex text-white mx-3 my-stakes-title-bar'>
                    <div className='fs-5 flex-grow-1'>
                        {(connected) ? 'Manage stake accounts' : 'View stake accounts'}
                    </div>
                    <div className='flex-shrink-1 align-items-center lh-1 my-stakes-connected-wallet-badge'>
                        <div className='badge bg-light text-dark d-flex align-items-center'>
                            {(connected) ? <span className='text-success'>Connected to</span> : <span className='text-success'>Viewing</span>} 
                            <span className='px-1 text-truncate'>{activePubkey.toString()}</span>
                            <OverlayTrigger
                                placement="top"
                                overlay={
                                    <Tooltip>
                                        {(connected) ? 'Disconnect' : 'Close wallet'}
                                    </Tooltip>
                                } 
                            >
                                <span className='pointer' onClick={() => unsetUserPublicKey()}>
                                    <i className='bi bi-x fs-6 fw-bold'></i>
                                </span>
                            </OverlayTrigger>
                        </div>
                    </div>
                </div>
                <div className='d-flex flex-wrap justify-content-center' key='my-stakes'>
                    {renderResult}
                </div>,
                <Alert 
                    show={(message!=null)} 
                    variant={(messageType=='error') ? 'danger' : 'success'} 
                    key='alert'
                    dismissible
                    className='my-stake-error'
                    >
                        {message}
                </Alert>,
                {renderRedelegateModal()},
                {renderRewardsModal()}
                ]
            </React.Fragment>
        )
        
    }
}