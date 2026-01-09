import dynamic from 'next/dynamic';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
const WalletProvider = dynamic(
    async () => (await import('@solana/wallet-adapter-react')).WalletProvider,
    { ssr: false }
);
import { ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    WalletConnectWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { AppProps } from 'next/app';
import { FC, useMemo,  useEffect, useState, useContext } from 'react';
import { ValidatorContext } from '../components/validator/validatorhook';
import { ValidatorData } from '../components/common';

require('@solana/wallet-adapter-react-ui/styles.css');
require('bootstrap/dist/css/bootstrap.css');
require('react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css')
require('../css/wallet.css')
require("../css/style.css");


const Stakewiz: FC<AppProps> = ({ Component, pageProps }) => {
  // Can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Mainnet;
  

  // You can also provide a custom RPC endpoint
  //const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const endpoint = process.env.RPC_URL;
  const wallet_connect_app_id = process.env.WALLET_CONNECT_APP_ID;
  

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
  // Only the wallets you configure here will be compiled into your application, and only the dependencies
  // of wallets that your users connect to will be loaded
  const wallets = useMemo(
      () => [
          new PhantomWalletAdapter(),
          new SolflareWalletAdapter({ network }),
          new WalletConnectWalletAdapter({
            network: network,
            options: {
                relayUrl: 'wss://relay.walletconnect.com',
                projectId: wallet_connect_app_id,
                metadata: {
                    name: 'Stakewiz by SOL Strategies',
                    description: 'Validator Analytics and Staking',
                    url: 'https://stakewiz.com',
                    icons: ['https://stakewiz.com/images/favicon-new.png']
                },
            },
          })
      ],
      [network]
  );

  const [validators, setValidators] = useState(null);
    useEffect(() => {
        if(validators == null){
            const getValidator = async() => {
                let validatorList : any;
                try{
                    validatorList  = await ValidatorData();
                }catch(e){
                    setTimeout(()=>{ console.log(e)},5000);
                }
                setValidators(validatorList)
            }
            getValidator();
        }
    }, [validators]);

  return (
    <ValidatorContext.Provider value={validators}>
      <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
              <WalletModalProvider>
                  <Component {...pageProps} />
              </WalletModalProvider>
          </WalletProvider>
      </ConnectionProvider>
      </ValidatorContext.Provider>
  );
};

export default Stakewiz;

