import React, { useRef, FC, useContext } from 'react';
import axios from 'axios';
import config from '../../config.json';
import { validatorI, ValidatorBoxPropsI, ValidatorListI, ValidatorListingI, validatorDetailI, clusterStatsI } from './interfaces'
import {checkSolflareEnabled, ConditionalWrapper, getClusterStats, Spinner} from '../common'
import { RenderImage, RenderName, RenderUrl, StakeLabel } from './common';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Gauges } from './gauges';
import { StakeHistoryChart } from './stake_history';
import { WizScoreBody, WizScoreChart } from '../wizscore';
import { DelinquencyChart } from './delinquency';
import { EpochStakeChart } from './epoch_stake';
import { AlertForm } from '../alert';
import { StakeDialog } from '../stake/single-stake';
import { getCommissionHistory, getJitoCommissionHistory } from '../stake/common';
import { CommissionHistoryI, JitoCommissionHistoryI } from '../stake/interfaces';
import * as browser from '../../lib/browser';
import { VoteSuccessChart } from './vote_success';
import { SkipRateChart } from './skip_rate';

const API_URL = process.env.API_BASE_URL;

class ValidatorDetail extends React.Component<validatorDetailI, 
    {
        validator: validatorI|null;
        stake_change: number|null;
        showStakeModal: boolean;
        clusterStats: clusterStatsI|null;
        commissionHistory: CommissionHistoryI[]|null;
        jitoCommissionHistory: JitoCommissionHistoryI[]|null;
    }> {
    constructor(props) {
        super(props);
        this.state = {
            validator: null,
            stake_change: null,
            showStakeModal: false,
            clusterStats: null,
            commissionHistory: null,
            jitoCommissionHistory: null,
        };
        if(this.props.vote_identity!='') this.getValidator();
        if(this.state.clusterStats==null) getClusterStats().then((stats) => {
            this.setState({
                clusterStats: stats
            });
        });
        if(this.state.commissionHistory==null) getCommissionHistory(this.props.vote_identity).then((history) => {
            this.setState({
                commissionHistory: history
            })
        })
        if(this.state.jitoCommissionHistory==null) getJitoCommissionHistory(this.props.vote_identity).then((history) => {
            this.setState({
                jitoCommissionHistory: history
            })
        })
    }
    getValidator() {
        axios(API_URL+config.API_ENDPOINTS.validator+'/'+this.props.vote_identity, {
          headers: {'Content-Type':'application/json'}
        })
          .then(response => {
            let json = response.data as validatorI;
            
            
            this.setState({
                validator: json
            })

            let title = this.props.vote_identity;
            if(json.name!='') title = json.name;
            
            this.props.updateTitle(title);
          })
          .catch(e => {
            console.log(e);
            setTimeout(() => { this.getValidator() }, 5000);
          })
    }

    renderName() {
        if(this.state.validator!==null) {
            if(this.state.validator.name=='') {
                return this.state.validator.vote_identity;
            }
            else return this.state.validator.name;
        }
    }

    updateStakeChange(change) {
        
        this.setState({
            stake_change: change
        });
    }

    renderCommissionLabel() {
        if(this.state.commissionHistory!==null && this.state.validator !== null) {
            if(this.state.commissionHistory.length>0) {
                if(this.state.commissionHistory[0].commission == this.state.validator.commission) {
                    let isSafari:boolean = browser.check('Safari');

                    let since: Date|null = null

                    if(isSafari){
                        let timeZone = this.state.commissionHistory[0].observed_at.slice(-3)+':00';
                        since = new Date(this.state.commissionHistory[0].observed_at.substring(0, 19).replace(/-/g, "/")+timeZone)
                    }else{                
                        since = new Date(this.state.commissionHistory[0].observed_at)
                    }
                    return (
                        <div className='badge bg-light text-dark badge-sm mx-1'>
                            Since {since.toLocaleDateString(undefined, {
                                dateStyle: "medium"
                            })}
                        </div>
                    )
                }
            }
        }
    }

    renderJitoCommissionLabel() {
        if(this.state.validator !== null && this.state.validator.is_jito) {
           
                    
                    return (
                        <div className={'badge fw-normal badge-sm mx-1 border'+((this.state.validator.jito_commission_bps/100>10)?' border-warning':' border-info')}>
                            <OverlayTrigger
                                placement="top"
                                overlay={
                                    <Tooltip>
                                        {(this.state.validator.jito_commission_bps/100 > 10) ?
                                            "Caution: High MEV commission. This is the commission charged on MEV Tips earned through Jito, remainder goes to stakers."
                                        :
                                            "Commission charged on MEV Tips earned through Jito, remainder goes to stakers"}
                                    </Tooltip>
                                } 
                            >
                                <span>JITO {this.state.validator.jito_commission_bps/100}%</span>
                            </OverlayTrigger>
                        </div>
                    )
                
        }
    }

    renderCommissionTable() {
        if(this.state.commissionHistory!==null && this.state.commissionHistory.length>0) {

            let rows: JSX.Element[] = []
            this.state.commissionHistory.map((event,i) => {
                let isSafari:boolean = browser.check('Safari');

                let formatted_date: Date|null = null

                if(isSafari){
                    let timeZone = event.observed_at.slice(-3)+':00';
                    formatted_date = new Date(event.observed_at.substring(0, 19).replace(/-/g, "/")+timeZone)
                }else{                
                    formatted_date = new Date(event.observed_at)
                }

                let prev_comm = (this.state.commissionHistory!==null && i+1 < this.state.commissionHistory.length) ? this.state.commissionHistory[i+1].commission/100+' %' : 'N/A'

                let row = (
                    <tr key={'commission-history-row-'+i}>
                        <th scope='row' className='fw-normal'>
                            {formatted_date.toLocaleDateString(undefined,{dateStyle:'medium'})+' '+formatted_date.toLocaleTimeString()}
                        </th>
                        <td>
                            {prev_comm}
                        </td>
                        <td>
                            {event.commission/100} %
                        </td>
                    </tr>
                )
                rows.push(row)
            })

            return (
                <table className='table table-sm text-light table-dark'>
                    <thead>
                        <tr>
                            <th scope='col'>
                                Observation time
                            </th>
                            <th scope='col'>
                                Previous commission
                            </th>
                            <th scope='col'>
                                New commission
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows}
                    </tbody>
                </table>
            )
        }
        else {
            return <div>No commission changes in our records for this validator.<br /><br />Our data begins from 28 Dec 2021.</div>
        }
        
    }

    renderJitoCommissionTable() {
        if(this.state.jitoCommissionHistory!==null && this.state.jitoCommissionHistory.length>0) {

            let rows: JSX.Element[] = []
            this.state.jitoCommissionHistory.map((event,i) => {
                let isSafari:boolean = browser.check('Safari');

                let formatted_date: Date|null = null

                if(isSafari){
                    let timeZone = event.created_at.slice(-3)+':00';
                    formatted_date = new Date(event.created_at.substring(0, 19).replace(/-/g, "/")+timeZone)
                }else{                
                    formatted_date = new Date(event.created_at)
                }
                let prev_comm = (this.state.jitoCommissionHistory!==null && i+1 < this.state.jitoCommissionHistory.length && this.state.jitoCommissionHistory[i+1].commission_bps != null)  ? this.state.jitoCommissionHistory[i+1].commission_bps/100+' %' : null
                if(i==this.state.jitoCommissionHistory.length-1) prev_comm = 'N/A';

                let row = (
                    <tr key={'commission-history-row-'+i}>
                        <th scope='row' className='fw-normal'>
                            {formatted_date.toLocaleDateString(undefined,{dateStyle:'medium'})+' '+formatted_date.toLocaleTimeString()}
                        </th>
                        <td>
                            {(prev_comm==null) ? "Not running Jito" : prev_comm}
                        </td>
                        <td>
                            {(event.commission_bps==null) ? "Not running Jito" : event.commission_bps/100+" %"}
                        </td>
                    </tr>
                )
                rows.push(row)
            })

            return (
                <table className='table table-sm text-light table-dark'>
                    <thead>
                        <tr>
                            <th scope='col'>
                                Observation time
                            </th>
                            <th scope='col'>
                                Previous commission
                            </th>
                            <th scope='col'>
                                New commission
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows}
                    </tbody>
                </table>
            )
        }
        else {
            return <div>No commission changes in our records for this validator.<br /><br />Our data begins from 28 Dec 2021.</div>
        }
        
    }

    render() {
        const alertFormRef = React.createRef()
        const scrollToAlertForm = () => (alertFormRef.current as HTMLElement).scrollIntoView()
        const solflareEnabled = checkSolflareEnabled(this.props.userPubkey);

        if(this.state.validator!=null) {
            console.log(this.state.validator)

            let updated_at = new Date(this.state.validator.updated_at);

            let activated_stake = new Intl.NumberFormat().format(Number(this.state.validator.activated_stake.toFixed(0)));

            return ( [
                <div className='container-sm m-1 position-relative d-flex align-items-center validator-detail-header' key='validator-details-header'>
                    
                   
                    <div className='d-flex flex-grow-1 flex-column validator-delinquency-container'>
                        <div className='d-flex flex-row validator-detail-name text-truncate '>
                            <RenderImage
                                img={this.state.validator.image}
                                vote_identity={this.state.validator.vote_identity}
                                size={50}
                                className={(this.state.validator.delinquent) ? 'border border-danger border-3' : ''}
                            />
                            <h4 className='d-flex align-items-center text-white ms-2 text-truncate mb-0'><RenderName validator={this.state.validator} /></h4>
                        </div>
                        <div className='d-flex flex-row delinquent-label'>
                            {(this.state.validator.delinquent) ? (
                                <div className='badge bg-danger ms-2'>
                                    <OverlayTrigger
                                        placement="bottom"
                                        overlay={
                                            <Tooltip>
                                                This validator is currently delinquent, which means they aren&apos;t voting.
                                            </Tooltip>
                                        } 
                                    > 
                                        <span>DELINQUENT</span>
                                    </OverlayTrigger>
                                </div>
                            ): null}
                        </div>
                    </div>
                    <div className='d-flex'>
                        <Gauges
                            skip_rate={this.state.validator.skip_rate}
                            credit_ratio={this.state.validator.credit_ratio}
                            wiz_score={this.state.validator.wiz_score}
                            uptime={this.state.validator.uptime}

                        />
                    </div>
                        
                        
                </div>,
                <div className='d-flex flex-column validator-details-content' key='validator-details-content'>
                    {(this.state.validator.admin_comment!==null) ?
                        <div className='d-flex p-1 border border-warning rounded m-2 text-light'>
                            <span className='fw-bold mx-2'>Admin Comment:</span> {this.state.validator.admin_comment}
                        </div>
                    : null }
                    {(this.state.validator.bls_pubkey==null) ?
                        <div className='d-flex p-1 border border-warning rounded m-2 text-light'>
                            <span className='fw-bold mx-2'>Warning to operator:</span> Your vote account has not set a BLS Pubkey. Your validator may be excluded from consensus in the future if not set, check Solana Tech Discord for instructions! 
                        </div>
                    : null }
                    <div className='d-flex flex-column p-2 text-white position-relative validator-detail-box m-1'>
                        
                        <div className='validator-detail-flex-opacity-bg'></div>
                        <div className='validator-buttons'>
                            <button className='btn btn-outline-light mx-1' onClick={scrollToAlertForm}>
                                + Create Alert
                            </button>
                            <ConditionalWrapper
                                    condition={(!this.props.connected) ? true : false}
                                    wrapper={children => (
                                        <OverlayTrigger
                                            placement="right"
                                            overlay={
                                                <Tooltip>
                                                    Connect wallet to enable
                                                </Tooltip>
                                            } 
                                        >
                                            {children}
                                        </OverlayTrigger>
                                    )}
                            >
                                <span>
                                    <button 
                                        className='btn btn-outline-light mx-1' 
                                        onClick={() => this.setState({showStakeModal:true})}
                                        disabled={!this.props.connected}
                                        >
                                        + Stake
                                    </button>
                                </span>
                            </ConditionalWrapper>
                        </div>
                            <div className='row'>
                                <div className='col'>
                                        <div className='row mb-2'>
                                            <div className='col col-md-2 fw-bold'>
                                                Identity
                                            </div>
                                            <div className='col text-truncate'>

                                                <OverlayTrigger
                                                    placement="top"
                                                    overlay={
                                                        <Tooltip>
                                                            Copy
                                                        </Tooltip>
                                                    } 
                                                >
                                                    <span className='pointer' onClick={() => {navigator.clipboard.writeText((this.state.validator!==null) ? this.state.validator.identity : '')}}>{this.state.validator.identity}</span>
                                                </OverlayTrigger>
                                            </div>
                                        </div>
                                </div>
                            </div>
                            <div className='row'>
                                <div className='col'>
                                    <div className='row mb-2'>
                                            <div className='col col-md-2 fw-bold'>
                                                Vote Account
                                            </div>
                                            <div className='col text-truncate'>

                                                <OverlayTrigger
                                                    placement="top"
                                                    overlay={
                                                        <Tooltip>
                                                            Copy
                                                        </Tooltip>
                                                    } 
                                                >
                                                    <span className='pointer' onClick={() => {navigator.clipboard.writeText((this.state.validator!==null) ? this.state.validator.vote_identity : '')}}>{this.state.validator.vote_identity}</span>
                                                </OverlayTrigger>
                                            </div>
                                        </div>
                                </div>
                            </div>
                            <div className='row'>
                                <div className='col'>
                                    <div className='row mb-2'>
                                        <div className='col col-md-2 fw-bold'>
                                            Description
                                        </div>
                                        <div className='col'>
                                            {this.state.validator.description}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='row mobile-validator-info-row'>
                                <div className='col'>
                                    <div className='row mb-2'>
                                        <div className='col fw-bold'>
                                            Website
                                        </div>
                                        <div className='col text-truncate'>
                                            <RenderUrl
                                                url={this.state.validator.website}
                                            />
                                        </div>
                                    </div>
                                    
                                </div>  
                                <div className='col'>
                                    <div className='row mb-2'>
                                        <div className='col fw-bold'>
                                            Commission
                                        </div>
                                        <div className='col d-flex align-items-center'>
                                            {this.state.validator.commission/100} %
                                            {this.renderJitoCommissionLabel()}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className='col'>
                                    <div className='row mb-2'>
                                        <div className='col fw-bold'>
                                            
                                        </div>
                                        <div className='col'>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='row  mobile-validator-info-row'>
                            <div className='col'>
                                    <div className='row'>
                                        <div className='col fw-bold'>
                                            TrueAPY (estimate)
                                            <OverlayTrigger
                                                placement="bottom"
                                                overlay={
                                                    <Tooltip>
                                                        Our TrueAPY is based on a 10-epoch median of both the true staking APY and Jito MEV APY (where applicable).
                                                    </Tooltip>
                                                } 
                                            >
                                                <i className='bi bi-info-circle ms-2'></i>
                                            </OverlayTrigger>
                                        </div>
                                        <div className='col d-flex align-items-center'>
                                            <div>{this.state.validator.total_apy} %</div>
                                            <div className='d-flex flex-row'>
                                                <OverlayTrigger
                                                    placement="bottom"
                                                    overlay={
                                                        <Tooltip>
                                                            10-epoch median native staking APY
                                                        </Tooltip>
                                                    } 
                                                >
                                                    <div className='badge fw-normal badge-sm ms-2 me-1 bg-dark border border-light text-light'>
                                                        <span className='font-italic'>S</span> {this.state.validator.staking_apy} %
                                                    </div>
                                                </OverlayTrigger>
                                                {(this.state.validator.is_jito) ? 
                                                    <OverlayTrigger
                                                        placement="bottom"
                                                        overlay={
                                                            <Tooltip>
                                                                10-epoch cluster-median Jito MEV APY
                                                            </Tooltip>
                                                        } 
                                                    >
                                                        <div className='badge fw-normal badge-sm bg-dark border border-light text-light'>
                                                            <span className='font-italic'>J</span> {this.state.validator.jito_apy} %
                                                        </div>
                                                    </OverlayTrigger>
                                                    : null
                                                }
                                            </div>
                                            
                                        </div>
                                    </div>
                                </div>
                                <div className='col'>
                                    <div className='row'>
                                        <div className='col fw-bold'>
                                            Stake
                                        </div>
                                        <div className='col d-flex align-items-center'>
                                            ◎ {activated_stake}
                                            <StakeLabel
                                                stake={(this.state.stake_change!==null) ? this.state.stake_change : 0}
                                                />
                                        </div>
                                    </div>
                                </div>
                                <div className='col'>
                                    <div className='row'>
                                        <div className='col fw-bold'>
                                            Version
                                        </div>
                                        <div className='col'>
                                            <div className='col d-flex align-items-center'>
                                                {this.state.validator.version}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            
                        
                    </div>


                    <div className='d-flex mb-1 flex-grow-1 flex-wrap validator-detail-flex-container'>
                        <div className='flex-grow-1 m-1 validator-detail-flex-card delinquency-flex-card'>
                            <div className='validator-detail-flex-opacity-bg'></div>
                            <div className='card text-light delinquency-card'>
                                <div className='card-header'>
                                    Uptime
                                </div>
                                <div className='card-body d-flex align-items-center delinquency-card-body'>
                                    <DelinquencyChart
                                        vote_identity={this.state.validator.vote_identity}
                                        first_epoch={this.state.validator.first_epoch_with_stake}
                                    />
                                </div>
                                
                            </div>
                        </div>
                        <div className='flex-grow-1 m-1 validator-detail-flex-card'>
                            <div className='validator-detail-flex-opacity-bg'></div>
                            <div className='card text-light'>
                                <div className='card-header'>
                                    24h Moving Average Wiz Score
                                </div>
                                <div className='card-body'>
                                    <WizScoreChart 
                                        vote_identity={this.state.validator.vote_identity}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className='flex-grow-1 m-1 validator-detail-flex-card'>
                            <div className='validator-detail-flex-opacity-bg'></div>
                            <div className='card text-light'>
                                <div className='card-header'>
                                    Active Stake (30 epochs)
                                </div>
                                <div className='card-body'>
                                    <StakeHistoryChart
                                        vote_identity={this.state.validator.vote_identity}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className='flex-grow-1 m-1 validator-detail-flex-card'>
                            <div className='validator-detail-flex-opacity-bg'></div>
                            <div className='card text-light'>
                                <div className='card-header'>
                                    Stake changes this epoch: 
                                    <StakeLabel
                                        stake={(this.state.stake_change!==null) ? this.state.stake_change : 0}
                                    />
                                </div>
                                <div className='card-body epoch-stake-chart-container'>
                                    <EpochStakeChart 
                                        vote_identity={this.state.validator.vote_identity}
                                        updateStake={(change) => this.updateStakeChange(change)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className='flex-grow-1 m-1 validator-detail-flex-card'>
                            <div className='validator-detail-flex-opacity-bg'></div>
                            <div className='card text-light'>
                                <div className='card-header'>
                                    Vote Success
                                    <OverlayTrigger
                                        placement="bottom"
                                        overlay={
                                            <Tooltip>
                                                Last 2000 observations of vote success rate taken during our Wiz Score snapshots, approximately every five minutes. Vote Success is the percentage of total elapsed slot in the epoch that the validator has voted on.
                                            </Tooltip>
                                        } 
                                    >
                                        <i className='bi bi-info-circle ms-2'></i>
                                    </OverlayTrigger>
                                </div>
                                <div className='card-body'>
                                    <VoteSuccessChart
                                        vote_identity={this.state.validator.vote_identity}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className='flex-grow-1 m-1 validator-detail-flex-card'>
                            <div className='validator-detail-flex-opacity-bg'></div>
                            <div className='card text-light'>
                                <div className='card-header'>
                                    Skip Rate
                                    <OverlayTrigger
                                        placement="bottom"
                                        overlay={
                                            <Tooltip>
                                                Last 2000 observations of skip rate taken during our Wiz Score snapshots, approximately every five minutes
                                            </Tooltip>
                                        } 
                                    >
                                        <i className='bi bi-info-circle ms-2'></i>
                                    </OverlayTrigger>
                                </div>
                                <div className='card-body'>
                                    <SkipRateChart
                                        vote_identity={this.state.validator.vote_identity}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className='flex-grow-1 m-1 validator-detail-flex-card'>
                            <div className='validator-detail-flex-opacity-bg'></div>
                            <div className='card text-light'>
                                <div className='card-header'>
                                    Scorecard
                                </div>
                                <div className='card-body validator-detail-scorecard'>
                                    <WizScoreBody
                                    validator={this.state.validator}
                                />
                                </div>
                            </div>
                        </div>
                        <div className='flex-grow-1 m-1 validator-detail-flex-card'>
                            <div className='validator-detail-flex-opacity-bg'></div>
                            <div className='card text-light'>
                                <div className='card-header'>
                                    Commission History
                                </div>
                                <div className='card-body'>
                                    {this.renderCommissionTable()}
                                </div>
                            </div>
                            <div className='card text-light'>
                                <div className='card-header'>
                                    Jito MEV Commission History
                                </div>
                                <div className='card-body'>
                                    {this.renderJitoCommissionTable()}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='row'>
                        <div ref={alertFormRef as React.RefObject<HTMLDivElement>} className='col p-2 text-white border border-white rounded'>
                            <AlertForm
                                validator={this.state.validator}
                                hideAlertModal={null}
                                userPubkey={this.props.userPubkey}
                                solflareEnabled={this.props.solflareEnabled}
                            />
                        </div>
                    </div>
                    <div className='text-secondary fst-italic text-end my-1'>
                        Updated: {updated_at.toLocaleString()}
                    </div>
                </div>,
                <StakeDialog
                    key='stakeModal'
                    validator={this.state.validator}
                    showStakeModal={this.state.showStakeModal}
                    hideStakeModal={() => this.setState({showStakeModal:false})}
                    clusterStats={this.state.clusterStats}
                />
            ]
            )
        }
        else {
            return (
                <Spinner />
            )
        }
    }
}

export {ValidatorDetail}