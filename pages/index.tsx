import type { NextPage } from 'next'
import React from 'react'
import { ValidatorListing } from '../components/validator'
import { clusterStatsI, validatorI } from '../components/validator/interfaces'
import config from '../config.json'
import 'bootstrap-icons/font/bootstrap-icons.css'
import {Header, TopBar, Footer} from '../components/common'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { checkSolflareEnabled } from '../components/common'
import { Connection } from '@solana/web3.js'


class Homepage extends React.Component<
  {
    userPubkey: string;
    connection: Connection;
    connected: boolean;
  },
  {
    validators: [validatorI],
    clusterStats: clusterStatsI,
    filteredValidators: [validatorI],
    stakeValidators: [validatorI],
    hasData: boolean,
    visibleCount: number,
    showWizModal: boolean,
    wizValidator: validatorI,
    showAlertModal: boolean,
    alertValidator: validatorI,
    walletValidators: [string],
    solflareNotificationsEnabled: boolean;
    stakeValidator: validatorI,
    showStakeModal: boolean,
    showMultiStakeModal: boolean,
    laine: validatorI,
    showListView: boolean
  }> {
  constructor(props) {
    super(props);

    this.state = {
      validators: null,
      clusterStats: null,
      filteredValidators: null,
      stakeValidators: null,
      hasData: false,
      visibleCount: config.DEFAULT_LIST_SIZE,
      showWizModal: false,
      wizValidator: null,
      showAlertModal: false,
      alertValidator: null,
      walletValidators: null,
      solflareNotificationsEnabled: false,
      stakeValidator: null,
      showStakeModal: false,
      showMultiStakeModal: false,
      laine: null,
      showListView: false
    };

    if(this.props.userPubkey) this.checkSolflare(this.props.userPubkey);
  }

  updateState(state) {
    this.setState(state);
  }

  async checkSolflare(pubkey) {
    let enabled = await checkSolflareEnabled(pubkey);
    
    this.setState({
        solflareNotificationsEnabled: enabled
    });
  }

  render() {
    return [
            <ValidatorListing
                state={this.state}
                updateState={(state) => this.updateState(state)}
                userPubkey={this.props.userPubkey}
                connection={this.props.connection}
                connected={this.props.connected}
                key={'validatorParent'+this.props.userPubkey}
            />
          ]
  }
}


const Home: NextPage = () => {

  let {connection} = useConnection();
  let {connected, publicKey} = useWallet();

    return (
    
      <div>
        <Header
          title="Stakewiz"
        />
  
        <main>
          <TopBar />
  
          <div id="vlist" className="container text-white py-2 text-modal-white">
            <Homepage
              key={(publicKey) ? 'homepage'+publicKey.toString() : 'homepage'}
              userPubkey={(connected) ? publicKey.toString() : null}
              connection={(connected) ? connection : null }
              connected={connected}
            />
          </div>
        </main>
  
        <Footer />
      </div>
    )
  
  
}

export default Home;