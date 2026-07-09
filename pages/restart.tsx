import React, { useEffect, useState } from 'react';
import Link from 'next/link'
import 'bootstrap-icons/font/bootstrap-icons.css'
import {Header, TopBar, Footer} from '../components/common'
import { WizScoreWeightings } from '../components/wizscore';
import axios from 'axios';
import config from '../config.json'

const API_URL = process.env.API_BASE_URL;

const getStake = async () => {
    axios(API_URL+config.API_ENDPOINTS.gossip_stake, {
        headers: {'Content-Type':'application/json'}
    })
      .then(response => {
        let json = response.data;
        
        return json;
      })
      .catch(e => {
        console.log(e);
      })
      return null
}

export default function Home() {

    const [stake, setStake] = useState(null);


    const getStake = () => {
        axios(API_URL+config.API_ENDPOINTS.gossip_stake, {
            headers: {'Content-Type':'application/json'}
        })
          .then(response => {
            let json = response.data;
            setStake(json.active_stake);
          })
          .catch(e => {
            console.log(e);
          })
    }

    setTimeout(() => {
            getStake()
        },
        5000
    );


    return (
        <div>
            <Header
                title="Restart Tracker - Stakewiz"
            />

            <main>
                <TopBar />

                {(stake!=null) ? (
                    <div className='container'>         
                        <div className='text-center'>
                            <h2 className='text-white'>{(stake<80) ? 'Network restart is underway' : 'Network has restarted'}</h2>
                        </div>       
                        {(stake<80) ? ( [
                        <div className="d-flex justify-content-center my-5" key='progress-bar'>                    
                            <div className="w-50 progress" data-bs-toggle="tooltip" title="See FAQ for formula of this display." data-bs-placement="bottom" style={{height:'30px'}}>                        
                                <div className={"progress-bar progress-bar-striped progress-bar-animated bg-success"} role="progressbar"  style={{width: stake+'%'}}>
                                    {stake+'%'}
                                </div>                    
                            </div>                
                        </div>,
                        <div className='text-center text-white fs-5' key='progress-label'>
                            Bar above shows active stake visible in gossip. Once 80% is active the network will restart.
                        </div>]    
                        ) : null } 
                        <div className='text-center text-white fs-6 my-3'>
                            <p>This display was rapidly built to provide insight into the restart. It receives data directly from our validator log every 5 seconds, refresh to update.</p>
                            <p>Built by <a href='http://laine.co.za/solana' target='_new'>Laine</a> - a Solana Validator</p>
                            <p>Join our Discord <a href='https://discord.gg/4qUCTsX9QV' target='_new'>here</a></p>
                            <p>Information is provided without warranty for its accuracy.</p>
                        </div>         
                    </div>     
                ) : (
                    <div className='container'>         
                        <div className='text-center'>
                            <h2 className='text-white'>Loading...</h2>
                        </div></div>
                    )}
                
            </main>

            <Footer />
        </div>
    )
}