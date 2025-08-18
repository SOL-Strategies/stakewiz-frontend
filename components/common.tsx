import Head from 'next/head';
import React, {FC, useEffect, useState} from 'react';
import Script from 'next/script'
import Link from 'next/link'
import { Navbar, Container, Nav, NavDropdown } from 'react-bootstrap'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import axios from 'axios';
import config from '../config.json'
import { clusterStatsI, EpochInfoI } from './validator/interfaces';
import GlobalSearch from "./navbar-search";
import { PublicKey } from '@solana/web3.js';
<<<<<<< HEAD
import StakewizLogo from '../public/images/logo-horizontal-sm.svg'
=======
import StakewizLogo from '../public/images/logo-horizontal-ssi.svg'

>>>>>>> master
const API_URL = process.env.API_BASE_URL;

interface HeaderProps {
  title: string;

}

const Spinner: FC<{wrapper?: boolean}> = ({wrapper}) => {
  
  if(wrapper==undefined) {
    return (
      <div className="container text-center" id='loading-spinner'>
          <div className='spinner-grow text-light' role="status">
              <span className='visually-hidden'>Loading...</span>
          </div>
      </div>
    )
  }
  else {
    return (
      <div className='spinner-grow text-light' role="status">
          <span className='visually-hidden'>Loading...</span>
      </div>
    )
  }
}


class Header extends React.Component<HeaderProps, {}> {

    render() {
        return (
            <Head>
                <title>{this.props.title}</title>
                <meta name="description" content="Validator monitoring and alerting" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta property="og:title" content={this.props.title} />
                <meta property="og:description" content="Validator analytics, monitoring and alerting for Solana." />
                <meta property="og:url" content="https://stakewiz.com" />
                <meta property="og:image" content="https://stakewiz.com/images/favicon-new.png" />
                <link rel="icon" href="/images/favicon-new.png" />.
            </Head>
        )
    }
}

