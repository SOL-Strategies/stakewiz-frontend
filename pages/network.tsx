import React, { useEffect, useState } from 'react';
import axios from 'axios';
import 'bootstrap-icons/font/bootstrap-icons.css'
import config from '../config.json';
import { Header, TopBar, Footer, Spinner, getClusterStats } from '../components/common'
import { clusterStatsI, validatorI } from '../components/validator/interfaces';
import { NetworkHealth, BlockTotals } from '../components/network/current_epoch';
import { LiveBlocks } from '../components/network/live_blocks';
import { Distributions, PerformanceMap } from '../components/network/distributions';
import { NetworkComposition } from '../components/network/composition';
import { BlockStatsHistory, BlockRevenueHistory, EpochDurationHistory } from '../components/network/history';

const API_URL = process.env.API_BASE_URL;

export default function Network() {
    const [validators, setValidators] = useState<validatorI[]>(null);
    const [clusterStats, setClusterStats] = useState<clusterStatsI>(null);

    useEffect(() => {
        axios(API_URL+config.API_ENDPOINTS.validators, {
            headers: {'Content-Type':'application/json'}
        })
            .then(response => setValidators(response.data))
            .catch(e => console.log(e));
        getClusterStats().then((stats) => setClusterStats(stats));
    }, []);

    return (
        <div>
            <Header
                title="Network - Stakewiz"
            />

            <main>
                <TopBar />

                <div className='container text-white my-4'>
                    <h2 className='mx-1 mb-1'>Network statistics</h2>
                    <p className='mx-1 mb-3 text-secondary'>How the Solana validator network is performing, from Stakewiz measurements of every validator and every block.</p>
                    <div className='d-flex mb-1 flex-grow-1 flex-wrap validator-detail-flex-container'>
                        {(clusterStats || validators) ? <NetworkHealth clusterStats={clusterStats} validators={validators} /> : <Spinner />}
                        <LiveBlocks validators={validators} />
                        {(validators) ? <Distributions validators={validators} clusterStats={clusterStats} /> : null}
                        {(validators) ? <PerformanceMap validators={validators} /> : null}
                        <BlockStatsHistory />
                        <BlockRevenueHistory />
                        <EpochDurationHistory />
                        <BlockTotals clusterStats={clusterStats} />
                        {(validators) ? <NetworkComposition validators={validators} clusterStats={clusterStats} /> : null}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
