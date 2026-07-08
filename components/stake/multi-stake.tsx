import React, {useEffect, useState, FC, useCallback} from 'react';
import { clusterStatsI, EpochInfoI, validatorI } from '../validator/interfaces'
import config from '../../config.json';
import { Modal, Button, Overlay, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Authorized, Connection, Keypair, LAMPORTS_PER_SOL, Lockup, PublicKey, SIGNATURE_LENGTH_IN_BYTES, StakeProgram,  Transaction, ValidatorInfo } from '@solana/web3.js';
import RangeSlider from 'react-bootstrap-range-slider'
import { RenderImage, RenderName } from '../validator/common';
import { getEpochInfo, Spinner } from '../common';
import { getStakeAccounts, StakeInput, DistributionMethods } from './common'
import { addMeta, createStake } from './transactions'

import * as gtag from '../../lib/gtag.js'

export const MultiStakeDialog: FC<{
    stakeValidators: [validatorI],
    updateStakeValidators: Function,
    clearStakeValidators: Function,
    showStakeModal: boolean,
    hideStakeModal: Function,
    clusterStats: clusterStatsI,
    allowAlertDialog?: boolean,
    laine: validatorI
}> = ({stakeValidators,updateStakeValidators,clearStakeValidators,showStakeModal,hideStakeModal,clusterStats,allowAlertDialog, laine}) => {

    

    const { connection } = useConnection();
    const {connected, publicKey, sendTransaction, signTransaction, signAllTransactions} = useWallet();

    const [stakeRentExemptAmount, setStakeRentExemptAmount] = useState(config.DEFAULT_STAKE_RENT_LAMPORTS);
    const [stakeAmount, setStakeAmount] = useState(null);
    const [balance, setBalance] = useState(0);

    const[renderTime, setRenderTime] = useState(Math.floor(Date.now() / 1000));

    const [stakeInput, setStakeInput] = useState({validator:null,amount:null});

    const [signed, setSigned] = useState(false);
    const [submitError, setSubmitError] = useState(null)
    const [signatures, setSignatures] = useState([]);
    const [confirmations, setConfirmations] = useState([]);
    
    const [stakeDistribution, setStakeDistribution] = useState({})
    const [distributionMethod, setDistributionMethod] = useState(DistributionMethods.Equal);

    const doHide = () => {
        if(signed) clearStakeValidators()
        hideStakeModal();
        setTimeout(() => {
            setSigned(false);
            setSignatures([])
            setConfirmations([])
            setSubmitError(null)
        },500);
        
    }

    const validateAmount = (amount) => {
        setRenderTime(Math.floor(Date.now() / 1000));
        if(amount > balance/LAMPORTS_PER_SOL) setStakeAmount((balance-config.TX_RESERVE_LAMPORTS)/LAMPORTS_PER_SOL);
        else setStakeAmount(amount);

        calculateDistribution();
    }

    const getBalance = () => {
        if(publicKey && connection) {
            connection.getBalance(publicKey)
            .then((resolved) => {
                setBalance(resolved);
                if(stakeAmount==null && resolved > config.TX_RESERVE_LAMPORTS) setStakeAmount((resolved-config.TX_RESERVE_LAMPORTS)/LAMPORTS_PER_SOL);
            })
            .catch((error) => {
                console.log(error);
            });

        }
    }

    const getStakeRentExemptAmount= () => {
        if(publicKey && connection) {
            connection.getMinimumBalanceForRentExemption(StakeProgram.space)
            .then((resolved) => {
                    setStakeRentExemptAmount(resolved);
                
                
            })
            .catch((error) => {
                console.log(error);
            });

        }
    };

    const calculateDistribution = () => {
        if(stakeValidators!=null && distributionMethod != DistributionMethods.Custom) {

            let remainder = stakeAmount*LAMPORTS_PER_SOL - stakeValidators.length * stakeRentExemptAmount;
            let totalWizScore = 0;
            let totalAPY = 0;
            
            stakeValidators.map((validator) => {
                totalWizScore += validator.wiz_score;
                totalAPY += validator.total_apy;
            })

            let distribution = {};
            stakeValidators.map((validator,index) => {
                let validatorStake = stakeRentExemptAmount;
                switch(distributionMethod) {
                    case DistributionMethods.Equal:
                        validatorStake += remainder / stakeValidators.length;
                        break;
                    case DistributionMethods.WizScore:
                        validatorStake += remainder * (validator.wiz_score / totalWizScore);
                        break;
                    case DistributionMethods.APY:
                        validatorStake += remainder * (validator.total_apy / totalAPY);
                        break;
                }
                validatorStake = Math.floor(validatorStake);
                distribution[validator.vote_identity] = validatorStake;
            })
            setStakeDistribution({...distribution});
        }
    }

    const calculateCustomDistribution = (validator:validatorI, value: number) => {
        
        value = value * LAMPORTS_PER_SOL;

        if(isNaN(value) || (value <= stakeRentExemptAmount && value != 0)) value = stakeRentExemptAmount + 1;

        let oldValue = stakeDistribution[validator.vote_identity];
        if(oldValue==undefined) oldValue = 0;
        let newTotal = totalStake() - oldValue + value;

        console.log('total '+oldValue)

        if(newTotal > balance - config.TX_RESERVE_LAMPORTS) {
            console.log('Amount is too high');
            value = balance - totalStake() + oldValue - config.TX_RESERVE_LAMPORTS;
            if(value < stakeRentExemptAmount) value = 0;
        }

        let newStake = [];
        newStake[validator.vote_identity] = value;
        
        setStakeDistribution({
            ...stakeDistribution,
            ...newStake
        })
    }

    useEffect(() => {
        if(publicKey && connection) {
            getBalance();
            getStakeRentExemptAmount();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [renderTime]);

    useEffect(() => {
        calculateDistribution();
        if(stakeAmount != null ) {
            if(stakeAmount < minTotalStakeAmount()/LAMPORTS_PER_SOL) setStakeAmount(minTotalStakeAmount()/LAMPORTS_PER_SOL)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stakeValidators, stakeAmount, distributionMethod, balance, showStakeModal]);

    useEffect(() => {
        if(distributionMethod==DistributionMethods.Custom) {
            setStakeAmount(totalStake() / LAMPORTS_PER_SOL)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [distributionMethod, stakeDistribution, stakeValidators])

    useEffect(() => {
        if(stakeInput.validator != null){
            const timeoutId = setTimeout(() => {
                calculateCustomDistribution(stakeInput.validator,stakeInput.amount)
                setStakeInput({
                    validator:null,
                    amount: null
                })
            }, 500)
            return () => clearTimeout(timeoutId)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stakeInput])

    const renderName = (validator) => {
        if(validator!=null) {
            if(validator.name!='') {
                return validator.name;
            }
            else {
                return validator.vote_identity;
            }
        }
    }

    const renderStakeValidators = () => {
        console.log(laine)
        if(stakeValidators!=null) {
            let vl = [];
            stakeValidators.map((validator,index) => {
                vl.push((
                    <div className='d-flex align-items-center flex-row border border-secondary border-1 rounded mb-2 p-1 ps-2 multi-stake-validator-row' key={'stake-validator-'+validator.vote_identity}>
                        <div className='d-flex flex-shrink-1'>
                            <RenderImage
                                img={validator.image}
                                size={25}
                                vote_identity={validator.vote_identity}
                            />
                        </div>
                        <div className='ps-2 w-25 text-truncate flex-grow-1 multi-stake-validator-name'>
                            {renderName(validator)}
                        </div>
                        <div className='d-flex flex-row align-items-center lh-1 multi-stake-validator-badges flex-grow-1'>
                            <div className='badge bg-light text-dark ms-1'>
                                APY {validator.total_apy} %
                            </div>
                            <div className='badge bg-light text-dark ms-1'>
                                Comm {validator.commission/100} %
                            </div>
                            <div className='badge bg-light text-dark ms-1'>
                                <span className='wiz-font me-2'>Wiz</span> {validator.wiz_score} %
                            </div>
                            
                        </div>
                        <div className='mx-2 text-truncate d-flex'>
                            <div className='input-group input-group-sm'>
                                        <span className='input-group-text' id='stakeAmountInputText'>◎</span>
                                        <input  
                                            className='form-control text-center' 
                                            name={'stakeAmountInput-'+validator.vote_identity}
                                            type='number' 
                                            value={(stakeInput.validator==validator) ? stakeInput.amount : (stakeDistribution[validator.vote_identity]!=undefined) ? stakeDistribution[validator.vote_identity]/LAMPORTS_PER_SOL : 0} 
                                            onChange={(e) => setStakeInput({validator:validator,amount:parseFloat(e.target.value)})} 
                                            max={(balance - config.TX_RESERVE_LAMPORTS) / LAMPORTS_PER_SOL}    
                                            min={0}
                                            step={0.00005}
                                            disabled={(distributionMethod == DistributionMethods.Custom) ? false : true}
                                        />
                            </div>
                        </div>
                        <div className='ms-2 d-flex flex-grow-1 multi-stake-remove-button align-items-center'>
                            <i className='bi bi-x-lg pointer' onClick={() => updateStakeValidators(validator)}></i>
                            <span className='d-none' onClick={() => updateStakeValidators(validator)}>Remove</span>
                        </div>
                    </div>
                ))
            })
            if(!stakeValidators.includes(laine) && laine !=null) {
                vl.push((
                    <div className='d-flex align-items-center flex-row border border-secondary bg-secondary text-white border-1 rounded mb-1 p-1 px-2 multi-stake-validator-row' key={'stake-validator-'+laine.vote_identity}>
                        
                        
                        <div className='d-flex flex-shrink-1'>
                            <RenderImage
                                img={laine.image}
                                size={25}
                                vote_identity={laine.vote_identity}
                            />
                        </div>
                        <div className='ps-2 text-truncate me-5 multi-stake-validator-name'>
                            {renderName(laine)}
                        </div>
                        <div className='d-flex flex-row align-items-center lh-1 multi-stake-validator-badges flex-grow-1'>
                            <div className='badge bg-light text-dark ms-1'>
                                APY {laine.total_apy} %
                            </div>
                            <div className='badge bg-light text-dark ms-1'>
                                Comm {laine.commission/100} %
                            </div>
                            <div className='badge bg-light text-dark ms-1'>
                                <span className='wiz-font me-2'>Wiz</span> {laine.wiz_score} %
                            </div>
                            
                        </div>
                        <div className='text-truncate d-flex'>
                            <button className='btn btn-outline-warning btn-sm bg-success text-light' onClick={() => { updateStakeValidators(laine); calculateDistribution() }}>
                                <i className='bi bi-plus me-1'></i>Stake with us
                            </button>
                        </div>
                        
                        <div className='mx-2 d-flex flex-grow-1'>
                            
                        </div>
                    </div>
                ))
            }
            return vl;
        }
        return null;
    }

    const estimatedAPY = () => {
        let apy_multiples = 0;
        stakeValidators.map((validator) => {
            if(stakeDistribution[validator.vote_identity]!=undefined) apy_multiples += validator.total_apy * stakeDistribution[validator.vote_identity];
        });

        return Math.round((apy_multiples / stakeAmount/LAMPORTS_PER_SOL*100)+Number.EPSILON) / 100;
    }

    const totalStake = () => {
        let total = 0;
        stakeValidators.map((validator) => {
            if(stakeDistribution[validator.vote_identity]!=undefined) total += stakeDistribution[validator.vote_identity];
        });

        return total;
    }

    const totalValidators = () => {
        let total = 0;
        stakeValidators.map((validator) => {
            if(stakeDistribution[validator.vote_identity]!=undefined && stakeDistribution[validator.vote_identity] != 0) total += 1;
        });
        return total
    }

    const minTotalStakeAmount = () => {
        if(stakeValidators !=null) {
            return (stakeRentExemptAmount+1) * stakeValidators.length;
        }
        else {
            return stakeRentExemptAmount + 1;
        }
    }

    const renderSignatureConfirmations = () => {
        let result = [];

        signatures.map((signature, i) => {
            result.push((
                <div className='d-flex align-items-center flex-grow-1 flex-row flex-nowrap stake-signature-row px-3' key={'signature-result-'+signature+confirmations.length}>
                    <div className='fw-bold badge rounded-pill bg-light text-dark'>
                        {i+1}
                    </div>
                    <div className='d-flex flex-grow-1 ms-2'>
                        {confirmations.includes(signature) ? (
                            <div>
                                <i className='bi bi-check text-success' style={{fontSize:'2rem'}}></i>
                            </div>
                            ) : (
                                <div className="spinner-border spinner-border-sm m-2" role="status">
                                    <span className="visually-hidden">Pending...</span>
                                </div>        
                        )}
                    </div>
                    <div className='d-flex flex-grow-1 ms-2 flex-nowrap w-25 link-dark text-center'>
                        <a href={config.EXPLORER_TX_BASE+signature} target="_blank" rel="noreferrer">View in Explorer<i className='bi bi-box-arrow-up-right ms-2'></i></a>
                    </div>
                    <div className='text-truncate ms-2'>
                        {signature}
                    </div> 
                </div>
            ))
        })

        return result
    }

    const doStake = async () => {

        try {
            
            let txs = [];
            let signers = [];
            let recentBlockhash = await connection.getLatestBlockhash();

            stakeValidators.map((validator) => {

                let [stakeTx, delegateIx, stakeKeys] = createStake(publicKey, validator, stakeDistribution[validator.vote_identity])

                txs.push(stakeTx);
                txs.push(delegateIx);
                signers.push(stakeKeys);
            })

            const buildTxs = async (txs) => {
                let transactions = [];
                let i = 0
                for(const tx of txs) {
                    let y = Math.floor(i / 4);
                
                    if(transactions[y]==undefined) {
                        transactions[y] = new Transaction();
                        transactions[y] = await addMeta(transactions[y],publicKey,connection)
                        
                    }
    
                    transactions[y].add(tx);
                    i++
                }

                return transactions
                
            }

            const transactions = await buildTxs(txs)

            signers.map((keypair, i) => {
                let y = Math.floor(i / 2);

                transactions[y].partialSign(keypair);
            })
            let signedTx = await signAllTransactions(transactions);
            setSigned(true);
            let sigs = []

            for(let i = 0; i < signedTx.length; i++) {

                let signature = await connection.sendRawTransaction(signedTx[i].serialize())
                console.log('Submitted transaction with signature: '+signature);
                sigs.push(signature)
                
            }

            setSignatures(sigs)

            gtag.event({
                action: 'multi-stake-tx',
                category: 'delegate',
                label: stakeValidators.length,
                value: stakeAmount * LAMPORTS_PER_SOL
              })

            let confs = []

            for(let i = 0; i < sigs.length; i++) {
                let confirmation = await connection.confirmTransaction({
                    signature: sigs[i], 
                    blockhash: recentBlockhash.blockhash, 
                    lastValidBlockHeight: recentBlockhash.lastValidBlockHeight}, 
                    'confirmed'
                )
                if(confirmation.value.err==null) confs.push(sigs[i])
            }
            setConfirmations(confs)
        }
        catch(error) {
            console.log(error);
            setSigned(false);
            setSignatures([]);
            setConfirmations([]);
            setSubmitError((error.message=='') ? 'An error occured, please try again.' : error.message)
        }

    };

    if(stakeValidators!=null && clusterStats !=null && Object.keys(stakeDistribution).length>0) {
        
        return (
            <Modal show={showStakeModal} onHide={() => doHide()} dialogClassName='modal-lg multi-stake-modal-modal'>
                <Modal.Header closeButton>
                    <Modal.Title>Create stake accounts</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    
                {(!signed) ? (
                    <div className='d-flex flex-column'>
                        
                        <div className='p-2 flex-grow-1 border border-secondary border-2'>
                            <div className='fs-5 flex-grow-1 text-center'>
                                Total to Stake
                            </div>
                            <div className='d-flex flex-grow-1 justify-content-center'>
                                <div className='multi-stake-input-container'>
                                    <StakeInput
                                        key={'stake-range-slider-'+totalStake()}
                                        balance={balance}
                                        minStakeAmount={minTotalStakeAmount()}
                                        stakeAmount={totalStake() / LAMPORTS_PER_SOL}
                                        updateAmount={(amount) => validateAmount(amount)}
                                        readOnly={(distributionMethod == DistributionMethods.Custom) ? true : false}
                                    />
                                </div>
                            </div>
                            <div className='d-flex flex-row justify-content-center align-items-center'>
                                <div className='d-flex flex-grow-1 justify-content-center'>
                                    <div className='input-group input-group multi-stake-input-container'>
                                        <span className='input-group-text' id='stakeAmountInputText'>◎</span>
                                        <input  
                                            key={'stake-amount-input'+totalStake}
                                            className='form-control text-center fs-6' 
                                            name='stakeAmountInput' 
                                            type='number' 
                                            value={totalStake()/LAMPORTS_PER_SOL} 
                                            onChange={(event) => validateAmount(parseFloat(event.target.value))} 
                                            max={(balance - config.TX_RESERVE_LAMPORTS) / LAMPORTS_PER_SOL}    
                                            min={minTotalStakeAmount()}
                                            disabled={(distributionMethod == DistributionMethods.Custom) ? true : false}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className='flex-grow-1'>
                                <div className="balance-sm text-center text-light">Balance: ◎ {balance/LAMPORTS_PER_SOL}</div>
                            </div>
                        </div>
                        <div className='p-2 my-2 flex-grow-1 border border-secondary border-2'>
                            <div className='fs-5 mb-2 flex-grow-1 text-center'>
                                Stake distribution
                            </div>
                            <div className='d-flex multi-stake-distribution-buttons'>
                                <button className='btn btn-outline-light flex-grow-1 mx-2' disabled={(distributionMethod==DistributionMethods.Equal)} onClick={() => setDistributionMethod(DistributionMethods.Equal)}>
                                    Equal
                                </button>
                                <button className='btn btn-outline-light flex-grow-1 mx-2 wiz-font wiz-score-distribution-button' disabled={(distributionMethod==DistributionMethods.WizScore)} onClick={() => setDistributionMethod(DistributionMethods.WizScore)}>
                                    Wiz Score
                                </button> 
                                <button className='btn btn-outline-light flex-grow-1 mx-2' disabled={(distributionMethod==DistributionMethods.APY)} onClick={() => setDistributionMethod(DistributionMethods.APY)}>
                                    APY
                                </button> 
                                <button className='btn btn-outline-light flex-grow-1 mx-2' disabled={(distributionMethod==DistributionMethods.Custom)} onClick={() => setDistributionMethod(DistributionMethods.Custom)}>
                                    Custom
                                </button>
                            </div>
                        </div>
                        <div className='flex-grow-1 border border-warning border-2 p-1 pb-3'>
                            <div className='fs-5 py-2 flex-grow-1 text-center'>
                                Your validator selection
                            </div>
                            <div>
                                {renderStakeValidators()}
                            </div>
                            
                        </div>
                        <div className='p-2 me-1 flex-grow-1'>
                            <div className='d-flex flex-grow-1 flex-row align-items-center multi-stake-summary'>
                                <div className='d-flex flex-column align-items-center flex-grow-1'>
                                    <div className='fs-5 fw-bold'>
                                        {totalValidators()}
                                    </div>
                                    <div>
                                        Validators
                                    </div>
                                </div>
                                <div className='d-flex flex-column align-items-center flex-grow-1'>
                                    <div className='fs-5 fw-bold'>
                                    ◎ {totalStake() / LAMPORTS_PER_SOL}
                                    </div>
                                    <div>
                                        Total to stake
                                    </div>
                                </div>
                                <div className='d-flex flex-column align-items-center flex-grow-1'>
                                    <div className='fs-5 fw-bold'>
                                        {estimatedAPY()} %
                                    </div>
                                    <div>
                                        Estimated APY
                                    </div>
                                </div>
                            </div>
                            <div className='mt-2 flex-grow-1 text-center'>
                                <button className='btn btn-outline-light px-5' onClick={() => doStake()}>
                                    🚀 Stake
                                </button>
                            </div>
                            {(submitError!=null) ? (
                                <div className="alert alert-danger show text-center mt-2">
                                    {submitError}
                                </div>
                            ) : null}
                        </div>
                        
                    </div>
                ) : (
                    <div className='my-2 flex-grow-1'>
                        <div className='flex-grow-1 my-2 fs-5 text-center'>
                            Staking ◎ {totalStake() / LAMPORTS_PER_SOL} to {totalValidators()} validators
                        </div>
                        {renderSignatureConfirmations()}
                        <div className='flex-grow-1 my-2 text-center'>
                            <div className='border rounded border-1 border-secondary m-2 p-2'>
                                Consider setting up some alerts, that way you&apos;ll be notified should your chosen validator change their commission or be delinquent for an extended period.
                            </div>
                        </div>
                        <div className='flex-grow-1 my-2 text-center'>
                            <button className='btn btn-outline-light' onClick={() => doHide()}>
                                Close
                            </button>
                        </div>
                    </div>
                )}
                </Modal.Body>
            </Modal>
        );
    }
    else {
        return null;
    }
}


