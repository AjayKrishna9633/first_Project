
export const generateReferralCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
};


export const isValidReferralCodeFormat = (code) => {
    if (!code || typeof code !== 'string') return false;
    const regex = /^[A-Z0-9]{6}$/;
    return regex.test(code.toUpperCase());
};


export const formatReferralCode = (code) => {
    if (!code || code.length !== 6) return code;
    return `${code.slice(0, 3)} ${code.slice(3)}`;
};


export const REFERRAL_REWARDS = {
    REFERRER: 500, 
    REFEREE: 100    
};


export const WALLET_LIMITS = {
    MIN_ADD: 100,      
    MAX_ADD: 50000,    
    MAX_BALANCE: 100000 
};

export default {
    generateReferralCode,
    isValidReferralCodeFormat,
    formatReferralCode,
    REFERRAL_REWARDS,
    WALLET_LIMITS
};
