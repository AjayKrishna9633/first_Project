
export const formatNumber = (num, decimals = 1) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    
    const number = Math.abs(num);
    
    if (number >= 1000000000) {
        return (num / 1000000000).toFixed(decimals).replace(/\.0$/, '') + 'B';
    }
    if (number >= 1000000) {
        return (num / 1000000).toFixed(decimals).replace(/\.0$/, '') + 'M';
    }
    if (number >= 1000) {
        return (num / 1000).toFixed(decimals).replace(/\.0$/, '') + 'K';
    }
    
    return num.toString();
};

export const formatCurrency = (amount, currency = '₹', decimals = 1) => {
    return currency + formatNumber(amount, decimals);
};

export const getFullNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return num.toLocaleString();
};