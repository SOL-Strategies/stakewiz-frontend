import React from 'react';
import config from '../config.json';
import { Modal, Button, Overlay, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Link from 'next/link';
import axios from 'axios';
import {Chart} from 'react-google-charts'
import {Spinner} from './common'
import { validatorI, WizWeightingsI } from './validator/interfaces';
import * as browser from 'lib/browser';
import WizEmblem from '../public/images/emblem.svg'
import ordinal from 'ordinal';

const API_URL = process.env.API_BASE_URL;

// Published info items scored: name, logo, description and website
const INFO_ITEMS = 4;

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
{
    weightings: WizWeightingsI;
}> {
    constructor(props) {
        super(props);
        this.state = {
            weightings: undefined
        };
    }

    componentDidMount() {
        this.getWeightings();
    }

    // Weightings for the active score version; they switch at the same moment as the scores
    getWeightings() {
        axios(API_URL+config.API_ENDPOINTS.weightings, {
            headers: {'Content-Type':'application/json'}
        })
            .then(response => {
            this.setState({
                weightings: response.data
                });
            })
            .catch(e => {
            console.log(e);
            })
    }

    // The weightings only describe this validator's score when the versions match; while the backend
    // switches versions /wiz_score can be ahead of the scores, so fall back to the previous layout
    weightings() {
        const w = this.state.weightings;
        return (w && w.score_version === this.props.validator.score_version) ? w : undefined;
    }

    // Weight as Wiz points in percent, e.g. 0.2 -> 20
    points(weight: number) {
        return parseFloat((weight*100).toFixed(2));
    }

    // Score version 84 rows, detected from the weightings (absent keys mean v83 rendering)
    hasVoteSuccessScore() {
        return this.weightings()?.vote_success_weight > 0;
    }

    hasBlockProductionScore() {
        return this.weightings()?.skip_rate_source === 'block_production';
    }

    hasMevScore() {
        return this.weightings()?.mev_weight > 0;
    }

    renderInfoCount() {
        // info_score is Wiz points; each item is worth an equal share of info_weight
        const w = this.weightings();
        if(w?.info_weight) return Math.round(this.props.validator.info_score / (w.info_weight*100/INFO_ITEMS));
        // Without matching weightings, count the published fields instead
        const v = this.props.validator;
        return [v.name, v.image, v.description, v.website].filter((f) => f).length;
    }

    infoTooltip() {
        const w = this.weightings();
        if(!w) return 'Score for each published validator info item: name, logo, description and website.';
        return this.points(w.info_weight/INFO_ITEMS)+'% for each published validator info item: name, logo, description and website.';
    }

    commissionTooltip() {
        const w = this.weightings();
        if(!w) return 'Higher score for lower commission, up to the full commission weight at 0%.';
        return 'Up to +'+this.points(w.commission_weight)+'% score for commission of 0%. No score for '+(w.max_commission/100)+'% commission and above.';
    }

    operatingHistoryTooltip() {
        const w = this.weightings();
        if(!w) return 'Score for operating history (counted from first epoch with stake).';
        return 'Up to +'+this.points(w.epoch_distance_weight)+'% for having at least '+w.epoch_distance_max+' epochs of history (counted from first epoch with stake).';
    }

    stakeWeightTooltip() {
        const w = this.weightings();
        if(!w) return "Highest score at the median stake, 0% for any stake that is >= the threshold share of the largest validator's stake.";
        return 'Up to +'+this.points(w.stake_weight_weight)+"%, 0% for any stake that is >= "+this.points(w.stake_weight_threshold)+"% of the largest validator's stake.";
    }

    uptimeTooltip() {
        const w = this.weightings();
        const base = 'Percentage of time a validator was not delinquent over the past 30 days (or since the validator was added to our database if less than 30 days).';
        if(!w) return base;
        return base+' Full +'+this.points(w.uptime_weight)+'% at 100%, falling linearly to 0 at '+this.points(w.uptime_cutoff)+'%.';
    }

    renderBlockProductionValue() {
        const v = this.props.validator;
        if(v.block_production==null) return '—';
        return (
            <>
                {parseFloat(v.block_production.toFixed(2))+'%'}
                {(v.wiz_skip_rate!=null && v.wiz_fee_capture_index!=null) ? (
                    <div className='small text-secondary'>
                        skip {v.wiz_skip_rate.toFixed(1)}% · fee capture {v.wiz_fee_capture_index.toFixed(2)}
                    </div>
                ) : null}
            </>
        );
    }

    blockProductionTooltip() {
        const w = this.weightings();
        const benchmark = (this.props.validator.fee_capture_benchmark!=null) ? ' ('+this.props.validator.fee_capture_benchmark.toFixed(2)+')' : '';
        const cutoff = (w.skip_rate_cutoff_floor) ? w.skip_rate_cutoff_floor+"% or "+w.skip_rate_cutoff_multiplier+"× the network skip rate this epoch, whichever is higher" : w.skip_rate_cutoff_multiplier+"× the network skip rate this epoch";
        return "Producing blocks and packing them well. Score = skip score × fee capture score. Skip score falls linearly from full at 0% skipped to 0 at "+cutoff+". Fee capture score = this validator's fee capture index ÷ the network p90"+benchmark+", capped at 1. A validator that skips all its leader slots scores 0. Until the validator has had 12 leader slots this epoch, its previous epoch's figures are used. Skips are penalised more heavily in the Wiz Score than in the block packing gauge.";
    }

    renderMevValue() {
        const v = this.props.validator;
        if(v.mev_ignored) return (v.is_jito) ? 'Not enough blocks' : 'Not eligible';
        if(v.mev_tips_per_block==null) return '—';
        return (
            <>
                {'◎ '+v.mev_tips_per_block.toFixed(4)+' per block'}
                {(v.mev_benchmark!=null) ? (
                    <div className='small text-secondary'>
                        network p90 ◎ {v.mev_benchmark.toFixed(4)}
                    </div>
                ) : null}
            </>
        );
    }

    renderVersion84Rows() {
        const v = this.props.validator;
        const w = this.weightings();
        let rows = [];
        if(this.hasVoteSuccessScore()) {
            rows.push(
                <WizScoreRow
                    key='vote-success'
                    label='Vote success'
                    tooltip={"Share of the optimal vote rewards the validator earned this epoch: its own votes landing (voting) plus, as leader, including other validators' votes in its blocks (inclusion). Skipped leader slots earn no inclusion rewards and count against it. Scored linearly from 0 at "+this.points(w.vote_success_cutoff ?? 0)+"% to the full "+this.points(w.vote_success_weight)+"% at 100%."}
                    value={v.vote_success.toFixed(2)+'%'}
                    score={v.vote_success_score}
                    addPercent={true}
                    threshold='0'
                    color='green'
                    sign='+'
                />
            );
        }
        if(this.hasBlockProductionScore()) {
            rows.push(
                <WizScoreRow
                    key='block-production'
                    label='Block production'
                    tooltip={this.blockProductionTooltip()}
                    value={this.renderBlockProductionValue()}
                    score={v.skip_rate_score}
                    addPercent={true}
                    threshold='0'
                    color='green'
                    sign='+'
                />,
                <WizScoreRow
                    key='block-production-ignored'
                    label='Block production ignored'
                    tooltip='Ignored only when the validator has had fewer than 12 leader slots both this epoch and last epoch. Its weight is then removed and the rest of the score scaled up to compensate.'
                    value={(v.skip_rate_ignored) ? 'Yes' : 'No'}
                    score={(v.skip_rate_ignored) ? 'scaled up' : 'N/A'}
                    addPercent={false}
                    threshold='0'
                    color='green'
                    sign=''
                />
            );
        }
        if(this.hasMevScore()) {
            rows.push(
                <WizScoreRow
                    key='mev'
                    label='MEV'
                    tooltip="Jito tips per produced block this epoch, net of the validator's MEV commission, scored against the network p90 (the 90th percentile of Jito validators) and capped at 100%. Only for validators running Jito with a MEV commission set and at least 12 blocks with tips this epoch (or last epoch, whose figures are then used); for everyone else the weight is removed and the score scaled up."
                    value={this.renderMevValue()}
                    score={(v.mev_ignored) ? 'scaled up' : v.mev_score}
                    addPercent={!v.mev_ignored}
                    threshold='0'
                    color='green'
                    sign={(v.mev_ignored) ? '' : '+'}
                />
            );
        }
        return rows;
    }

    renderWithdrawAuthorityValue() {
        if(this.props.validator.withdraw_authority_score==0) {
            return 'Differs from validator identity (good)';
        }
        else {
            return 'Set to validator identity (security risk)';
        }
    }

    renderSuccessValue(value: number | null) {
        return (value==null) ? 'N/A' : Number(value).toFixed(2)+'%';
    }

    renderSuccessScore(score: number | null) {
        return (score==null) ? 'N/A' : score;
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
        if(this.props.validator.commission>1000) {
            return (
                <div className="bg-danger text-white p-2 m-2 text-center">
                    Validator&apos;s commission is above 7%. We override their score to 0%.
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
                                {(this.hasVoteSuccessScore()) ? null : <>
                                <WizScoreRow
                                    key='voting-success'
                                    label='Voting success'
                                    tooltip="Share of the optimal voting rewards the validator earned this epoch: how reliably its votes landed in the vote aggregates. Capped at 100%."
                                    value={this.renderSuccessValue(this.props.validator.voting_success)}
                                    score={this.renderSuccessScore(this.props.validator.voting_success_score)}
                                    addPercent={this.props.validator.voting_success_score!=null}
                                    threshold='0'
                                    color='green'
                                    sign={(this.props.validator.voting_success_score!=null) ? '+' : undefined}
                                /> 
                                <WizScoreRow
                                    key='inclusion-success'
                                    label='Inclusion success'
                                    tooltip="Share of the optimal leader vote rewards the validator earned this epoch by including other validators' votes in its blocks. Skipped leader slots count against it. Shown once the validator has had 12 leader slots this epoch; until then its score uses voting success."
                                    value={this.renderSuccessValue(this.props.validator.inclusion_success)}
                                    score={this.renderSuccessScore(this.props.validator.inclusion_success_score)}
                                    addPercent={this.props.validator.inclusion_success_score!=null}
                                    threshold='0'
                                    color='green'
                                    sign={(this.props.validator.inclusion_success_score!=null) ? '+' : undefined}
                                />
                                </>}
                                {this.renderVersion84Rows()}
                                {(this.hasBlockProductionScore()) ? null : <>
                                <WizScoreRow
                                    key='skip-rate'
                                    label='Slot skip rate'
                                    tooltip="Percentage of leader slots in which this validator failed to produce a block. Score is ignored for low-staked validators."
                                    value={new Intl.NumberFormat().format(Number(this.props.validator.skip_rate.toFixed(1)))+'%'}
                                    score={this.props.validator.skip_rate_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='green'
                                    sign='+'
                                /> 
                                <WizScoreRow
                                    key='skip-rate-ignored'
                                    label='Skip rate ignored'
                                    tooltip="Skip rate is ignored if validator's stake is below a threshold (see FAQ)."
                                    value={(this.props.validator.skip_rate_ignored) ? 'Yes' : 'No'}
                                    score={(this.props.validator.skip_rate_ignored) ? 'scaled up' : 'N/A'}
                                    addPercent={false}
                                    threshold='0'
                                    color='green'
                                    sign=''
                                />
                                </>}
                                <WizScoreRow
                                    label='Published information'
                                    tooltip={this.infoTooltip()}
                                    value={this.renderInfoCount()+' out of '+INFO_ITEMS}
                                    score={this.props.validator.info_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='green'
                                    sign='+'
                                /> 
                                <WizScoreRow
                                    label='Commission'
                                    tooltip={this.commissionTooltip()}
                                    value={this.props.validator.commission/100+'%'}
                                    score={this.props.validator.commission_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='green'
                                    sign='+'
                                /> 
                                <WizScoreRow
                                    label='Operating history'
                                    tooltip={this.operatingHistoryTooltip()}
                                    value={this.props.validator.first_epoch_distance+' epochs'}
                                    score={this.props.validator.epoch_distance_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='green'
                                    sign='+'
                                /> 
                                <WizScoreRow
                                    label='Stake weight'
                                    tooltip={this.stakeWeightTooltip()}
                                    value={this.props.validator.stake_weight+'%'}
                                    score={this.props.validator.stake_weight_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='green'
                                    sign='+'
                                />
                                <WizScoreRow
                                    label='Withdraw authority'
                                    tooltip="Having the vote account withdraw authority set to the validator's identity keypair is a bad security practice and incurs a -20% penalty."
                                    value={this.renderWithdrawAuthorityValue()}
                                    score={this.props.validator.withdraw_authority_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='red'
                                    inverse={true}
                                />
                                <WizScoreRow
                                    label={`ASN concentration (${(this.props.validator.ip_asn) ? this.props.validator.ip_asn : 'N/A'})`}
                                    tooltip="Stake concentration by ASN (ASN can comprise multiple physical locations). Penalty applied relative to the highest-staked ASN (which incurs the max penalty)."
                                    value={this.props.validator.asn_concentration+'%'}
                                    score={this.props.validator.asn_concentration_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='red'
                                    inverse={true}
                                />
                                <WizScoreRow
                                    label={`City concentration (${(this.props.validator.ip_city) ? this.props.validator.ip_city : 'N/A'})`}
                                    tooltip="Stake concentration by City (city can comprise multiple data centres). Penalty applied relative to the highest-staked city (which incurs the max penalty)."
                                    value={this.props.validator.city_concentration+'%'}
                                    score={this.props.validator.city_concentration_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='red'
                                    inverse={true}
                                />
                                <WizScoreRow
                                    label={`ASN + city concentration (${(this.props.validator.ip_asn) ? this.props.validator.ip_asn : 'N/A'} + ${(this.props.validator.ip_city) ? this.props.validator.ip_city : 'N/A' })`}
                                    tooltip="Stake concentration by City (city can comprise multiple data centres). Penalty applied relative to the highest-staked city (which incurs the max penalty)."
                                    value={this.props.validator.asncity_concentration+'%'}
                                    score={this.props.validator.asncity_concentration_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='red'
                                    inverse={true}
                                />
                                <WizScoreRow
                                    label={`TPU IP concentration (${(this.props.validator.tpu_ip) ? this.props.validator.tpu_ip : 'N/A'})`}
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
                                    tooltip={this.uptimeTooltip()}
                                    value={this.props.validator.uptime+'%'}
                                    score={this.props.validator.uptime_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='green'
                                    sign='+'
                                />
                                <WizScoreRow
                                    label='Version penalty'
                                    tooltip="A penalty is applied for running an outdated or not recommended software version."
                                    value={this.props.validator.version}
                                    score={this.props.validator.invalid_version_score}
                                    addPercent={true}
                                    threshold='0'
                                    color='red'
                                    inverse={true}
                                />
                                <WizScoreRow
                                    label='Superminority penalty'
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

    // Rows for weightings keys that only exist in newer score versions; absent means 0 or the default
    renderOptionalRow(key: string, label: string, comment: string) {
        if(this.state.weightings[key]===undefined) return null;
        return (
            <tr key={key}>
                <td>
                    {label}
                </td>
                <td>
                    {this.state.weightings[key]}
                </td>
                <td>
                    {comment}
                </td>
            </tr>
        );
    }

    render() {
        if(this.state.hasData) {
            const skipRateSource = this.state.weightings.skip_rate_source;
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
                            {this.renderOptionalRow('vote_success_weight', 'Vote success weight', 'Weight of the combined vote success score.')}
                            {this.renderOptionalRow('vote_success_cutoff', 'Vote success cutoff', 'Vote success at or below this scores 0; full score at 100%.')}
                            <tr>
                                <td>
                                    {(skipRateSource==='block_production') ? 'Block production weight' : 'Skip rate weight'}
                                </td>
                                <td>
                                    {this.state.weightings.skip_rate_weight}
                                </td>
                                <td>
                                    {(skipRateSource==='block_production') ? 'The weighting given to block production (skip score × fee capture score).' : <>The weighting given to validator&apos;s skip rate.</>}
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
                                    {(skipRateSource && skipRateSource!=='rpc') ? (
                                        <>The network skip rate this epoch (total skipped ÷ total leader slots) × this multiplier is the skip rate that scores 0{(this.state.weightings.skip_rate_cutoff_floor) ? <>, or the cutoff floor if that is higher</> : null}.</>
                                    ) : (
                                        <>Cluster average * this multiplier gives us the value which has a 0 score. If the average skip rate is 5% and the multiplier is 2, then a 10% skip rate or above will have a score of 0, and anything below 10% will have a score higher than 0.</>
                                    )}
                                </td>
                            </tr>
                            {this.renderOptionalRow('skip_rate_cutoff_floor', 'Skip rate cutoff floor', 'The skip rate (%) that scores 0 is never lower than this.')}
                            {this.renderOptionalRow('skip_rate_source', 'Skip rate source', 'rpc (default): RPC skip rate vs the mean. blocks: block-index skip rate vs the network rate. block_production: block skip score × fee capture score.')}
                            {this.renderOptionalRow('skip_rate_min_slots', 'Skip rate min slots', 'Leader slots needed this epoch before the skip rate is scored.')}
                            {this.renderOptionalRow('mev_weight', 'MEV weight', 'Net Jito tips per block vs the p90 of Jito validators. Non-Jito validators are excluded and their score rescaled.')}
                            {this.renderOptionalRow('mev_min_blocks', 'MEV min blocks', 'Blocks with tips needed this epoch before MEV is scored.')}
                            {this.renderOptionalRow('mev_min_validators', 'MEV min validators', 'Eligible Jito validators needed to set the MEV benchmark.')}
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
                                    The total weight of validator info (broken up into 4 equally weighted items: name, logo, website and description).
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
                                    ASN concentration weight
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
                                    City concentration weight
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
                                    ASN + city concentration weight
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
                                    TPU IP concentration weight
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
                                    Uptime weight
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
                                    Superminority penalty
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