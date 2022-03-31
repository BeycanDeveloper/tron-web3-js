const Utils = require('./Utils');

class Token {

    /**
     * @var {Object} 
     */
    contract;

    /**
     * @var {String} 
     */
    address;

    /**
     * @var {Object} 
     */
    tokenInfo

    /**
     * @var {Object}
     */
    web3;

    /**
     * @param {String} address 
     * @param {Object} web3 
     * @throws {Error}
     */
    constructor(address, web3) {
        if (!address) throw new Error('Invalid token address');
        
        this.web3 = web3;

        this.address = address;
        
    }

    async getBalance(address) {
        let token = await tronLink.tronWeb.contract().at(this.address);
        let decimals = parseFloat((await token.decimals().call()).toString(10));
        let balance = parseFloat((await token.balanceOf(address).call()).toString(10));

        return Utils.toDec(balance, decimals);
    }

    async getTokenInfo() {
        let token = await tronLink.tronWeb.contract().at(this.address);
        let name = await token.name().call();
        let symbol = await token.symbol().call();
        let decimals = parseFloat((await token.decimals().call()).toString(10));
        let totalSupply = parseFloat((await token.totalSupply().call()).toString(10));
        totalSupply = Utils.toDec(totalSupply, decimals);

        return {name, symbol, decimals, totalSupply};
    }

    /**
     * @returns {String|Object}
     */
    async getName() {
        let token = await tronLink.tronWeb.contract().at(this.address);
        return await token.name().call();
    }

    /**
     * @returns {Float|Object}
     */
    async getTotalSupply() {
        let token = await tronLink.tronWeb.contract().at(this.address);
        let totalSupply = parseFloat((await token.totalSupply().call()).toString(10));
        return Utils.toDec(totalSupply, await this.getDecimals());
    }

    /**
     * @returns {String|Object}
     */
    async getSymbol() {
        let token = await tronLink.tronWeb.contract().at(this.address);
        return await token.symbol().call();
    }

    /**
     * @returns {String|Object}
     */
    async getDecimals() {
        let token = await tronLink.tronWeb.contract().at(this.address);
        return parseFloat((await token.decimals().call()).toString(10));
    }

    /**
     * @returns {String}
     */
    getAddress() {
        return this.address;
    }

    /**
     * @param {String} to
     * @param {Integer} amount
     * @returns {String|Object}
     */
    transfer(to, amount) {
        return new Promise(async (resolve, reject) => {
            try {

                if (parseFloat(amount) > await this.getBalance(this.web3.connectedAccount)) {
                    return reject('insufficient-balance');
                }

                if (parseFloat(amount) < 0) {
                    return reject('transfer-amount-error');
                }

                let parameter = [
                    {
                        type:'address',
                        value: to
                    },
                    {
                        type:'uint256',
                        value: Utils.toHex(amount, await this.getDecimals())
                    }
                ];

                let options = {
                    feeLimit: 100000000                    
                };

                let transactionObject = await tronLink.tronWeb.transactionBuilder.triggerSmartContract(
                    this.address, 
                    "transfer(address,uint256)", 
                    options, 
                    parameter,
                    this.web3.connectedAccount
                );
                
                let signedTransaction = await tronLink.tronWeb.trx.sign(transactionObject.transaction);

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

    /**
     * @param {String} spender
     * @param {Number} amount
     * @returns {Boolean}
     */
    approve(spender, amount) {
        return new Promise(async (resolve, reject) => {
            try {
                let parameter = [
                    {
                        type:'address',
                        value: spender
                    },
                    {
                        type:'uint256',
                        value: Utils.toHex(amount, await this.getDecimals())
                    }
                ];
    
                let options = {
                    feeLimit: 100000000                    
                };
    
                let transactionObject = await tronLink.tronWeb.transactionBuilder.triggerSmartContract(
                    this.address, 
                    "approve(address,uint256)", 
                    options, 
                    parameter,
                    this.web3.connectedAccount
                );
    
                let signedTransaction = await tronLink.tronWeb.trx.sign(transactionObject.transaction);
    
                let {txid} = await tronLink.tronWeb.trx.sendRawTransaction(signedTransaction);
    
                return resolve(txid);
            } catch (error) {
                if (error == "Confirmation declined by user") {
                    return reject('request-rejected');
                }

                return reject(error)
            }
        });
    }

    /**
     * @param {String} owner
     * @param {String} spender
     * @returns {Boolean}
     */
    async allowance(owner, spender) {
        let token = await tronLink.tronWeb.contract().at(this.address);
        let allowance = parseFloat((await token.allowance(owner, spender).call()).toString(10));
        return Utils.toDec(allowance, await this.getDecimals());
    }
}

module.exports = Token;