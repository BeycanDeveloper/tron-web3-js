import Utils from './utils';
import {icon} from './icon.json';
import Transaction from './transaction';
import Token from './token';

class TronWeb3 {

    connectedAccount;

    wallets = {
        tronlink: {
            name: 'TronLink',
            icon
        },
    }

    networks = {
        mainnet: {
            node: "mainnet",
            name: "TronGrid Mainnet",
            host: "https://api.trongrid.io",
            explorer: "https://tronscan.io/"
        },
        testnet: {
            node: "testnet",
            name: "Nile Testnet",
            host: "https://api.nileex.io",
            explorer: "https://nile.tronscan.org/"
        }
    }

    network;

    static utils;
    
    constructor(network) {
        this.network = this.networks[network];
    }

    connect() {
        return new Promise(async (resolve, reject) => {
            
            if (!this.isTronLink()) {
                return reject('wallet-not-detected');
            }

            let result = await tronLink.request({method: 'tron_requestAccounts'});
            
            if (!result) {
                return reject('locked');
            }

            if (result.code == 4001) {
                return reject('request-rejected');
            }

            if (tronLink.tronWeb.fullNode.host != this.network.host) {
                return reject('not-accepted-network');
            }

            this.connectedAccount = tronLink.tronWeb.defaultAddress.base58;

            return resolve(tronLink.tronWeb.defaultAddress.base58);
        });
    }

    transfer(toAddress, amount, tokenAddress = null) {
        if (!tokenAddress || tokenAddress == 'TRX') {
            return this.trxTransfer(toAddress, amount);
        } else if (tokenAddress) {
            return this.tokenTransfer(toAddress, amount, tokenAddress);
        } else {
            return new Error("invalid-token-address");
        }
    }

    trxTransfer(toAddress, amount) {
        return new Promise(async (resolve, reject) => {
            try {

                if (parseFloat(amount) > await this.getTrxBalance()) {
                    return reject('insufficient-balance');
                }

                if (parseFloat(amount) < 0) {
                    return reject('transfer-amount-error');
                }

                amount = tronLink.tronWeb.toSun(amount);
                let {txid} = await tronLink.tronWeb.trx.sendTransaction(toAddress, amount);
                return resolve(this.transaction(txid));
            } catch (error) {
                if (error == "Confirmation declined by user") {
                    return reject('request-rejected');
                }

                return reject(error);
            }
        });
    }

    tokenTransfer(to, amount, tokenAddress) {
        return new Promise((resolve, reject) => {
            try {
                this.token(tokenAddress).transfer(to, amount)
                .then((txid) => {
                    resolve(this.transaction(txid));
                })
                .catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * @param {Array} params 
     * @return {Object}
     */
    contract(...params) {
        return tronLink.tronWeb.contract(...params);
    }

    /**
     * @param {Object} params 
     * @return {Object}
     */
    deployContract(params) {
        return new Promise(async (resolve, reject) => {
            try {
                let transaction = await tronLink.tronWeb.transactionBuilder.createSmartContract(params, this.connectedAccount);

                let signedTransaction = await tronLink.tronWeb.trx.sign(transaction);

                let {txid} = await tronLink.tronWeb.trx.sendRawTransaction(signedTransaction);

                return resolve(this.transaction(txid));
            } catch (error) {
                if (error == "Confirmation declined by user") {
                    return reject('request-rejected');
                }

                return reject(error);
            }
        });
    }

    /**
     * @param {String} address 
     * @return {Token}
     */
    token(address) {
        return new Token(address, this);
    }

    async getTokenBalance(tokenAddress) {
        return await this.token(tokenAddress).getBalance(this.connectedAccount);
    }

    async getTokenInfo(tokenAddress) {
        return await this.token(tokenAddress).getTokenInfo();
    }

    async getTrxBalance() {
        return parseFloat(tronLink.tronWeb.fromSun(await tronLink.tronWeb.trx.getBalance(this.connectedAccount)));
    }

    /**
     * @param {String} address 
     * @return {String}
     */
    addressToHex(address) {
        return tronLink.tronWeb.address.toHex(address);
    }

    /**
     * @param {String} address 
     * @return {String}
     */
    addressFromHex(address) {
        return tronLink.tronWeb.address.fromHex(address);
    }

    isTronLink() {
        return window.tronLink;
    }

    /**
     * @param {String} transactionId 
     * @return {Transaction}
     */
    transaction(transactionId) {
        return new Transaction(transactionId, this)
    }

    sendTransaction(transaction) {
        return new Promise(async (resolve, reject) => {
            try {
                let signedTransaction = await tronLink.tronWeb.trx.sign(transaction);
                let {txid} = await tronLink.tronWeb.trx.sendRawTransaction(signedTransaction);
                return resolve(txid);
            } catch (error) {
                if (error == "Confirmation declined by user") {
                    return reject('request-rejected');
                }

                return reject(error);
            }
        });
    }

    async triggerSmartContract(...params) {
        return tronLink.tronWeb.transactionBuilder.triggerSmartContract(...params);
    }
}

TronWeb3.utils = Utils;

window.TronWeb3 = TronWeb3;

module.exports = TronWeb3;