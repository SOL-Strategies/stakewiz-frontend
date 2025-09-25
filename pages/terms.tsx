import React from 'react';
import 'bootstrap-icons/font/bootstrap-icons.css'
import {Header, TopBar, Footer} from 'components/common'

const API_URL = process.env.API_BASE_URL;

export default function Home() {
    return (
        <div>
            <Header
                title="Privacy Policy &amp; Terms of Use - Stakewiz"
            />

            <main>
                <TopBar />

                <div className="container text-white" id="vlist">
                    <div className="row my-5 mobile-faq-container">
                        <div className="col">
                        </div>
                        <div className="col-md-8 p-5 vbox">
                            <h2 className="mb-5">
                                Privacy Policy &amp; Terms of Use 
                            </h2>
                            <h3>
                                Privacy Policy
                            </h3>
                                <p>
                                    By using this website and creating alerts you agree to this privacy policy.
                                </p>
                                <p>
                                    We only collect the minimum amount of data required to process your request and will never sell your data. We commit to keeping the data secure and maintaining our systems and databases in a way that they are safe from unauthorized access. The only sensitive data we may store in connection with your use of this website, and depending on how you use our website, is your email address, IP address, Telegram account details (including those provided to us by Telegram) and your cryptocurrency wallet address. These are stored only to provide the functionality you request from us.
                                </p>
                                <p>
                                    We will never permit third parties to access your data or send unsolicited emails or messages to you other than disclosures to law enforcement authorities pursuant to a legally valid request.
                                </p>
                                <p>
                                    We will only send you emails about our operations, products or promotions where you have opted in to receive such emails, and you may opt out at any time.
                                </p>
                                <p>
                                    You can cancel your alerts at any time and once cancelled we will not send you any further emails relating to them. Cancelling your alerts also cancels any opt in to promotional or marketing emails associated to those alerts.
                                </p>
                                <p>
                                    We use cookies only where necessary for the functionality of this website, or as part of our analytics tools and do not use them to capture or store sensitive data.
                                </p>
                                <p>
                                    Any changes to this privacy policy will be published here with an effective date no earlier than seven (7) days after the date they are published.
                                </p>
                                <p>
                                    This policy is effective from 2 October 2025. For questions or concerns please contact privacy@solstrategies.io.
                                </p>
                            <h3>
                                Terms of Use
                            </h3>
                                <p>
                                    By using this website you accept these terms.
                                </p>
                                <p>
                                    We make no warranty for the accuracy of the data on this website, although we commit to keeping data up to date on a best-effort basis.
                                </p>
                                <p>
                                    We cannot guarantee delivery of an alert and you agree that you will not base any decision making or other processes on the receipt of such alerts. While we strive to maintain accurate and consistent performance the nature of the environment in which we operate means that occasionally data may be unavailable or inaccurate.
                                </p>
                                <p>
                                    You waive any claims of damages or loss that you believe may arise through the use of this website and indemnify Stakewiz against all claims by yourself, your employees, employer, associates or other parties as may arise.
                                </p>
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