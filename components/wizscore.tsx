import React from 'react';
import config from '../config.json';
import { Modal, Button, Overlay, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Link from 'next/link';
import axios from 'axios';
import {Chart} from 'react-google-charts'
import {Spinner} from './common'
import { validatorI } from './validator/interfaces';
import * as browser from 'lib/browser';
import WizEmblem from '../public/images/emblem.svg'
import ordinal from 'ordinal';

const API_URL = process.env.API_BASE_URL;

function WizScoreRow(props) {

    const renderTooltip = () => (
        <Tooltip>
          {props.tooltip}
        </Tooltip>
      );

    let thresholdColor = 'text-white';
    if(props.color=='green') {
        thresholdColor = 'text-success';
    }
    else if(props.color=='red') {
        thresholdColor = 'text-danger';
    }
    let color = null;
    if(props.inverse) {
        color = (props.score < props.threshold) ? thresholdColor : null;
    }
    else {
        color = (props.score > props.threshold) ? thresholdColor : null;
    }
    let score = (props.addPercent) ? props.score+'%' : props.score;
    if(props.sign!=undefined) score = props.sign+score;
    return (
                <tr> 
                    <td>
                        {props.label}
                        <OverlayTrigger
                            placement='right'    
                            overlay={renderTooltip()}
                        >
                            <i className="bi bi-info ps-2"></i>
                        </OverlayTrigger>
                    </td>
                    <td>
                        {props.value}
                    </td>
                    <td>
                        {score}
                    </td>
                </tr>
    );
}

class WizScoreBody extends React.Component<{
    validator: validatorI;
},
{}> {
    
    renderInfoCount() {
        return (this.props.validator.info_score / 2)
    }

    renderWithdrawAuthorityValue() {
        if(this.props.validator.withdraw_authority_score==0) {
            return 'Differs from validator identity (good)';
        }
        else {
            return 'Set to validator identity (security risk)';
        }
    }

    renderSuperminorityValue() {
        if(this.props.validator.superminority_penalty==0) {
            return 'Below superminority	';
        }
        else {
            return 'In the superminority';
        }
    }

    renderCommissionAlert() {
        if(this.props.validator.commission>10) {
            return (
                <div className="bg-danger text-white p-2 m-2 text-center">
                    Validator&apos;s commission is above 10%. We override their score to 0%.
                </div>
            );
        }
        else return null;
    }

    renderNoVotingAlert() {
        if(this.props.validator.no_voting_override) {
            return (
                <div className="bg-danger text-white p-2 m-2 text-center">
                    Validator hasn&apos;t voted this epoch. We override their score to 0%.
                </div>
            );
        }
        else return null;
    }

    renderTPUIPAlert() {
        if(this.props.validator.tpu_ip_concentration>0) {
            return (
                <div className="bg-warning text-white p-2 m-2 text-center">
                    Validator is using a shared TPU IP or TPU relayer (e.g. Jito relayer).
                </div>
            );
        }
        else return null;
    }

    renderWizScore() {
        let color = 'text-danger';
        if(this.props.validator.rank <= config.WIZ_SCORE_RANK_GROUPS.TOP) {
            color = 'text-success';
        }
        else if(this.props.validator.rank <= config.WIZ_SCORE_RANK_GROUPS.MEDIUM) {
            color = 'text-warning';
        }
        return (
            <div className="d-flex flex-grow-1 justify-content-center text-center text-white mx-5 p-3 text-italic scorecard-wiz-score align-items-center ms-2">
                    
                        <div className={'me-2 '}><WizEmblem fill="#fff" width="40px" height="40px" /> Score</div> 
                        <div>
                            <span id="scorecard-wizscore">
                            {' '+new Intl.NumberFormat().format(Number(this.props.validator.wiz_score.toFixed(2)))+'% '}
                            </span> 
                            ( 
                                <span id="scorecard-wizrank">
                                    {ordinal(this.props.validator.rank)}
                                </span>
                                )
                        </div>
                    
                
            </div>
        );
    }

    renderBody() {
        let body =  (
            <div>
                        <p>
                            This score helps users pick good validators to stake with. 
                            It&apos;s designed to reward behaviour that benefits the network and penalize behaviour that 
                            harms the network (e.g. centralization of stake). We periodically update our weighting and 
                            metrics used, but record the version with each score. The score below is using version&nbsp;
                            <span id="scorecard-scoreversion">
                               {this.props.validator.score_version}
                            </span>. You can read the full details of the current version&apos;s weightings&nbsp; 
                            <Link href="/faq#faq-wizscore" passHref target="_new">here</Link>.
                        </p>
                        <table className={"table table-sm text-white table-dark"}> 
                            <thead>
                                <tr> 
                                    <th scope="col">
                                        Category 
                                    </th>
                                    <th scope="col">
                                        Value 
                                    </th>
                                    <th className="td-min-width" scope="col">
                                        Score
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <WizScoreRow
                                    label='Vote Success'
                                    tooltip="Ratio of credits vs slots completed this epoch."
                                    value={this.props.validator.vote_success+'%'}
                                    score={this.props.validator.vote_success_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='green'
                                    sign='+'
                                /> 
                                <WizScoreRow
                                    label='Slot Skip Rate'
                                    tooltip="Percentage of leader slots in which this validator failed to produce a block. Score is ignored for low-staked validators."
                                    value={new Intl.NumberFormat().format(Number(this.props.validator.skip_rate.toFixed(1)))+'%'}
                                    score={this.props.validator.skip_rate_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='green'
                                    sign='+'
                                /> 
                                <WizScoreRow
                                    label='Skip rate ignored'
                                    tooltip="Skip rate is ignored if validator's stake is below a threshold (see FAQ)."
                                    value={(this.props.validator.skip_rate_ignored) ? 'Yes' : 'No'}
                                    score={(this.props.validator.skip_rate_ignored) ? 'scaled up' : 'N/A'}
                                    addPercent={false}
                                    threshold='0'
                                    color='green'
                                    sign=''
                                />
                                <WizScoreRow
                                    label='Published Information'
                                    tooltip="2.5% for each of these: name, logo, description &amp; website."
                                    value={this.renderInfoCount()+' out of 5'}
                                    score={this.props.validator.info_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='green'
                                    sign='+'
                                /> 
                                <WizScoreRow
                                    label='Commission'
                                    tooltip="Up to +5% score for commission of 0%. No score for 10% commission and above."
                                    value={this.props.validator.commission+'%'}
                                    score={this.props.validator.commission_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='green'
                                    sign='+'
                                /> 
                                <WizScoreRow
                                    label='Operating History'
                                    tooltip="Up to +10% for having at least 10 epoch history (counted from first epoch with stake)."
                                    value={this.props.validator.first_epoch_distance+' epochs'}
                                    score={this.props.validator.epoch_distance_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='green'
                                    sign='+'
                                /> 
                                <WizScoreRow
                                    label='Stake Weight'
                                    tooltip="Up to +15%, 0% for any stake that is >= 10% of the largest validator's stake."
                                    value={this.props.validator.stake_weight+'%'}
                                    score={this.props.validator.stake_weight_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='green'
                                    sign='+'
                                />
                                <WizScoreRow
                                    label='Withdraw Authority'
                                    tooltip="Having the vote account withdraw authority set to the validator's identity keypair is a bad security practice and incurs a -20% penalty."
                                    value={this.renderWithdrawAuthorityValue()}
                                    score={this.props.validator.withdraw_authority_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='red'
                                    inverse={true}
                                />
                                <WizScoreRow
                                    label={`ASN Concentration (${(this.props.validator.ip_asn) ? this.props.validator.ip_asn : 'N/A'})`}
                                    tooltip="Stake concentration by ASN (ASN can comprise multiple physical locations). Penalty applied relative to the highest-staked ASN (which incurs the max penalty)."
                                    value={this.props.validator.asn_concentration+'%'}
                                    score={this.props.validator.asn_concentration_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='red'
                                    inverse={true}
                                />
                                <WizScoreRow
                                    label={`City Concentration (${(this.props.validator.ip_city) ? this.props.validator.ip_city : 'N/A'})`}
                                    tooltip="Stake concentration by City (city can comprise multiple data centres). Penalty applied relative to the highest-staked city (which incurs the max penalty)."
                                    value={this.props.validator.city_concentration+'%'}
                                    score={this.props.validator.city_concentration_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='red'
                                    inverse={true}
                                />
                                <WizScoreRow
                                    label={`ASN + City Concentration (${(this.props.validator.ip_asn) ? this.props.validator.ip_asn : 'N/A'} + ${(this.props.validator.ip_city) ? this.props.validator.ip_city : 'N/A' })`}
                                    tooltip="Stake concentration by City (city can comprise multiple data centres). Penalty applied relative to the highest-staked city (which incurs the max penalty)."
                                    value={this.props.validator.asncity_concentration+'%'}
                                    score={this.props.validator.asncity_concentration_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='red'
                                    inverse={true}
                                />
                                <WizScoreRow
                                    label={`TPU IP Concentration (${(this.props.validator.tpu_ip) ? this.props.validator.tpu_ip : 'N/A'})`}
                                    tooltip="Stake concentration by TPU IP. Penalty applied relative to the highest-staked TPU IP (which incurs the max penalty). A penalty here implies the validator may be using a shared relayer instead of running their own."
                                    value={this.props.validator.tpu_ip_concentration+'%'}
                                    score={this.props.validator.tpu_ip_concentration_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='red'
                                    inverse={true}
                                />
                                <WizScoreRow
                                    label='Uptime (30 days)'
                                    tooltip="Percentage of time a validator was not delinquent over the past 30 days (or since the validator was added to our database if less than 30 days)."
                                    value={this.props.validator.uptime+'%'}
                                    score={this.props.validator.uptime_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='green'
                                    sign='+'
                                />
                                <WizScoreRow
                                    label='Version Penalty'
                                    tooltip="A penalty is applied for running an outdated or not recommended software version."
                                    value={this.props.validator.version}
                                    score={this.props.validator.invalid_version_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='red'
                                    inverse={true}
                                />
                                <WizScoreRow
                                    label='Superminority Penalty'
                                    tooltip="A penalty is applied to validators in the superminority (highest 33.3% of stake weight)."
                                    value={this.renderSuperminorityValue()}
                                    score={this.props.validator.superminority_penalty}
                                    addPercent={true}
                                    threshold='0'
                                    color='red'
                                    inverse={true}
                                />
                            </tbody>
                        </table>
                        {this.renderCommissionAlert()}
                        {this.renderNoVotingAlert()}
                        {this.renderWizScore()}
                    </div>
        );

        return body;
    }

    render() {
        return this.renderBody();
    }
}

class WizScore extends React.Component<{
    validator: validatorI;
    showWizModal: boolean;
    hideWizModal: Function;
},
{}> {
    renderName() {
        
        if(this.props.validator!=null) {
            return this.props.validator.name;
        }
        else {
            return 'Validator Not Chosen';
        }
    }

    renderWizScoreBody() {
        if(this.props.validator!=null) {
            return <WizScoreBody validator={this.props.validator} />
        }
        else {
            return null;
        }
    }
    
    render() {
        return (
            <Modal show={this.props.showWizModal} onHide={() => this.props.hideWizModal()} dialogClassName='modal-lg scorecard-modal'>
                <Modal.Header closeButton>
                    <Modal.Title>{this.renderName()}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {this.renderWizScoreBody()}
                </Modal.Body>
            </Modal>
        );
        }
}

class WizScoreWeightings extends React.Component<{},
{
    weightings: any[any];
    hasData: boolean;
}> {
    constructor(props) {
        super(props);
        this.state = {
            weightings: undefined,
            hasData: false
        };
        if(this.state.weightings==undefined) this.getWeightings();
    }

    getWeightings() {
        axios(API_URL+config.API_ENDPOINTS.weightings, {
            headers: {'Content-Type':'application/json'}
        })
            .then(response => {
            let json = response.data;
            
            this.setState({
                weightings: json,
                hasData: true
                });
            })
            .catch(e => {
            console.log(e);
            setTimeout(() => { this.getWeightings() }, 5000);
            })
    }

    render() {
        if(this.state.hasData) {
            return (
                [
                    <p key='wiz-weighting-paragraph'>
                        The Wiz Score consists of many metrics which are given different weightings. We revise these from time to time and assign them a version number. The current score (for which the details are shown below) is version {this.state.weightings.score_version}.
                    </p>,
                    <table className="table table-sm text-white table-dark" key='wiz-weighting-table'> 
                        <thead> 
                            <tr>
                                <th scope="col">
                                    Parameter
                                </th>
                                <th scope="col">
                                    Value 
                                </th>
                                <th scope="col">
                                    Comment
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr> 
                                <td>
                                    Vote Success Weight 
                                </td>
                                <td>
                                    {this.state.weightings.vote_success_weight}
                                </td>
                                <td>
                                    The weighting given to validator&apos;s voting success.
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Skip rate weight 
                                </td>
                                <td>
                                    {this.state.weightings.skip_rate_weight}
                                </td>
                                <td>
                                    The weighting given to validator&apos;s skip rate.
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Skip rate cutoff multiplier 
                                </td>
                                <td>
                                    {this.state.weightings.skip_rate_cutoff_multiplier}
                                </td>
                                <td>
                                    Cluster average * this multiplier gives us the value which has a 0 score. If the average skip rate is 5% and the multiplier is 2, then a 10% skip rate or above will have a score of 0, and anything below 10% will have a score higher than 0.
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Skip rate min stake
                                </td>
                                <td className='text-nowrap'>
                                    ◎ {this.state.weightings.skip_rate_min_stake}
                                </td>
                                <td>
                                    For validators with less than this amount of activated stake we ignore the skip rate. The remaining score is scaled up by the skip rate weight to achieve a score out of 100%. This is because skip rate is highly variable and for validators with low stake and few leader slots it can lead to extremely high variance that it not necessarily reflective of the quality of the node&apos;s operation.
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Min valid version 
                                </td>
                                <td>
                                    {this.state.weightings.min_versions.map((v, i, arr) => {
                                        if(arr.length-1===i) {
                                            return v;
                                        }
                                        else {
                                            return v+', ';
                                        }
                                    })}
                                </td>
                                <td>
                                    The minimum version within each minor release branch a validator should be using, e.g. if the value here is 1.9.20 the validator can use 1.9.20, 1.9.21, 1.9.22, etc., but not 1.9.19 or 1.8.30. Multiple minor branches can be valid at the same time.
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Invalid version penalty
                                </td>
                                <td>
                                   {this.state.weightings.invalid_version_penalty}
                                </td>
                                <td>
                                    Penalty for invalid version 
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Info weight
                                </td>
                                <td>
                                    {this.state.weightings.info_weight}
                                </td>
                                <td>
                                    The total weight of validator info (broken up into 4 equally weighted components for name, logo, website and description).
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Maximum commission
                                </td>
                                <td>
                                    {this.state.weightings.max_commission}
                                </td>
                                <td>
                                    The commission that gets a 0 score, anything below this value has a score &gt; 0 up to the max commission weight (i.e. 0% commission gets 100% which earns the full commission weight)
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Commission weight
                                </td>
                                <td>
                                    {this.state.weightings.commission_weight}
                                </td>
                                <td>
                                    The weight of the commission score.
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Epoch max distance 
                                </td>
                                <td>
                                    {this.state.weightings.epoch_distance_max}
                                </td>
                                <td>
                                    The number of epochs with stake a validator should have to get the highest operational history score.
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Epoch distance weight 
                                </td>
                                <td>
                                    {this.state.weightings.epoch_distance_weight}
                                </td>
                                <td>
                                    The weighting given to validator&apos;s operational history.
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Stake weight threshold 
                                </td>
                                <td>
                                    {this.state.weightings.stake_weight_threshold}
                                </td>
                                <td>
                                    Percentage of the largest validator&apos;s stake that is the cut off where we assign 0% score for stake weight. E.g. if largest validator has 15m SOL staked and the threshold is 0.1 all validators &gt;=1.5m stake will get a 0 score.
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Stake weight weight 
                                </td>
                                <td>
                                    {this.state.weightings.stake_weight_weight}
                                </td>
                                <td>
                                    The weighting given to validator&apos;s stake. We give the highest score to the median stake weight (as of score version 67, prior to that we used the average), with a linear drop off below to 0 and above to the threshold value.
                                    <br /><br />If the median stake is 200,000 SOL a validator with 100,000 stake will earn 50% of the stake weight weight. A validator with 500,000 SOL stake will earn (500,000 - 200,000) / (1,500,000 - 200,000) * stake weight weight.
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Withdraw authority penalty 
                                </td>
                                <td>
                                    {this.state.weightings.withdraw_authority_penalty}
                                </td>
                                <td>
                                    The penalty for validators with an unsafe withdraw authority (i.e. set to their validator identity).
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    ASN Concentration Weight 
                                </td>
                                <td>
                                    {this.state.weightings.asn_concentration_weight}
                                </td>
                                <td>
                                    The weighting given to validator&apos;s ASN stake concentration.
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    City Concentration Weight 
                                </td>
                                <td>
                                    {this.state.weightings.city_concentration_weight}
                                </td>
                                <td>
                                    The weighting given to validator&apos;s city stake concentration.
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    ASN+City Concentration Weight 
                                </td>
                                <td>
                                    {this.state.weightings.asn_city_concentration_weight}
                                </td>
                                <td>
                                    The weighting given to validator&apos;s ASN + city combined stake concentration.
                                </td>
                            </tr>
                            
                            <tr> 
                                <td>
                                    TPU IP Concentration Weight
                                </td>
                                <td>
                                    {this.state.weightings.tpu_ip_concentration_weight}
                                </td>
                                <td>
                                    The weighting given to validator&apos;s TPU IP stake concentration. This penalizes validators who use shared relayers.
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Uptime Weight 
                                </td>
                                <td>
                                    {this.state.weightings.uptime_weight}
                                </td>
                                <td>
                                    The weighting given to validator&apos;s uptime over the past 30 days (or max period available if less than 30 days).
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Uptime cutoff 
                                </td>
                                <td>
                                    {this.state.weightings.uptime_cutoff}
                                </td>
                                <td>
                                    Threshold below which uptime has a score of 0, the uptime score is scaled linearly between this value and 100%.
                                </td>
                            </tr>
                            <tr> 
                                <td>
                                    Superminority Penalty 
                                </td>
                                <td>
                                    {this.state.weightings.superminority_penalty}
                                </td>
                                <td>
                                    The penalty given to validators in the superminority (top 33.3% of stake weight).
                                </td>
                            </tr>
                        </tbody>
                    </table>
                ]
            )
        }
        else {
            return (
                <p>Loading...</p>
            )
        }
    }
}

class WizScoreChart extends React.Component<{
    vote_identity: string;
},{
    wiz_scores: any[]
}> {
    constructor(props) {
        super(props);
        this.state = {
            wiz_scores: null
        };
        if(this.state.wiz_scores==null) this.getWizScores(this.props.vote_identity);
    }    

    getWizScores(vote_identity) {
        axios(API_URL+config.API_ENDPOINTS.validator_wiz_scores+"/"+vote_identity, {
          headers: {'Content-Type':'application/json'}
        })
          .then(response => {
            let json = response.data;
            
            let wiz_scores = [];
            wiz_scores.push(['Time', 'Wiz Score']);

            let isSafari:boolean = browser.check('Safari');

            for(var i in json) {
                if(isSafari){
                    let timeZone = json[i].created_at.slice(-3)+':00';
                    wiz_scores.push([new Date(json[i].created_at.substring(0, 19).replace(/-/g, "/")+timeZone), parseFloat(json[i].avg_wiz_score)]);
                }else{                
                    wiz_scores.push([new Date(json[i].created_at), parseFloat(json[i].avg_wiz_score)]);
                }
            }

            this.setState({
                wiz_scores: wiz_scores
            });
          })
          .catch(e => {
            console.log(e);
            setTimeout(() => { this.getWizScores(vote_identity) }, 5000);
          })
      }

    render() {
        if(this.state.wiz_scores==null) {
            return (
                <Spinner />
            )
        }
        else {
            return (
                <Chart 
                    chartType='LineChart'
                    width="100%"
                    height="20rem"
                    data={this.state.wiz_scores}
                    options={{
                        backgroundColor: 'none',
                        curveType: "function",
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
                        trendlines: {
                            0: {
                                color:'#ffc107',
                                type: 'exponential'
                            }
                        },
                        chartArea: {
                            top: 20,
                            left: 30,
                            width:'100%',
                            height:'80%'
                        }
                    }}
                />
            )
        }
    };
}

export {WizScore, WizScoreBody, WizScoreWeightings, WizScoreChart}