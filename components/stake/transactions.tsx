import { Authorized, BlockhashWithExpiryBlockHeight, ComputeBudgetProgram, Connection, Keypair, PublicKey, StakeProgram, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

// Builds a v0 VersionedTransaction from the given instructions, prepending the priority fee.
// The blockhash is returned alongside so callers can confirm against the same expiry window.
export const buildVersionedTx = async (instructions: TransactionInstruction[], feePayer: PublicKey, connection: Connection): Promise<[VersionedTransaction, BlockhashWithExpiryBlockHeight]> => {

    let blockhash = await connection.getLatestBlockhash();

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: parseInt(process.env.PRIORITY_FEE),
    })

    const message = new TransactionMessage({
        payerKey: feePayer,
        recentBlockhash: blockhash.blockhash,
        instructions: [addPriorityFee, ...instructions]
    }).compileToV0Message()

    return [new VersionedTransaction(message), blockhash]

}

export const createStake = (publicKey, validator, lamports): [Transaction, Transaction, Keypair] => {
    let stakeKeys = Keypair.generate();
    let auth = new Authorized(
        publicKey,
        publicKey
    );


    let stakeTx = StakeProgram.createAccount({
        authorized: auth,
        fromPubkey: publicKey,
        lamports: lamports,
        stakePubkey: stakeKeys.publicKey
    });
    
    let votePubkey = new PublicKey(validator.vote_identity);

    let delegateIx = StakeProgram.delegate({
        authorizedPubkey: publicKey,
        stakePubkey: stakeKeys.publicKey,
        votePubkey: votePubkey
    });

        return [stakeTx, delegateIx, stakeKeys]
}

export const deactivateStake = (authorizedPubkey, stakePubkey): Transaction => {

    return StakeProgram.deactivate({
        authorizedPubkey: authorizedPubkey,
        stakePubkey: stakePubkey
    })

}

export const closeStake = (authorizedPubkey, stakePubkey, lamports): Transaction => {

    return StakeProgram.withdraw({
        authorizedPubkey: authorizedPubkey,
        lamports: lamports,
        stakePubkey: stakePubkey,
        toPubkey: authorizedPubkey
    })
}

export const delegateStake = (authorizedPubkey, stakePubkey, votePubkey): Transaction => {

    return StakeProgram.delegate({
        authorizedPubkey: authorizedPubkey,
        stakePubkey: stakePubkey,
        votePubkey: votePubkey
    })

}