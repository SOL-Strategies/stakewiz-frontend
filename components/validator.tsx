import React, { useRef, FC, useContext } from 'react';
import axios from 'axios';
import config from '../config.json';
import SearchBar from './search';
import {WizScore, WizScoreBody, WizScoreChart} from './wizscore';
import {Alert, AlertForm} from './alert';
import Link from 'next/link';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import {ConditionalWrapper, getClusterStats, Spinner} from './common'
import { StakeLabel, RenderUrl, RenderImage, RenderName } from './validator/common'
import { validatorI, ValidatorBoxPropsI, ValidatorListI, ValidatorListingI } from './validator/interfaces'
import { MultiStakeDialog } from './stake/multi-stake';
import { ValidatorContext } from './validator/validatorhook'
import ordinal from 'ordinal'
import WizEmblem from '../public/images/emblem.svg'


class ValidatorListing extends React.Component<ValidatorListingI, {}> {
    constructor(props, context ) {
      super(props);

      if(this.props.state.clusterStats==null) getClusterStats().then((stats) => {
        this.props.updateState({
            clusterStats: stats
        });
      })
      
      if(this.props.userPubkey) {
          this.getWalletValidators(this.props.userPubkey);
      }
      
    }
    componentDidUpdate() {
        const validatorsContext : any = this.context
        if(this.props.state.validators == null && (validatorsContext) && (validatorsContext.length > 0)){

            let laine = null;
            validatorsContext.map((validator) => {
                if(validator.vote_identity == config.LAINE_VOTE_IDENTITY) laine = validator;
            })

            this.props.updateState({
                validators: validatorsContext,
                filteredValidators: validatorsContext,
                hasData: true,
                laine: laine
            });
        }
    }

    getWalletValidators(pubkey) {
      axios('/api/v2/stake/by_withdraw_authority/'+pubkey)
        .then(response => {
          let json = response.data;
          
          this.props.updateState({
              walletValidators: json
          });
        })
        .catch(e => {
          console.log(e);
          setTimeout(() => { this.getWalletValidators(pubkey) }, 5000);
        })
    }
  
    doFilter(filteredValidators) {
  
      this.props.updateState({
          visibleCount: config.DEFAULT_LIST_SIZE,
          filteredValidators: filteredValidators
      });
    }
  
    bumpVisibleCount() {
        
        this.props.updateState({
          visibleCount: this.props.state.visibleCount + config.DEFAULT_LIST_SIZE
        });
    }

    updateStakeValidators(validator: validatorI) {

        if(this.props.state.stakeValidators!=null) {
            if(this.props.state.stakeValidators.includes(validator)) {
                let sv = this.props.state.stakeValidators;

                sv.splice(this.props.state.stakeValidators.indexOf(validator),1);

                this.props.updateState({
                    stakeValidators: sv
                })
            }
            else {
                let sv = this.props.state.stakeValidators;
                sv.push(validator);

                this.props.updateState({
                    stakeValidators: sv
                });
            }
        }
        else {
            this.props.updateState({
                stakeValidators: [validator]
            });
        }
    }

    clearStakeValidators() {
        this.props.updateState({
            stakeValidators: null
        })
    }
  
    updateWizModalVisibility(show:boolean,validator=null) {
      console.log(show);
  
        if(validator==null && this.props.state.wizValidator!=null) {
            validator = this.props.state.wizValidator;
        }
        this.props.updateState({
            showWizModal: show,
            wizValidator: validator
        });
    }
  
    updateAlertModalVisibility(show:boolean,validator=null) {
      if(validator==null && this.props.state.alertValidator!=null) {
          validator = this.props.state.alertValidator;
      }
      this.props.updateState({
          showAlertModal: show,
          alertValidator: validator
      });
    }

    updateMultiStakeModalVisibility(show:boolean) {
        
        this.props.updateState({
            showMultiStakeModal: show
        });
    }

    updateShowListView(show:boolean) {        
        this.props.updateState({
            showListView: show
        });
    }
  