const TopBar: FC = () => {
    const [epochInfo, setEpochInfo] = useState<EpochInfoI | null>(null);
    
    useEffect(() => {
        
      getEpochInfo()
      .then((epoch: EpochInfoI) => {
        
        setEpochInfo(epoch);
        
      });
      
    }, [])

    const renderEpochProgress = () => {
      if(epochInfo!=null) {

        let d_days = Math.floor(epochInfo.duration_seconds/(60*60*24));
        let d_hours = Math.floor((epochInfo.duration_seconds - (d_days*60*60*24)) / (60*60));
        let d_minutes = Math.floor((epochInfo.duration_seconds - (d_days*60*60*24) - (d_hours*60*60)) /(60));

        let r_days = Math.floor(epochInfo.remaining_seconds/(60*60*24));
        let r_hours = Math.floor((epochInfo.remaining_seconds - (r_days*60*60*24)) / (60*60));
        let r_minutes = Math.floor((epochInfo.remaining_seconds - (r_days*60*60*24) - (r_hours*60*60)) /(60));

        return (
          <div className='position-absolute start-0 justify-content-center text-center d-flex align-items-center epoch-progress-container'>
            <div>
              <div className='text-light text-center epoch-progress-text'>
                Epoch {epochInfo.epoch}
              </div>
              <div className="progress epoch-progress w-100" style={{height: '5px'}}>
                <div className="progress-bar progress-bar-striped bg-light progress-bar-animated" role="progressbar" style={{width:(epochInfo.slot_height/432000*100)+'%'}} aria-valuenow={epochInfo.slot_height} aria-valuemin={0} aria-valuemax={432000}>
                </div>
              </div>
              <div className='epoch-progress-label text-light'>
                {(epochInfo.slot_height/config.SLOTS_PER_EPOCH*100).toFixed(1)} % complete
                &nbsp;
                ({(r_days>0) ? <span>{r_days}d</span> : null} {(r_hours>0) ? <span>{r_hours}h</span> : null} {r_minutes}m of {d_days}d {d_hours}h {d_minutes}m remaining)
              </div>
            </div>
            
          </div>
        )
      }
      else return null;

    }
    


    return (
      <div>
        <Script
          key='gtag-script'
          src="https://www.googletagmanager.com/gtag/js?id=G-L7C5EZ0C4F"
          strategy="afterInteractive"
        />
        <Script key='ga-script' id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-L7C5EZ0C4F');
          `}
        </Script>
        <Navbar key='navbar' bg="none" variant="dark" expand="lg">
          <Container className='navbar-flex-container'>
            <Navbar.Brand href="/" className='brand-box'>
                <StakewizLogo fill="#fff" height="80px" width="250px" />
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav" className='position-relative justify-content-end align-items-center text-white'>
              {renderEpochProgress()}
              <Nav>
                <GlobalSearch mediaScreenHide="tablet-off" key="searchValidatorDesktop" elementID="searchValidatorDesktop" />
                <Nav.Link href="/" className='text-white'>Home</Nav.Link>
                <Nav.Link href="/stakes" className='text-white'>My Stakes</Nav.Link>
                <Nav.Link href="/faq" className='text-white'>FAQs</Nav.Link>
                <Nav.Link href="/validator/GE6atKoWiQ2pt3zL7N13pjNHjdLVys8LinG8qeJLcAiL" target="_new" className='text-warning fw-bold'>Stake with us</Nav.Link>
                <a href="https://discord.gg/3JXdTavv6x" target="_new" className='text-white me-2 nav-discord'>
                  <i className="bi bi-discord p-2 pointer"></i>
                  <span className='d-none'>Join Discord</span> 
                </a>
              </Nav>
              <div className='wallet-container'>
                  <WalletMultiButton
                    className='btn btn-outline-light'
                  />
              </div>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      </div>         
    )
    
}

class Footer extends React.Component {

  render() {
      return (
        <footer className='container-fluid footer bg-dark p-5 text-white text-center'>
            <div className="container">
            <div className="row"> 
                <div className="col"> 
                <Link href="/" passHref legacyBehavior>
                  <span className="text-white pointer" >Home</span>
                </Link>
                <br />
                <Link href="/faq" passHref legacyBehavior>
                  <span className="text-white pointer" >Frequently Asked Questions</span>
                </Link>
                <br />
                <Link href="/terms" passHref legacyBehavior>
                  <span className="text-white pointer" >Terms &amp; Conditions</span>
                </Link>
                </div>
                <div className="col social-icons">
                <a href="https://discord.gg/3JXdTavv6x" target="_new"><i className="bi bi-discord p-2 pointer"></i></a>
                <a href="https://twitter.com/laine_sa_" target="_new"><i className="bi bi-twitter p-2 pointer"></i></a>
                </div>
                <div className="col"> 
                  This site is protected by reCAPTCHA and the Google&nbsp;<a href="https://policies.google.com/privacy">Privacy Policy</a>&nbsp;and&nbsp;<a href="https://policies.google.com/terms">Terms of Service</a>&nbsp;apply.
                </div>
            </div>
            </div>
        </footer>
      );
  }
}

const ConditionalWrapper = ({
  condition,
  wrapper,
  children,
}) => (condition ? wrapper(children) : children);

const checkSolflareEnabled = async (pubkey: string): Promise<boolean> => {

  try {
    let pk = new PublicKey(pubkey)
    let result = await axios(API_URL+config.API_ENDPOINTS.solflare_check+'/'+pubkey, {
        headers: {'Content-Type':'application/json'}
    })
      .then(response => {
        let json = response.data;

        if(json.message!='Not found') {

            return true
        }

        
      })
      .catch(e => {
        console.log(e);
        return false;
      });


    return result;
  }
  catch(e) {
    console.log(e.message)
    return false
  }
  
  
  
}

const getEpochInfo = async (): Promise<Object> => {

  
  let result = await axios(API_URL+config.API_ENDPOINTS.epoch_info, {
      headers: {'Content-Type':'application/json'}
  })
    .then(response => {
      if(response.status==200) return response.data;
      else return false;

      
    })
    .catch(e => {
      console.log(e);
      return false;
    });

  return result;
}

const getAllEpochHistory = async (): Promise<Object> => {

  
  let result = await axios(API_URL+config.API_ENDPOINTS.all_epoch_history, {
      headers: {'Content-Type':'application/json'}
  })
    .then(response => {
      if(response.status==200) return response.data;
      else return false;

      
    })
    .catch(e => {
      console.log(e);
      return false;
    });

  return result;
}

const ValidatorData = async() => {

  return await new Promise((resolve, reject) => {
    axios(API_URL+config.API_ENDPOINTS.validators, {
    headers: {'Content-Type':'application/json'}
    }).then(response => {
      resolve(response.data);
    })
    .catch(error => {
      reject(error);
    });
  });

};

const WalletValidators = async(pubkey) => {

  return await new Promise((resolve, reject) => {
    axios(API_URL+config.API_ENDPOINTS.wallet_validators+'/'+pubkey, {
    headers: {'Content-Type':'application/json'}
    }).then(response => {
      resolve(response.data);
    })
    .catch(error => {
      console.log(error);
      reject(error);
    });
  });

};

export const getClusterStats = async ():Promise<clusterStatsI> => {
    
  try {
    let response = await axios(API_URL+config.API_ENDPOINTS.cluster_stats, {
      headers: {'Content-Type':'application/json'}
    })
    let json = response.data;

    return json
   }
   catch(e) {
      console.log(e);
      return null
    }
}

export {Header, TopBar, Footer, Spinner, checkSolflareEnabled, getEpochInfo, getAllEpochHistory, ConditionalWrapper, ValidatorData, WalletValidators}