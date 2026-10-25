import React, { useEffect, useState } from 'react';
import axios from 'axios';
import 'bootstrap-icons/font/bootstrap-icons.css'
import config from '../config.json';
import { Header, TopBar, Footer, Spinner, getEpochInfo } from '../components/common'
import { getClusterStats } from '../components/common';
import { clusterStatsI, EpochInfoI, validatorI } from '../components/validator/interfaces';
import { EpochProgress, CurrentEpochStats } from '../components/network/current_epoch';
import { LiveBlocks } from '../components/network/live_blocks';
import { NetworkComposition } from '../components/network/composition';
import { BlockStatsHistory, EpochDurationHistory } from '../components/network/history';

const API_URL = process.env.API_BASE_URL;

export default function Network() {
    const [validators, setValidators] = useState<validatorI[]>(null);
    const [clusterStats, setClusterStats] = useState<clusterStatsI>(null);
    const [epochInfo, setEpochInfo] = useState<EpochInfoI>(null);

    useEffect(() => {
        axios(API_URL+config.API_ENDPOINTS.validators, {
            headers: {'Content-Type':'application/json'}
        })
            .then(response => setValidators(response.data))
            .catch(e => console.log(e));
        getClusterStats().then((stats) => setClusterStats(stats));
        getEpochInfo().then((info) => { if(info) setEpochInfo(info as EpochInfoI) });
    }, []);

    return (
        <div>
            <Header
                title="Network - Stakewiz"
            />

            <main>
                <TopBar />

                <div className='container text-white my-4'>
                    <h2 className='mx-1 mb-3'>Network statistics</h2>
                    <div className='d-flex mb-1 flex-grow-1 flex-wrap validator-detail-flex-container'>
                        {(epochInfo) ? <EpochProgress epochInfo={epochInfo} /> : null}
                        <LiveBlocks validators={validators} />
                        {(clusterStats) ? <CurrentEpochStats clusterStats={clusterStats} /> : <Spinner />}
                        <BlockStatsHistory />
                        {(validators) ? <NetworkComposition validators={validators} /> : <Spinner />}
                        <EpochDurationHistory />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
