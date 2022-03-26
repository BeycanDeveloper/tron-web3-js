import Utils from './utils';
import {icon} from './icon.json';
import Transaction from './transaction';

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
            name: "TronGrid Mainnet",
            host: "https://api.trongrid.io",
            explorer: "https://tronscan.io/"
        },
        testnet: {
            name: "Nile Testnet",
            host: "https://api.nileex.io",
            explorer: "https://nile.tronscan.org/"
        }
    }

    network;
    
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

    tokenTransfer(toAddress, amount, tokenAddress) {
        return new Promise(async (resolve, reject) => {
            try {

                if (parseFloat(amount) > await this.getTokenBalance(tokenAddress)) {
                    return reject('insufficient-balance');
                }

                if (parseFloat(amount) < 0) {
                    return reject('transfer-amount-error');
                }

                let token = await tronLink.tronWeb.contract().at(tokenAddress);
                let decimals = parseFloat((await token.decimals().call()).toString(10));

                let parameter = [
                    {
                        type:'address',
                        value: toAddress
                    },
                    {
                        type:'uint256',
                        value: Utils.toHex(amount, decimals)
                    }
                ];

                let options = {
                    feeLimit: 100000000                    
                };

                let transactionObject = await tronLink.tronWeb.transactionBuilder.triggerSmartContract(
                    tokenAddress, 
                    "transfer(address,uint256)", 
                    options, 
                    parameter,
                    this.connectedAccount
                );
                
                let signedTransaction = await tronLink.tronWeb.trx.sign(transactionObject.transaction);

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

    async getTokenBalance(tokenAddress) {
        let token = await tronLink.tronWeb.contract().at(tokenAddress);
        let decimals = parseFloat((await token.decimals().call()).toString(10));
        let balance = await token.balanceOf(this.connectedAccount).call();

        return Utils.toDec(balance._hex, decimals);
    }

    async getTokenInfo(tokenAddress) {
        let token = await tronLink.tronWeb.contract().at(tokenAddress);
        let name = await token.name().call();
        let symbol = await token.symbol().call();
        let decimals = parseFloat((await token.decimals().call()).toString(10));
        let totalSupply = parseFloat((await token.totalSupply().call()).toString(10));

        return {name, symbol, decimals, totalSupply};
    }

    async getTrxBalance() {
        return parseFloat(tronLink.tronWeb.fromSun(await tronLink.tronWeb.trx.getBalance(this.connectedAccount)));
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
}

window.TronWeb3 = TronWeb3;

module.exports = TronWeb3;