    render() {
      if(!this.props.state.hasData || this.props.state.clusterStats == null) {
        return (
          <Spinner />
          );
      }
      else {
        return (
            [
              <SearchBar 
                  validators={this.props.state.validators}
                  setFilter={(filteredValidators:[validatorI]) => {
                      return this.doFilter(filteredValidators);
                  }}
                  walletValidators={this.props.state.walletValidators}
                  stakeValidators={this.props.state.stakeValidators}
                  showMultiStakeModal={this.props.state.showMultiStakeModal}
                  updateMultiStakeModal={(show: boolean) => this.updateMultiStakeModalVisibility(show)}
                  showListView={ this.props.state.showListView }
                  updateListView={(show: boolean) => this.updateShowListView(show)}
                  key='searchBar'
                  />,
              <ValidatorList 
                  validators={this.props.state.filteredValidators}
                  clusterStats={this.props.state.clusterStats}
                  listSize={this.props.state.visibleCount}
                  key='validatorlist'
                  showWizModal={this.props.state.showWizModal}
                  updateWizModal={(show:boolean,validator:validatorI) => this.updateWizModalVisibility(show,validator)}
                  wizValidator={this.props.state.wizValidator}
                  showAlertModal={this.props.state.showAlertModal}
                  updateAlertModal={(show:boolean,validator:validatorI) => this.updateAlertModalVisibility(show,validator)}
                  showMultiStakeModal={this.props.state.showMultiStakeModal}
                  updateMultiStakeModal={(show:boolean) => this.updateMultiStakeModalVisibility(show)}
                  alertValidator={this.props.state.alertValidator}
                  userPubkey={this.props.userPubkey}
                  solflareEnabled={this.props.state.solflareNotificationsEnabled}
                  connection={this.props.connection}
                  connected={this.props.connected}
                  updateStakeValidators={(validator: validatorI) => this.updateStakeValidators(validator)}
                  clearStakeValidators={() => this.clearStakeValidators()}
                  stakeValidators={this.props.state.stakeValidators}
                  laine={this.props.state.laine}
                  showListView={this.props.state.showListView}
                  />,
              <LoadMoreButton
                  key='loadMoreButton'
                  viewDelta={this.props.state.filteredValidators.length - this.props.state.visibleCount}
                  onClick={() => this.bumpVisibleCount()}
                  />
            ]
        );
      }
    }
}
ValidatorListing.contextType = ValidatorContext;

class ValidatorList extends React.Component<ValidatorListI, {}> {
    renderValidator(i:number) {
      return (
              <ValidatorBox key={i}
                clusterStats={this.props.clusterStats}
                validator={this.props.validators[i]} 
                showWizModal={() => this.props.updateWizModal(true,this.props.validators[i])}
                showAlertModal={() => this.props.updateAlertModal(true,this.props.validators[i])}
                connected={this.props.connected}
                index={i}
                updateStakeValidators={(validator: validatorI) => this.props.updateStakeValidators(validator)}
                isStakeValidator={this.isStakeValidator(this.props.validators[i])}
                showListView={this.props.showListView}
              />
      );
    }

    isStakeValidator(validator: validatorI) {
        if(this.props.stakeValidators!=null) {
            if(this.props.stakeValidators.includes(validator)) {
                return true
            }
            else return false
        }
        return false
    }
  
    render() {
      let list = [];

      for(let i=0; i<this.props.validators.length && i < this.props.listSize; i++) {
        list.push(this.renderValidator(i));
      }
      list.push(<div className='d-flex w-25 flex-grow-1' key='spacer-1'></div>);
      list.push(<div className='d-flex w-25 flex-grow-1' key='spacer-2'></div>);    
      const viewType = (this.props.showListView) ? ' vlist-view' : ' vcard-view';  

      return (
          [
            <div className={'d-flex justify-content-center'+viewType} key='flex-list-container'>
                <div className={'d-flex flex-wrap w-100'}>
                    {list}
                </div>
            </div>,
            <WizScore 
                key='wizScoreModal'  
                showWizModal={this.props.showWizModal}
                hideWizModal={() => this.props.updateWizModal(false)}
                validator={this.props.wizValidator}
            />,
            <Alert 
                key='alertModal'  
                showAlertModal={this.props.showAlertModal}
                hideAlertModal={() => this.props.updateAlertModal(false)}
                validator={this.props.alertValidator}
                userPubkey={this.props.userPubkey}
                solflareEnabled={this.props.solflareEnabled}
            />,
            <MultiStakeDialog
                key='multiStakeModal'
                stakeValidators={this.props.stakeValidators}
                updateStakeValidators={(validator: validatorI) => this.props.updateStakeValidators(validator)}
                clearStakeValidators={() => this.props.clearStakeValidators()}
                showStakeModal={this.props.showMultiStakeModal}
                hideStakeModal={(alert,validator) => {
                    this.props.updateMultiStakeModal(false)
                    if(alert) this.props.updateAlertModal(true, validator);
                }}
                clusterStats={this.props.clusterStats}
                allowAlertDialog={true}
                laine={this.props.laine}
            />
          ]
      );
    }
  }
  
  function LoadMoreButton(props) {
      
      if(props.viewDelta>0) {
          return (
                  <div className="container my-3 text-center">
                      <button className="px-5 btn btn-outline-light btn-lg" 
                              type="button" 
                              id="load-more-btn" 
                              onClick={() => props.onClick()}
                      >
                          Load More...
                      </button>
                  </div>
          );
      }
      else {
          return null;
      }
}

