import React, {useState, useEffect, useContext, FC} from 'react';
import { RenderImage } from './validator/common'
import config from '../config.json';
import { ValidatorContext } from './validator/validatorhook'
import { useRouter } from 'next/router'
const ordinal = require ('ordinal');


interface ValidatorData {
  name: string;
  vote_identity: string;
  identity: string,
  activated_stake : number,
  image : string,
  wiz_score : number,
  rank : number
}

  export const ValidatorFilterData: FC<{
    filteredValidator: ValidatorData; 
  }> = ({filteredValidator}) => {
    const router = useRouter()

    let validatorUrl : string =`/validator/${filteredValidator.vote_identity}`
    const validatorClick = (e) => {
       e.preventDefault()
       router.push(validatorUrl)
     }

    return (
      <>
        <li className="item">
            <div className="validator-img">
              <RenderImage
                  img={(filteredValidator.image)}
                  vote_identity={filteredValidator.vote_identity}
                  size={50}
              />
            </div>
            <a href={"/validator/" + filteredValidator.vote_identity} onClick={() => {validatorClick}}>
              <div className="validator-info">
                <div className={`validator-title ${(filteredValidator.name) ? '' : 'text-truncate width100'}`}>
                    <b>{filteredValidator.name ? filteredValidator.name : filteredValidator.vote_identity}</b>
                  
                </div>
                <div className={`scroll-description ${(!filteredValidator.image) ? 'scroll-descrip-full-Width' : ''}`}>
                  <div className="d-flex">
                    <div className='text-truncate flex-grow-1 text-secondary'>
                      <b>I:</b>&nbsp;{filteredValidator.identity} &nbsp;
                    </div>
                    <div className='text-truncate flex-grow-1 text-secondary'>
                      <b>V:</b>&nbsp;{filteredValidator.vote_identity} &nbsp;
                    </div>
                  </div>
                  <div className='wiz-one-line text-secondary'> 
                      <span className='wiz-font me-2'>WIZ Score:</span>&nbsp;
                      <span className='fw-bold'>{filteredValidator.wiz_score}% ({ordinal(filteredValidator.rank)})</span>
                  </div>
                </div>
              </div>
              </a>
              <div className="clrFix"></div>
        </li>
      </>
    )

  }

  const GlobalSearch: FC<{
    mediaScreenHide : string,
    elementID : string,
    validatorList ? : string[],
    showSearchValidators ? : boolean
    }> = ({ mediaScreenHide, elementID }) => {
    const validatorList = useContext(ValidatorContext);
    useEffect(() => {
      setSearchValidators(validatorList)
    },[validatorList])
    const [hasFilterData, setHasFilterData] = useState(false);
    const [searchValidators, setSearchValidators] = useState([]);
    const [searchFilterValidators, setSearchFilterValidators] = useState([]);
    const [showSearchValidators, setShowSearchValidators] = useState(false);
    const [searchInput, setSearchInput] = useState('');

    const doSearch = async(key, searchTitle) => {
        setSearchInput(searchTitle)
        const filteredValidators = [];
        if(searchTitle.length > config.DEFAULT_SEARCH_KEY_COUNT){
          for (let i = 0; i < searchValidators.length; i++) {
            
            let name = searchValidators[i].name;
            let txtValue = searchValidators[i].name + searchValidators[i].identity + searchValidators[i].vote_identity;
            
            if (txtValue.toUpperCase().indexOf(searchTitle.toUpperCase()) > -1 ) {
              let sf = "rank_asc";
              sf = sf.substring(0,sf.length-4);
              filteredValidators.sort((a,b) => (a[sf] > b[sf]) ? 1 : ((b[sf] > a[sf]) ? -1 : 0));
              filteredValidators.push(searchValidators[i]);
            }   
        }
          if(filteredValidators.length > 0){
            setHasFilterData(true)
          }
          else{
            setHasFilterData(false)
          }
          setSearchFilterValidators(filteredValidators)
          setShowSearchValidators(true)
        }
        else{
          setShowSearchValidators(false)
        }
    }
 
  return (
    <>
      <div className={`search-container ${mediaScreenHide}`} >
          <input className={`search expandright ${(showSearchValidators) ? 'src-active' : ''}`} id={elementID} type="search" name="search" placeholder="Search validators..."        
          onChange={(e) => {doSearch(e.target.name, e.target.value)}}  autoComplete="off" value={searchInput} />
          <label className={`btnSearch searchbtn ${(showSearchValidators) ? 'btnSearch-active' : ''}`} htmlFor={elementID}>
            <span className="mglass">⚲</span></label>
        {(hasFilterData && showSearchValidators) ?
            <div className="search-result-div scrollSrc">
                  <ul className="validators-list validator-list-in-box">
                    <div className="search-result-heading"></div>
                      {  searchFilterValidators.map((validator) =>
                        <ValidatorFilterData
                        key={validator.identity}
                        filteredValidator={validator}
                      />
                    )}
                  </ul>
            </div>
            : (!hasFilterData && showSearchValidators) ? 
                <div className="search-result-div scrollSrc">
                   No Results Found
                </div>
            : null
        }
      </div>
    </>
  )

}
export default GlobalSearch;