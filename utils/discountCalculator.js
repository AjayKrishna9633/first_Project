
export const calculateBestDiscount = (regularPrice, salePrice, category) => {

    regularPrice = Number(regularPrice) || 0;
    salePrice = Number(salePrice) || 0;

   
    const productDiscount = regularPrice - salePrice;
    const productDiscountPercentage = regularPrice > 0 ? ((productDiscount / regularPrice) * 100) : 0;

   
    let categoryDiscount = 0;
    let categoryFinalPrice = regularPrice;

    if (category && category.offerType && category.offerType !== 'none' && category.offerValue > 0) {
        if (category.offerType === 'percentage') {
            categoryDiscount = (regularPrice * category.offerValue) / 100;
            categoryFinalPrice = regularPrice - categoryDiscount;
        } else if (category.offerType === 'flat') {
            categoryDiscount = category.offerValue;
            categoryFinalPrice = regularPrice - categoryDiscount;
        }
    }


    let finalPrice, discountAmount, discountPercentage, appliedOffer, appliedOfferDetails;

    if (categoryFinalPrice < salePrice && categoryFinalPrice > 0) {
        finalPrice = categoryFinalPrice;
        discountAmount = regularPrice - categoryFinalPrice;
        discountPercentage = category.offerType === 'percentage' ? category.offerValue : 
                            (salePrice > 0 ? ((categoryDiscount / salePrice) * 100) : 0);
        appliedOffer = 'category';
        appliedOfferDetails = {
            type: category.offerType,
            value: category.offerValue,
            name: category.name || 'Category Offer'
        };
    } else {
        finalPrice = salePrice;
        discountAmount = productDiscount;
        discountPercentage = productDiscountPercentage;
        appliedOffer = 'product';
        appliedOfferDetails = null;
    }

    finalPrice = Math.max(0, finalPrice);
    discountAmount = Math.max(0, discountAmount);
    discountPercentage = Math.max(0, Math.min(100, discountPercentage));

    return {
        finalPrice: Math.round(finalPrice),
        discountAmount: Math.round(discountAmount),
        discountPercentage: discountPercentage, 
        appliedOffer,
        appliedOfferDetails,
        productDiscount: Math.round(productDiscount),
        categoryDiscount: Math.round(categoryDiscount)
    };
};

export const applyBestDiscountToProduct = (product) => {
    if (!product.variants || product.variants.length === 0) {
        return product;
    }


    product.variants = product.variants.map(variant => {
        const discountInfo = calculateBestDiscount(
            variant.regularPrice,
            variant.salePrice,
            product.category
        );

        return {
            ...variant,
            ...discountInfo
        };
    });

    return product;
};

export default {
    calculateBestDiscount,
    applyBestDiscountToProduct
};
