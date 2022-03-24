import Utils from './utils';
import TronTxDecoder from '@beycandeveloper/tron-tx-decoder';

class Transaction {

    web3;

    /**
     * @var {String} 
     */
    id;

    /**
     * @var {Object} 
     */
    data;

    /**
     * @param {String} transactionId 
     * @param web3
     */
    constructor(transactionId, web3) {
        this.id = transactionId;
        this.web3 = web3;
    }

    async getDataFromExplorer() {
        try {
            this.data = await tronLink.tronWeb.trx.getTransaction(this.id);
        } catch (error) {
            throw new Error('There was a problem retrieving transaction data!');
        }

        try {
            this.data.info = await tronLink.tronWeb.trx.getTransactionInfo(this.id);
        } catch (error) {
            throw new Error('There was a problem retrieving transaction data!');
        }

        return this.data;
    }

    /**
     * @returns {String}
     */
    getId() {
        return this.id;
    }

    /**
     * @returns {Object}
     */
    getData() {
        return this.data;
    }

    /**
     * @returns {Object}
     */
    async decodeInput() {
        let decoder = new TronTxDecoder(tronLink.tronWeb.fullNode.host);
        let {decodedInput} = await decoder.decodeInputById(this.id);
        
        let receiver = tronLink.tronWeb.address.fromHex(decodedInput[0]);
        let amount = decodedInput[1]._hex;
        
        return { receiver, amount };
    }

    /**
     * @param {Integer} timer 
     * @returns {String|Object}
     */
    verify(timer = 1) {
        return new Promise((resolve, reject) => {
            let checkerInterval = setInterval(async () => {
                try {

                    await this.getDataFromExplorer();

                    let result = null;

                    if (this.data.info.blockNumber) {
                        if (this.data.ret[0].contractRet == 'REVERT') {
                            result = 'failed';
                        } else if (this.data.info.result == 'FAILED') {
                            result = 'failed';
                        } else {
                            result = 'verified';
                        }
                    }
    
                    if (typeof result == 'string') {
                        clearInterval(checkerInterval);
                        if (result == 'verified') {
                            return resolve('verified');
                        } else if (result == 'failed') {
                            return reject('failed');
                        }
                    }
    
                } catch (error) {
                    clearInterval(checkerInterval);
                    return reject(error);
                }
            }, (timer*1000));
        });
    }

    /**
     * @param {String} receiver
     * @param {Integer} amount
     * @param {String|null} tokenAddress
     * @returns {String}
     */
    async verifyData(receiver, amount, tokenAddress = null) {

        if (!tokenAddress || tokenAddress == 'TRX') {

            let params = this.data.raw_data.contract[0].parameter.value;
            let data = {
                receiver: String(tronLink.tronWeb.address.fromHex(params.to_address)).toLowerCase(),
                amount: parseFloat(tronLink.tronWeb.fromSun(params.amount))
            };

            if (data.receiver == receiver && String(data.amount) == String(amount)) {
                return 'verified';
            }
        } else {

            let decodedInput = await this.decodeInput();
            let token = await tronLink.tronWeb.contract().at(tokenAddress);
            let decimals = parseFloat((await token.decimals().call()).toString(10));

            let data = {
                receiver: String(decodedInput.receiver).toLowerCase(),
                amount: Utils.toDec(decodedInput.amount, decimals)
            };
            
            if (data.receiver == receiver && String(data.amount) == String(amount)) {
                return 'verified';
            }
        }

        return 'failed';
    }

    /**
     * @param {String} receiver
     * @param {Integer} amount
     * @param {String|null} tokenAddress
     * @returns {String}
     */
    verifyWithData(receiver, amount, tokenAddress = null) {
        return new Promise((resolve, reject) => {
            this.verify()
            .then(async (result) => {
                result = await this.verifyData(receiver, amount, tokenAddress);
                if (result = 'verified') {
                    resolve('verified');
                } else {
                    reject('failed');
                }
            })
            .catch(() => {
                reject('failed');
            });
        });
    }

    /**
     * @param {String} receiver
     * @returns {String}
     */
    getTransactionUrl() {
        let explorerUrl = this.web3.network.explorer;
        explorerUrl += explorerUrl.endsWith('/') ? '' : '/';
        explorerUrl += '#/transaction/'+this.id;
        return explorerUrl;
    }

}

module.exports = Transaction;