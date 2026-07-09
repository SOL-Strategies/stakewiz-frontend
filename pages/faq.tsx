import React from 'react';
import Link from 'next/link'
import 'bootstrap-icons/font/bootstrap-icons.css'
import {Header, TopBar, Footer} from '../components/common'
import { WizScoreWeightings } from '../components/wizscore';

export default function Home() {
    return (
        <div>
            <Header
                title="FAQ - Stakewiz"
            />

            <main>
                <TopBar />

                <div className="container text-white" id="vlist">
                    <div className="row my-5 mobile-faq-container">
                        <div className="col">
                        </div>
                        <div className="col-md-8 p-5 vbox">
                            <h2 className="mb-5">
                                Frequently Asked Questions
                            </h2>
                            <ol className="mb-5">
                                <li>
                                    <Link href="#faq-1">How are validators ranked?</Link>
                                </li>
                                <li>
                                    <Link href="#faq-2">How is the stake concentration score calculated?</Link>
                                </li>
                                <li>
                                    <Link href="#faq-apy">How is the APY estimated?</Link>
                                </li>
                                <li>
                                    <Link href="#faq-3">What does the red border and delinquency flag mean?</Link>
                                </li>
                                <li>
                                    <Link href="#faq-4">What is delinquency?</Link>
                                </li>
                                <li>
                                    <Link href="#faq-5">Why should I care about delinquency and commission changes?</Link>
                                </li>
                                <li>
                                    <Link href="#faq-6">Are there other ways to receive alerts?</Link>
                                </li>
                                <li>
                                    <Link href="#faq-7">How often do I get an alert when a validator is delinquent?</Link>
                                </li>
                                <li>
                                    <Link href="#faq-8">How can I submit feedback or get in touch?</Link>
                                </li>
                                <li>
                                    <Link href="#faq-wizscore">How is the Wiz Score calculated?</Link>
                                </li>
                            </ol>
                            <h3 className="mb-4" id="faq-1">
                                How are validators ranked?
                            </h3>
                            <p>
                                Validators are ranked according to their Wiz Score, which is our internal ranking system where we factor in over a dozen metrics to compute a score that aims to reward good behaviour and decentralisation.
                            </p>
                            <hr className="m-3 my-5" />
                            <h3 className="mb-4" id="faq-2">
                                How is the stake concentration score calculated?
                            </h3>
                            <p>
                                We wanted to develop a way to visually represent stake in a helpful manner. We thought a good way to do this would be by measuring every validator&apos;s stake as a percentage of the largest validator.
                            </p>
                            <p>
                                The issue with this is that the vast majority of validators have such a small percentage of stake that the &quot;loading bar&quot; appears basically empty. At the same time it doesn&apos;t provide a helpful way to discern what levels are &quot;good&quot;. The thinking being that about halfway full should be &quot;medium&quot; etc.
                            </p>
                            <p>
                                The best outcome for the network is an increase in Nakamoto Coefficient (min number of nodes that can halt the network), which requires spreading stake to smaller staked validators. This is what we aim to encourage as well.
                            </p>
                            <p>
                                To calculate the &quot;loading bar&quot; graphic thus we took the percentage of stake relative to the largest validator multiplied by 10. Anything over 100 is classified as &quot;high stake&quot;, empirically this is about ◎ 1,000,000. Any validator with this much or more stake is considered &quot;high stake&quot; 
                            </p>
                            <p>
                                Medium stake is classified as a score above 25, which works out to about ◎ 250,000. Validators in this category have a medium amount of stake. Staking with them still aids decentralisation, but they&apos;re already in a category above the &quot;low stake&quot; validators.
                            </p>
                            <p>
                                Low stake is every other validators, which still includes validators that are &quot;above-average&quot;, since the average stake on Solana is approximately ◎ 200,000.
                            </p>
                            <p>
                                Over time we might adjust this display algorithm (and that&apos;s all it is, a way to try and visualise stake weight), in which case we&apos;ll update this FAQ entry.
                            </p>
                            <hr className="m-3 my-5" />
                            <h3 className="mb-4" id="faq-apy">
                                How is the APY estimated?
                            </h3>
                            <p>
                                Estimating APY can be difficult. APY is the compounded annual yield you can expect on your stake. This means we need to factor in the validator&apos;s performance, the network&apos;s average performance, the total inflation and the total active stake, as well as the how many epochs there are in a calendar year.
                            </p>
                            <p>
                                We used to compute a real-time estimation based on the  performance in the current epoch, however this is highly volatile and unlikely to be accurate over a longer time period.
                            </p>
                            <p>At the end of April 2024 our TrueAPY method was updated to take the median of the last 10 epochs of real achieved APY. This eliminates short-term outlying performance and provides a smoothed and realistic long-term yield estimate.</p>
                            <p>
                                Ultimately this is still an estimate and a projection and APY is never guaranteed. Use Stakewiz alerts to monitor your validators for extended delinquencies and commission changes to protect your stake.
                            </p>
                            <p>
                                For validators with less than 10 epochs of data the median of the available epochs is used. This requires at least one completed epoch + a few hours for our data collection to run.
                            </p>
                            <hr className="m-3 my-5" />
                            <h3 className="mb-4" id="faq-3">
                                What does the red border and delinquency flag mean?
                            </h3>
                            <p>
                                We display a red warning next to the validator name (or where the name would be if they don&apos;t have one) and a red border when they are currently delinquent. This means right now as of our systems&apos; last observation they are delinquent as reported by the RPC Node our systems queried.
                            </p>
                            <hr className="m-3 my-5" />
                            <h3 className="mb-4" id="faq-4">
                                What is delinquency?
                            </h3>
                            <p>
                                Delinquency essentially means the validator isn&apos;t contributing to consensus, isn&apos;t voting or is offline. Generally this happens because a validator has crashed, is offline for maintenance/upgrades or their hardware or network are too slow to keep up with the speed at which Solana&apos;s blockchain progresses.
                            </p>
                            <p>
                                On a more technical level delinquency is defined as being 128 or more slots behind the tip of the blockchain.
                            </p>
                            <hr className="m-3 my-5" />
                            <h3 className="mb-4" id="faq-5">
                                Why should I care about delinquency and commission changes?
                            </h3>
                            <p>
                                If you&apos;re staking with a validator and they become delinquenty this means they are no longer voting and participating in the chain&apos;s consensus. Your staking rewards are a direct result of the validator&apos;s voting record, since every vote earns them &quot;credits&quot;. At the end of the epoch the blockchain awards staking rewards to stake accounts based on their validator&apos;s total credits.
                            </p>
                            <p>
                                With regards to commission, this of course means a change to how much you&apos;re receiving and how much the validator is charging you. It&apos;s as if Netflix started charging your credit card a different amount this month. Validators should (and many do) communicate changes in commission ahead of time. And of course a change can be down, not just up. However in case a validator doesn&apos;t announce this change, or tries to boundary-skim, you should know about this.
                            </p>
                            <p>
                                What is boundary-skimming? This is when a validator changes their commission right before the epoch ends (at the epoch boundary). When the epoch ends the commission at that point is applied to the entire epoch&apos;s rewards, so they&apos;ll earn commission for the entire epoch on the rate they just set. Then right after the boundary they could revert the commission and if you were to look at their details on an explorer you&apos;d have no idea what just happened. This is a very deceptive tactic that unfortunately has been observed on occasion.
                            </p>
                            <p>
                                With our alerts you&apos;ll get a single email per alertable event (delinquency or commission) to let you know about it, then you have the power to decide what you&apos;d like to do.
                            </p>
                            <p>
                                (We&apos;re considering adding a second email for delinquencies, letting you know once the delinquency is resolved).
                            </p>
                            <hr className="m-3 my-5" />
                            <h3 className="mb-4" id="faq-6">
                                Are there other ways to receive alerts?
                            </h3>
                                <p>
                                    We currently offer three alerting channels: email, Telegram and Solflare notifications. We&apos;re planning on adding webhooks and possibly Discord and Slack alerts in the future.
                                </p>
                                <hr className="m-3 my-5" />
                                <h3 className="mb-4" id="faq-7">
                                    How often do I get an alert when a validator is delinquent?
                                </h3>
                                <p>
                                    Just once per delinquency period, when the delinquency first exceeds your chosen threshold. We might add a second email to let you know when they&apos;re no longer delinquenty, but we haven&apos;t implemented this yet.
                                </p>
                                <hr className="m-3 my-5" />
                                <h3 className="mb-4" id="faq-8">
                                    How can I submit feedback or get in touch?
                                </h3>
                                <p>
                                    You can find us on Twitter at <a href="https://twitter.com/laine_sa_" target="_new">@laine_sa_</a> or <a href="https://discord.gg/4qUCTsX9QV" target="_new">join our Discord</a>. 
                                </p>
                                <hr className="m-3 my-5" />
                                <h3 className="mb-4" id="faq-wizscore">
                                    How is the Wiz Score calculated?
                                </h3>
                                <WizScoreWeightings />
                                </div>
                            <div className="col">
                        </div>
                    </div>
                </div>
                
            </main>

            <Footer />
        </div>
    )
}