const ValidatorBox: FC<ValidatorBoxPropsI> = ({validator,clusterStats,showWizModal,showAlertModal,connected,index,updateStakeValidators,isStakeValidator, showListView}) => {

    const renderStakeBar = () => {

        let stakeText, stakeColor, stakeBg, stakeWidth;
        if(validator.stake_ratio > config.STAKE_CATEGORIES.HIGH) {
            stakeText = 'High Stake: ◎ '+new Intl.NumberFormat().format(Math.round(Number(validator.activated_stake) / 1e9));
            stakeColor = 'text-danger';
            stakeBg = 'bg-danger';
            stakeWidth = 100;
        }
        else if(validator.stake_ratio > config.STAKE_CATEGORIES.MEDIUM) {
            stakeText = 'Medium Stake: ◎ '+new Intl.NumberFormat().format(Math.round(Number(validator.activated_stake) / 1e9));
            stakeColor = 'text-warning';
            stakeBg = 'bg-warning';
            stakeWidth = validator.stake_ratio*1000;
        }
        else {
            stakeText = 'Low Stake: ◎ '+new Intl.NumberFormat().format(Math.round(Number(validator.activated_stake) / 1e9)); 
            stakeColor = 'text-success';
            stakeBg = 'bg-success';
            stakeWidth = validator.stake_ratio*1000;
        }        

        let btnColor = (isStakeValidator) ? 'btn-outline-success btn-validator-selected' : 'btn-outline-warning';

        return (
            [
                <div key={'stakebalabel-'+validator.vote_identity}>                
                    <div className={"d-flex align-items-center justify-content-center vstakelabel my-1"}>
                        {stakeText}
                        <ConditionalWrapper
                                condition={(!connected) ? true : false}
                                wrapper={children => (
                                    <OverlayTrigger
                                        placement="top"
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
                                
                                <button className={'btn ms-2 py-0 '+btnColor} onClick={() => updateStakeValidators(validator)} disabled={!connected}>
                                    {(!isStakeValidator) ? (
                                        <span>
                                            <i className='bi bi-plus pe-1 alert-btn-icon'></i>
                                            Stake
                                        </span>
                                        ) : (
                                            <span>
                                                <i className='bi bi-check pe-1 alert-btn-icon'></i>
                                                Stake
                                            </span>
                                            )
                                        }
                                </button>
                            </span>
                        </ConditionalWrapper>
                    </div>            
                </div>,
                <div key={'stakebar-'+validator.vote_identity}>                
                    <div className="col mt-1">                    
                        <div className='progress bg-wizdark' data-bs-toggle="tooltip" title="See FAQ for formula of this display." data-bs-placement="bottom" style={{height: '5px'}}>                        
                            <div className={"progress-bar bg-primary"} role="progressbar" aria-valuenow={stakeWidth} aria-valuemin={0} aria-valuemax={100} style={{width: stakeWidth+'%'}}>
                            </div>                    
                        </div>                
                    </div>            
                </div>     
            ]
        );
    }

    const borderColor = (validator.delinquent) ? 'border-danger' : 'border-secondary';
    const bgColor = (isStakeValidator) ? 'card-dark' : 'card-light';    

    return (
        <div className={'d-flex position-relative flex-grow-1 rounded border p-2 m-1 validator-flex-container '+borderColor+' '+bgColor+ ' '+ (showListView?' w-100 flex-row justify-content-between align-items-center flex-wrap':' w-25 flex-column justify-content-center')}>
            {(validator.delinquent) ? (
                <div className='badge bg-danger delinquent-badge'>
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
            ) : null}
            <div className={'validator-flex-logo align-items-start d-flex justify-content-between'+(showListView?' w-25 flex-column-reverse ps-2':'')}>
                <div className='d-flex flex-row align-items-center min-w-0 w-100'>
                    <div className={'flex-shrink-0'+(showListView?' my-2':' my-3')}>
                        <RenderImage
                            img={validator.image}
                            vote_identity={validator.vote_identity}
                            size={50}
                        />
                    </div>
                    <div className={'fs-6 ms-2 text-truncate'+(showListView?' my-2':' my-3')}>
                        <Link href={'/validator/'+validator.vote_identity} passHref legacyBehavior>
                            <span className="ms-2 vlist-name-inner pointer no-underline">
                                <RenderName
                                    validator={validator}    
                                />
                            </span>  
                        </Link>              
                    </div>
                </div>
                <div className='d-flex'>
                    {(validator.is_jito) ? (
                        <OverlayTrigger
                            placement="top"
                            overlay={
                                <Tooltip>
                                        {(validator.jito_commission_bps/100 > 10) ?
                                            "Caution: High MEV commission. This is the commission charged on MEV Tips earned through Jito, remainder goes to stakers."
                                        :
                                            "Commission charged on MEV Tips earned through Jito, remainder goes to stakers"}
                                    </Tooltip>
                            } 
                        >
                            <div className={'badge fw-normal align-self-start border '+(showListView?' ms-1 order-4':' ms-auto')+((validator.jito_commission_bps/100>10)?' border-warning':' bg- border-info')}>
                                    JITO {validator.jito_commission_bps/100+' %'}
                            </div>
                        </OverlayTrigger>
                    ) : ''}
                    <OverlayTrigger
                        placement="top"
                        overlay={
                            <Tooltip>
                                Copy identity: {validator.identity}
                            </Tooltip>
                        } 
                    >
                        <div className={'ms-1 badge bg-wizdark align-self-start pointer'+(showListView?' ms-1 order-2':'')}>
                            <span id={validator.identity} onClick={() => {navigator.clipboard.writeText(validator.identity)}}>
                                i
                            </span>
                        </div>
                    </OverlayTrigger>

                    <OverlayTrigger
                        placement="top"
                        overlay={
                            <Tooltip>
                                Copy vote account: {validator.vote_identity}
                            </Tooltip>
                        } 
                    >
                        <div className={'ms-1 badge bg-wizdark align-self-start pointer' + (showListView?' order-3':'')}>
                            <span id={validator.identity} onClick={() => {navigator.clipboard.writeText(validator.vote_identity)}}>
                                v
                            </span>
                        </div>
                    </OverlayTrigger>
                    
                    <OverlayTrigger
                            placement="top"
                            overlay={
                                <Tooltip>
                                    Ranking in these search results
                                </Tooltip>
                            } 
                        >
                        <div className={'badge bg-wizdark align-self-start'+ (showListView?' order-1 ms-auto':' ms-1')}>
                                <span>{index+1}</span>
                        </div>
                    </OverlayTrigger>
                </div>
            </div>  
            
            <div className={'d-flex my-2' + (showListView?' text-left flex-column':' text-center')}>
                <div className={'flex-grow-1'}>
                    <span className={'pointer no-underline flex-nowrap '+(showListView?'':' me-3')} onClick={() => showWizModal()}>
                            <WizEmblem fill="#fff" width="40px" height="40px" /> Score
                    </span>
                    <span className='ms-2'>{validator.wiz_score}%</span>
                </div>
                <div className='flex-grow-1'>
                    <span className={'me-3'}>
                        <WizEmblem fill="#fff" width="40px" height="40px" /> Rank
                    </span>
                    <span className='ms-2'>{ordinal(validator.rank)}</span>
                </div>
            </div>

            <div className='d-flex my-2 vlw-100'>
                <OverlayTrigger
                    placement="bottom"
                    overlay={
                        <Tooltip>
                            Skip rate (lower is better)
                        </Tooltip>
                    } 
                >
                    <div className={'bg-wizlight rounded text-center flex-grow-1 m-1'+(showListView?' w-70':'')}>
                        <div className='p-2'>
                            {validator.skip_rate.toFixed(1)}%
                        </div>
                        <div>
                            
                                <i className='bi bi-box'></i>
                            
                        </div>
                        <div className="progress bg-semidark" style={{height: '2px'}}>                        
                            <div className="progress-bar bg-warning" role="progressbar" aria-valuenow={validator.skip_rate} aria-valuemin={0} aria-valuemax={100} style={{width: validator.skip_rate+'%'}}>
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
                    <div className={'bg-wizlight rounded text-center flex-grow-1 m-1'+(showListView?' w-70':'')}>
                        <div className='p-2'>   
                            {Number(validator.credit_ratio).toFixed(1)}%
                        </div>
                        <div>
                            
                                <i className='bi bi-pencil-square'></i>
                            
                        </div>
                        <div className="progress bg-semidark" style={{height: '2px'}}>                        
                            <div className="progress-bar bg-warning" role="progressbar" aria-valuenow={validator.credit_ratio} aria-valuemin={0} aria-valuemax={100} style={{width: validator.credit_ratio+'%'}}>
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
                    <div className={'bg-wizlight rounded text-center flex-grow-1 m-1'+(showListView?' w-70':'')}>
                        <div className='p-2'>
                            {validator.commission}%
                        </div>
                        <div>
                            
                                <i className='bi bi-cash-coin'></i>
                            
                        </div>
                        <div className="progress bg-semidark" style={{height: '2px'}}>                        
                            <div className={(validator.commission<=10) ? "progress-bar bg-warning" : "progress-bar bg-danger"} role="progressbar" aria-valuenow={validator.commission} aria-valuemin={0} aria-valuemax={10} style={{width: validator.commission*10+'%'}}>
                            </div>                    
                        </div>  
                    </div>
                </OverlayTrigger>
                <OverlayTrigger
                    placement="bottom"
                    overlay={
                        <Tooltip>
                            Our TrueAPY is based on a 10-epoch median of both the true staking APY and Jito MEV APY (where applicable).<br /><br />
                            <div className='border border-light m-1 p-1 rounded'>
                                <div className='text-start my-0 text-warning d-flex'>
                                    <div className='w-75'>Staking APY:</div>
                                    <div>{validator.staking_apy} %</div>
                                </div>
                                {(validator.is_jito) ?
                                <div className='text-start my-0 text-warning d-flex'>
                                    <div className='w-75'>Jito MEV APY:</div>
                                    <div>{validator.jito_apy} %</div>
                                </div>
                                : null}
                            </div>
                        </Tooltip>
                    } 
                >
                    <div className={'bg-wizlight rounded text-center flex-grow-1 m-1'+(showListView?' w-70':'')}>
                        <div className='p-2'>
                            {validator.total_apy}%
                        </div>
                        <div>
                                <i className='bi bi-graph-up-arrow'></i>  
                        </div>
                        <div className="progress bg-semidark" style={{height: '2px'}}>                        
                            <div className="progress-bar bg-warning" role="progressbar" aria-valuenow={validator.total_apy} aria-valuemin={0} aria-valuemax={10} style={{width: validator.total_apy*10+'%'}}>
                            </div>                    
                        </div> 
                    </div>
                </OverlayTrigger>
            </div>
            <div className='d-flex flex-column my-2 vlw-100'>
                {renderStakeBar()}
            </div>
            <div className='d-flex my-2 vlw-100'>
                <div className='flex-grow-1 mx-1'>
                    <OverlayTrigger
                        placement="bottom"
                        overlay={
                            <Tooltip>
                                Scorecard
                            </Tooltip>
                        } 
                    >
                        <button className={'btn btn-outline-light btn-sm w-100'+(showListView?' p-2':'')} onClick={() => showWizModal()}>
                            <i className='bi bi-list-nested pe-1 alert-btn-icon'></i>
                        </button>
                    </OverlayTrigger>
                </div>
                <div className='flex-grow-1 mx-1'>
                    <OverlayTrigger
                        placement="bottom"
                        overlay={
                            <Tooltip>
                                Create Alert
                            </Tooltip>
                        } 
                    >
                        <button className={'btn btn-outline-light btn-sm w-100'+(showListView?' p-2':'')} onClick={() => showAlertModal()}>
                            <i className='bi bi-bell pe-1 alert-btn-icon'></i>
                        </button>
                    </OverlayTrigger>
                </div>
                <div className='flex-grow-1 mx-1'>
                    <OverlayTrigger
                        placement="bottom"
                        overlay={
                            <Tooltip>
                                More Info
                            </Tooltip>
                        } 
                    >
                        <span>
                            <Link href={'/validator/'+validator.vote_identity} passHref legacyBehavior>
                                <button className={'btn btn-outline-light btn-sm w-100'+(showListView?' p-2':'')}>
                                    <i className='bi bi-info-lg pe-1 alert-btn-icon'></i>
                                </button>
                            </Link>
                        </span>
                    </OverlayTrigger>
                    
                </div>
            </div>
        </div>
    );
}



export { ValidatorListing }