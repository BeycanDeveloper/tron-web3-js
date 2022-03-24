const BigNumber = require('bignumber.js');

class Utils {

    /**
     * @param {Float} amount 
     * @param {Integer} decimals 
     * @returns {String}
     */
    static toHex(amount, decimals) {
        let length = '1' + '0'.repeat(decimals);
        let value = new BigNumber(amount.toString(10), 10).times(length);
        return "0x" + value.toString(16);

    }

    /**
     * @param {Float} amount 
     * @param {Integer} decimals 
     * @returns {Float}
     */
    static toDec(amount, decimals) {
        let length = '1' + '0'.repeat(decimals);
        let value = new BigNumber(amount.toString(10), 10).dividedBy(length);
        return parseFloat(value.toString(10));
    }

    /**
     * @param {String|Number} val
     * @return {Boolean}
     */
    static isNumeric(val) {
        if (typeof val != "string") return true;
        return isNaN(val) && isNaN(parseFloat(val));
    }
}

module.exports = Utils;