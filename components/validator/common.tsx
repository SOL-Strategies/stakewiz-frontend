import { FC } from "react";
import Link from "next/link";
import Image from "next/legacy/image";
import { validatorI } from "./interfaces";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

export const StakeLabel: FC<{stake: number}> = ({stake}) => {
    
    if(stake != null && !isNaN(stake) && stake !== 0) {
        let s = (stake<0) ? stake*-1 : stake;
        let n = new Intl.NumberFormat().format(Number(s.toFixed(0)));
        let color = (stake<0) ? 'bg-danger' : 'bg-white text-black'
        color = (stake>0) ? 'bg-success' : color
        
        s = parseFloat(n);
        
        if(stake<0) {
            
            return (
                <OverlayTrigger
                    placement="top"
                    overlay={
                        <Tooltip>
                            Pending changes
                        </Tooltip>
                    } 
                >
                    <span className={"ms-2 badge fw-normal "+color}>
                        - ◎ {n}
                    </span>
                </OverlayTrigger>
            );
        }
        else {
            return (
                <OverlayTrigger
                    placement="top"
                    overlay={
                        <Tooltip>
                            Pending changes
                        </Tooltip>
                    } 
                >
                    <span className={"ms-2 badge fw-normal "+color}>
                        + ◎ {n}
                    </span>
                </OverlayTrigger>
            );
        }
    }
    else {
        return null;
    }

}

export const RenderImage: FC<
    {
        img:string,
        vote_identity:string,
        size:number,
        className?: string
    }> = ({ img, vote_identity, size, className }) => {
        
    return (
        (<Link href={'/validator/'+vote_identity} passHref className='d-flex'>

            <Image 
                className={(className!=undefined) ? className+" rounded-circle pointer " : " rounded-circle pointer "} 
                src={(img==null) ? '/images/validator-image-na.png' : img} 
                width={size} 
                height={size} 
                loading="lazy" 
                alt={vote_identity+"-logo"} />

        </Link>)
    );
}

export const RenderName: FC<{
    validator: validatorI
}> = ({validator}) => {
    if(validator!=null) {
        if(validator.name=='') {
            return <span className='text-truncate'>{validator.vote_identity}</span>;
        }
        else {
            return <span className='text-truncate'>{validator.name}</span>;
        }
    }
    else {
        return null
    }
    
}

export const RenderUrl: FC<{url:string}> = ({url}) => {
    if(url==null || url=='') {
        return null;
    }
    else {
        return (
            <a href={url} target="_new">
                <span className="fst-normal text-white pointer" >{url}</span>
            </a>
        );
    }
}